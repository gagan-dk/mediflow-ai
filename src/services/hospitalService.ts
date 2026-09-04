/**
 * Hospital Service
 * Centralized hospital data management — single source of truth shared by
 * Hospital Staff (writers) and Patient (readers).
 */

import { Hospital, HospitalOperationalData, Doctor, Room, Bed } from '../types/hospital';

const STORAGE_KEY = 'mediflow_hospitals';

/**
 * Normalize a hospital name for matching purposes
 */
export function normalizeHospitalName(name: string): string {
  return name
    .toLowerCase()
    .replace(/hospital/i, '')
    .replace(/medical\s*c(enter|entre)/i, '')
    .replace(/&|\band\b|the|of|in|at/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .replace(/\s+/g, '')
    .trim();
}

/**
 * Match a discovered (map/API) hospital to a MediFlow hospital record.
 *
 * Matching priority (per audit requirements):
 *   1. Provider place ID / stable identifier
 *   2. Coordinate proximity (must be very close)
 *   3. Normalized address similarity
 *
 * We intentionally do NOT match by name alone, because unrelated hospitals
 * can share similar names (e.g., "City Hospital" in different cities).
 * If matching is ambiguous, we do NOT attach operational data.
 */
export function matchHospitalToMediflow(
  discovered: { id?: string; providerPlaceId?: string; name: string; address?: string; lat: number; lng: number },
  mediflowHospitals: Hospital[]
): Hospital | null {
  if (!mediflowHospitals.length) return null;

  // 1. Exact ID or provider place ID match
  const matchId = discovered.id || discovered.providerPlaceId;
  if (matchId) {
    const byId = mediflowHospitals.find(h => h.id === matchId || h.hospitalId === matchId);
    if (byId) return byId;
  }

  // 2. Coordinate proximity match (within ~500m = 0.0045 degrees)
  const RADIUS_MATCH = 0.0045;
  for (const h of mediflowHospitals) {
    const dLat = Math.abs(h.coordinates.lat - discovered.lat);
    const dLng = Math.abs(h.coordinates.lng - discovered.lng);
    if (dLat < RADIUS_MATCH && dLng < RADIUS_MATCH) {
      return h;
    }
  }

  // 3. Normalized address similarity (requires address on both sides)
  if (discovered.address) {
    const normDisc = normalizeAddress(discovered.address);
    for (const h of mediflowHospitals) {
      const normHosp = normalizeAddress(h.address || '');
      if (normDisc && normHosp && (normDisc.includes(normHosp) || normHosp.includes(normDisc))) {
        return h;
      }
    }
  }

  // Ambiguous or no match — do NOT attach operational data.
  return null;
}

/**
 * Normalize an address string for comparison.
 */
function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Create a stable hospitalId from a name + coordinates
 */
export function createHospitalId(name: string, lat: number, lng: number): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
  return `hosp-${slug}-${Math.round(lat * 100)}-${Math.round(lng * 100)}`;
}

/**
 * Reads the canonical list of hospitals from localStorage.
 */
function loadHospitalsFromStorage(): Hospital[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Failed to load hospitals from localStorage:', e);
  }
  return [];
}

/**
 * Persists the canonical list of hospitals to localStorage.
 */
function saveHospitalsToStorage(hospitals: Hospital[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hospitals));
  } catch (e) {
    console.warn('Failed to save hospitals to localStorage:', e);
  }
}

/**
 * Business helper: compute derived operational metrics from a hospital record.
 */
export function computeOperationalStatus(hospital: Hospital): {
  status: 'normal' | 'busy' | 'critical';
  label: string;
  loadPercent: number;
} {
  const load = hospital.queue?.currentERLoadPercent ?? hospital.currentERLoadPercent ?? 0;
  if (load > 85) {
    return { status: 'critical', label: '🔴 Critical / Near Capacity', loadPercent: load };
  }
  if (load >= 60) {
    return { status: 'busy', label: '🟡 Busy', loadPercent: load };
  }
  return { status: 'normal', label: '🟢 Normal', loadPercent: load };
}

class HospitalService {
  /**
   * Get all hospitals (from canonical storage + runtime state fallback).
   */
  getHospitals(): Hospital[] {
    return loadHospitalsFromStorage();
  }

  getHospitalById(hospitalId: string): Hospital | null {
    const all = this.getHospitals();
    return all.find(h => h.hospitalId === hospitalId || h.id === hospitalId) || null;
  }

  /**
   * Merge a map-discovered hospital (real name/address/coordinates/distance)
   * with any STAFF-ENTERED operational data already stored under the same id.
   *
   * - If staff has configured this hospital before, its beds/ICU/rooms/doctors/
   *   queue/facilities are preserved and merged onto the fresh discovery.
   * - If there is no staff data yet, the hospital keeps its location details
   *   and is marked as "operational data not available".
   *
   * This is the single-place merge rule that keeps ONE record per hospital and
   * never lets a re-scan clobber staff edits.
   */
  mergeDiscoveredHospital(discovered: Hospital): Hospital {
    const all = this.getHospitals();
    const existing = all.find(h => h.hospitalId === discovered.hospitalId || h.id === discovered.id);
    const matched = !existing ? matchHospitalToMediflow({
      id: discovered.id,
      name: discovered.name,
      address: discovered.address,
      lat: discovered.coordinates.lat,
      lng: discovered.coordinates.lng,
    }, all) : null;
    const source = existing || matched;

    if (!source || !source.operationalDataAvailable) {
      return {
        ...discovered,
        operationalDataAvailable: source?.operationalDataAvailable ?? false,
        configComplete: false,
        updatedBy: source?.updatedBy || 'system',
        lastUpdated: source?.lastUpdated || discovered.lastUpdated,
      };
    }

    // Keep the staff-authored operational record; overwrite only location data
    return {
      ...source,
      id: discovered.id,
      name: discovered.name,
      type: discovered.type,
      address: discovered.address,
      coordinates: discovered.coordinates,
      distanceKm: discovered.distanceKm,
      travelTimeMinutes: discovered.travelTimeMinutes,
      trafficCondition: discovered.trafficCondition,
      phone: discovered.phone,
      isOpen: discovered.isOpen,
      rating: discovered.rating,
      specialties: discovered.specialties,
    };
  }

  /**
   * Merge a whole discovered list against the stored records.
   */
  mergeDiscoveredHospitals(discovered: Hospital[]): Hospital[] {
    return discovered.map(h => this.mergeDiscoveredHospital(h));
  }

  /**
   * Update (or insert) a hospital's operational data into canonical storage.
   * This is the single write path used by Hospital Staff.
   */
  updateHospital(hospital: Hospital): Hospital {
    const all = loadHospitalsFromStorage();
    const idx = all.findIndex(h => h.hospitalId === hospital.hospitalId || h.id === hospital.id);
    const stamped: Hospital = {
      ...hospital,
      lastUpdated: new Date().toISOString(),
      updatedBy: 'hospital_staff',
      configComplete: true,
    };

    if (idx >= 0) {
      all[idx] = stamped;
    } else {
      all.push(stamped);
    }
    saveHospitalsToStorage(all);

    // Notify other tabs via the storage event mechanism
    window.dispatchEvent(new CustomEvent('mediflow:hospitals-changed', { detail: stamped.hospitalId }));
    return stamped;
  }

  /**
   * Add or replace a doctor for a hospital.
   * Doctor records are stored INSIDE the single hospital record (doctorList),
   * so staff writes are immediately visible to patient readers.
   */
  addDoctor(hospitalId: string, doctor: Doctor): Doctor {
    const hospital = this.getHospitalById(hospitalId);
    const list = hospital?.doctorList ? [...hospital.doctorList] : [];
    const exists = list.findIndex(d => d.id === doctor.id);
    const record: Doctor = {
      ...doctor,
      hospitalId,
      updatedAt: new Date().toISOString(),
      createdAt: exists >= 0 ? list[exists].createdAt : new Date().toISOString(),
    };
    if (exists >= 0) list[exists] = record;
    else list.push(record);
    this.updateHospital({
      ...(hospital as Hospital),
      doctorList: list,
    });
    this.resyncDoctors(hospitalId);
    return record;
  }

  updateDoctor(hospitalId: string, doctorId: string, updates: Partial<Doctor>): Doctor | null {
    const hospital = this.getHospitalById(hospitalId);
    if (!hospital) return null;
    const list = hospital.doctorList || [];
    const idx = list.findIndex(d => d.id === doctorId);
    if (idx < 0) return null;
    list[idx] = { ...list[idx], ...updates, hospitalId, updatedAt: new Date().toISOString() };
    this.updateHospital({ ...hospital, doctorList: list });
    this.resyncDoctors(hospitalId);
    return list[idx];
  }

  removeDoctor(hospitalId: string, doctorId: string): void {
    const hospital = this.getHospitalById(hospitalId);
    if (!hospital) return;
    const list = (hospital.doctorList || []).filter(d => d.id !== doctorId);
    this.updateHospital({ ...hospital, doctorList: list });
    this.resyncDoctors(hospitalId);
  }

  getDoctors(hospitalId: string): Doctor[] {
    const hospital = this.getHospitalById(hospitalId);
    return hospital?.doctorList || [];
  }

  addRoom(hospitalId: string, room: Room): Room {
    const hospital = this.getHospitalById(hospitalId);
    const list = hospital?.roomsList ? [...hospital.roomsList] : [];
    const record: Room = { ...room, hospitalId, lastUpdated: new Date().toISOString() };
    list.push(record);
    this.updateHospital({ ...(hospital as Hospital), roomsList: list });
    this.resyncRooms(hospitalId);
    return record;
  }

  updateRoom(hospitalId: string, roomId: string, updates: Partial<Room>): Room | null {
    const hospital = this.getHospitalById(hospitalId);
    if (!hospital) return null;
    const list = hospital.roomsList || [];
    const idx = list.findIndex(r => r.id === roomId);
    if (idx < 0) return null;
    list[idx] = { ...list[idx], ...updates, hospitalId, lastUpdated: new Date().toISOString() };
    this.updateHospital({ ...hospital, roomsList: list });
    this.resyncRooms(hospitalId);
    return list[idx];
  }

  removeRoom(hospitalId: string, roomId: string): void {
    const hospital = this.getHospitalById(hospitalId);
    if (!hospital) return;
    const list = (hospital.roomsList || []).filter(r => r.id !== roomId);
    this.updateHospital({ ...hospital, roomsList: list });
    this.resyncRooms(hospitalId);
  }

  getRooms(hospitalId: string): Room[] {
    const hospital = this.getHospitalById(hospitalId);
    return hospital?.roomsList || [];
  }

  getBeds(hospitalId: string): Bed[] {
    const hospital = this.getHospitalById(hospitalId);
    if (!hospital) return [];
    if (hospital.bedList && hospital.bedList.length > 0) {
      return hospital.bedList;
    }
    return [];
  }

  updateSingleBed(hospitalId: string, bedId: string, updates: Partial<Bed>): Bed | null {
    const hospital = this.getHospitalById(hospitalId);
    if (!hospital) return null;
    let list = hospital.bedList && hospital.bedList.length > 0 ? [...hospital.bedList] : [];
    const idx = list.findIndex(b => b.id === bedId);
    if (idx < 0) return null;

    const updatedBed: Bed = {
      ...list[idx],
      ...updates,
      hospitalId,
      updatedAt: new Date().toISOString()
    };
    list[idx] = updatedBed;

    // Recalculate accurate metrics reflecting ONLY the updated beds
    const totalBeds = list.length;
    const availableBeds = list.filter(b => b.status === 'Available').length;
    const occupiedBeds = list.filter(b => b.status === 'Occupied').length;
    const reservedBeds = list.filter(b => b.status === 'Reserved').length;

    const icuBeds = list.filter(b => b.wardType === 'ICU');
    const totalICU = icuBeds.length;
    const availableICU = icuBeds.filter(b => b.status === 'Available').length;
    const occupiedICU = icuBeds.filter(b => b.status === 'Occupied').length;

    const erBeds = list.filter(b => b.wardType === 'Emergency');
    const totalER = erBeds.length;
    const availableER = erBeds.filter(b => b.status === 'Available').length;
    const occupiedER = erBeds.filter(b => b.status === 'Occupied').length;

    const updatedHospital: Hospital = {
      ...hospital,
      bedList: list,
      beds: {
        total: totalBeds,
        available: availableBeds,
        occupied: occupiedBeds,
        reserved: reservedBeds
      },
      availableBeds,
      totalBeds,
      icu: {
        total: totalICU || hospital.icu.total,
        available: availableICU,
        occupied: occupiedICU,
        reserved: 0
      },
      availableICUBeds: availableICU,
      icuAvailable: availableICU > 0,
      emergencyRooms: {
        total: totalER || hospital.emergencyRooms.total,
        available: availableER,
        occupied: occupiedER,
        cleaning: 0
      },
      availableEmergencyBeds: availableER
    };

    this.updateHospital(updatedHospital);
    return updatedBed;
  }

  updateBeds(hospitalId: string, beds: Bed[]): void {
    const hospital = this.getHospitalById(hospitalId);
    if (!hospital) return;
    this.updateHospital({ ...hospital, bedList: beds });
  }

  updateICU(hospitalId: string, data: Partial<HospitalOperationalData['icu']>): void {
    const hospital = this.getHospitalById(hospitalId);
    if (!hospital) return;
    const icu = { ...hospital.icu, ...data };
    this.updateHospital({
      ...hospital,
      icu,
      icuAvailable: icu.available > 0,
      totalICUBeds: icu.total,
      availableICUBeds: icu.available,
    });
  }

  updateBedsMetrics(hospitalId: string, data: Partial<HospitalOperationalData['beds']>): void {
    const hospital = this.getHospitalById(hospitalId);
    if (!hospital) return;
    const beds = { ...hospital.beds, ...data };
    this.updateHospital({
      ...hospital,
      beds,
      totalBeds: beds.total,
      availableBeds: beds.available,
    });
  }

  updateEmergencyRooms(hospitalId: string, data: Partial<HospitalOperationalData['emergencyRooms']>): void {
    const hospital = this.getHospitalById(hospitalId);
    if (!hospital) return;
    const emergencyRooms = { ...hospital.emergencyRooms, ...data };
    this.updateHospital({
      ...hospital,
      emergencyRooms,
      totalEmergencyBeds: emergencyRooms.total,
      availableEmergencyBeds: emergencyRooms.available,
    });
  }

  updateQueue(hospitalId: string, data: Partial<HospitalOperationalData['queue']>): void {
    const hospital = this.getHospitalById(hospitalId);
    if (!hospital) return;
    const queue = { ...hospital.queue, ...data };
    this.updateHospital({
      ...hospital,
      queue,
      currentERLoadPercent: queue.currentERLoadPercent,
      estimatedWaitTimeMinutes: queue.estimatedWaitTimeMinutes,
    });
  }

  updateDoctors(hospitalId: string, data: Partial<HospitalOperationalData['doctors']>): void {
    const hospital = this.getHospitalById(hospitalId);
    if (!hospital) return;
    this.updateHospital({
      ...hospital,
      doctors: { ...hospital.doctors, ...data },
    });
  }

  updateAmbulances(hospitalId: string, data: Partial<HospitalOperationalData['ambulances']>): void {
    const hospital = this.getHospitalById(hospitalId);
    if (!hospital) return;
    const ambulances = { ...hospital.ambulances, ...data };
    this.updateHospital({
      ...hospital,
      ambulances,
      ambulanceAvailableCount: ambulances.available,
    });
  }

  updateCapabilities(hospitalId: string, data: Partial<HospitalOperationalData['facilities']>): void {
    const hospital = this.getHospitalById(hospitalId);
    if (!hospital) return;
    const facilities = { ...hospital.facilities, ...data };
    this.updateHospital({
      ...hospital,
      facilities,
      emergencyAvailable: facilities.emergencyDepartment,
      icuAvailable: facilities.icu && hospital.icu.available > 0,
      oxygenSupport: facilities.oxygenSupport,
      ventilatorAvailability: facilities.ventilator,
      cardiacCareAvailable: facilities.cardiacCare,
      strokeUnitAvailable: facilities.strokeUnit,
      orthopedicAvailable: facilities.orthopedicSurgeon,
      pediatricAvailable: facilities.pediatricEmergency,
    });
  }

  /**
   * Recompute doctor count summaries from the doctor records inside the
   * hospital record (single source of truth).
   */
  resyncDoctors(hospitalId: string): void {
    const hospital = this.getHospitalById(hospitalId);
    if (!hospital) return;
    const doctors = hospital.doctorList || [];
    const available = doctors.filter(d => d.status === 'Available').length;
    const onDuty = doctors.filter(d => d.dutyStatus === 'On Duty').length;
    const bySpecialization: Record<string, { total: number; available: number }> = {};
    for (const d of doctors) {
      const spec = d.specialization || 'General';
      if (!bySpecialization[spec]) bySpecialization[spec] = { total: 0, available: 0 };
      bySpecialization[spec].total += 1;
      if (d.status === 'Available') bySpecialization[spec].available += 1;
    }
    this.updateHospital({
      ...hospital,
      doctors: { total: doctors.length, available, onDuty, bySpecialization },
    });
  }

  /**
   * Recompute room / emergency-room metrics from the room records inside the
   * hospital record (single source of truth).
   */
  resyncRooms(hospitalId: string): void {
    const hospital = this.getHospitalById(hospitalId);
    if (!hospital) return;
    const rooms = hospital.roomsList || [];
    const emergencyRooms = rooms.filter(r => r.type === 'Emergency Room');
    const emergencyRoomTotal = Math.max(emergencyRooms.length, hospital.emergencyRooms?.total || 0);
    const emergencyRoomAvailable = emergencyRooms.filter(r => r.status === 'Available').length;
    const beds = rooms.filter(r => r.type === 'General Ward' || r.type === 'ICU');
    const bedTotal = Math.max(beds.length, hospital.beds?.total || 0);
    const bedAvailable = beds.filter(r => r.status === 'Available').length;

    this.updateHospital({
      ...hospital,
      emergencyRooms: {
        ...hospital.emergencyRooms,
        total: emergencyRoomTotal,
        available: emergencyRoomAvailable,
        occupied: emergencyRoomTotal - emergencyRoomAvailable,
      },
      beds: {
        ...hospital.beds,
        total: bedTotal,
        available: bedAvailable,
      },
      totalEmergencyBeds: emergencyRoomTotal,
      availableEmergencyBeds: emergencyRoomAvailable,
      availableBeds: bedAvailable,
    });
  }

  /**
   * Touch the lastUpdated of a hospital (used when sub-resources change).
   */
  private touchHospital(hospitalId: string): void {
    const hospital = this.getHospitalById(hospitalId);
    if (!hospital) return;
    this.updateHospital({ ...hospital });
  }
}

export const hospitalService = new HospitalService();