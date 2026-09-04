/**
 * Hospital Service
 * Centralized hospital data management with backend API integration.
 * 
 * BACKEND MIGRATION PHASE:
 * - API-based operations use `src/services/api/` modules
 * - localStorage fallback preserved for backward compatibility during migration
 * - Map discovery hospitals are matched against backend operational records
 */

import { Hospital, HospitalOperationalData, Doctor, Room, Bed } from '../types/hospital';
import { getHospitals as getHospitalsApi, getHospitalById as getHospitalByIdApi, updateHospital as updateHospitalApi } from './api/hospitalApi';
import { createDoctor, updateDoctor as updateDoctorApi, deleteDoctor as deleteDoctorApi } from './api/doctorApi';
import { createRoom, updateRoom as updateRoomApi, deleteRoom as deleteRoomApi } from './api/roomApi';
import { updateHospitalBeds as updateHospitalBedsApi, updateHospitalICU as updateHospitalICUApi, updateHospitalEmergencyRooms as updateHospitalEmergencyRoomsApi, updateHospitalQueue as updateHospitalQueueApi, updateHospitalAmbulances as updateHospitalAmbulancesApi, updateHospitalCapabilities as updateHospitalCapabilitiesApi } from './api/hospitalApi';

const STORAGE_KEY = 'mediflow_hospitals';

export function normalizeHospitalName(name: string): string {
  return name.toLowerCase().replace(/hospital/i, '').replace(/medical\s*c(enter|entre)/i, '').replace(/&|\band\b|the|of|in|at/gi, '').replace(/[^a-z0-9]/g, '').replace(/\s+/g, '').trim();
}

export function matchHospitalToMediflow(
  discovered: { id?: string; providerPlaceId?: string; name: string; address?: string; lat: number; lng: number },
  mediflowHospitals: Hospital[]
): Hospital | null {
  if (!mediflowHospitals.length) return null;
  const matchId = discovered.id || discovered.providerPlaceId;
  if (matchId) {
    const byId = mediflowHospitals.find(h => h.id === matchId || h.hospitalId === matchId);
    if (byId) return byId;
  }
  const RADIUS_MATCH = 0.0045;
  for (const h of mediflowHospitals) {
    const dLat = Math.abs(h.coordinates.lat - discovered.lat);
    const dLng = Math.abs(h.coordinates.lng - discovered.lng);
    if (dLat < RADIUS_MATCH && dLng < RADIUS_MATCH) return h;
  }
  if (discovered.address) {
    const normDisc = normalizeAddress(discovered.address);
    for (const h of mediflowHospitals) {
      const normHosp = normalizeAddress(h.address || '');
      if (normDisc && normHosp && (normDisc.includes(normHosp) || normHosp.includes(normDisc))) return h;
    }
  }
  return null;
}

function normalizeAddress(address: string): string {
  return address.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

export function createHospitalId(name: string, lat: number, lng: number): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
  return `hosp-${slug}-${Math.round(lat * 100)}-${Math.round(lng * 100)}`;
}

function loadHospitalsFromStorage(): Hospital[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) { console.warn('Failed to load hospitals from localStorage:', e); }
  return [];
}

function saveHospitalsToStorage(hospitals: Hospital[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(hospitals)); } catch (e) { console.warn('Failed to save hospitals to localStorage:', e); }
}

export function computeOperationalStatus(hospital: Hospital): { status: 'normal' | 'busy' | 'critical'; label: string; loadPercent: number; } {
  const load = hospital.queue?.currentERLoadPercent ?? hospital.currentERLoadPercent ?? 0;
  if (load > 85) return { status: 'critical', label: '🔴 Critical / Near Capacity', loadPercent: load };
  if (load >= 60) return { status: 'busy', label: '🟡 Busy', loadPercent: load };
  return { status: 'normal', label: '🟢 Normal', loadPercent: load };
}

class HospitalService {
  async getHospitals(lat?: number, lng?: number): Promise<Hospital[]> {
    try {
      const result = await getHospitalsApi({ lat, lng, radius: 30000 });
      return result.hospitals;
    } catch (error) {
      console.warn('[HospitalService] API fetch failed, using localStorage:', error);
      return loadHospitalsFromStorage();
    }
  }

  async getHospitalById(hospitalId: string): Promise<Hospital | null> {
    try {
      const result = await getHospitalByIdApi(hospitalId);
      return result.hospital;
    } catch (error) {
      console.warn('[HospitalService] API fetch by ID failed, using localStorage:', error);
      const all = loadHospitalsFromStorage();
      return all.find(h => h.hospitalId === hospitalId || h.id === hospitalId) || null;
    }
  }

  getHospitalsSync(): Hospital[] { return loadHospitalsFromStorage(); }
  getHospitalByIdSync(hospitalId: string): Hospital | null {
    const all = loadHospitalsFromStorage();
    return all.find(h => h.hospitalId === hospitalId || h.id === hospitalId) || null;
  }

  async syncAllHospitalsFromBackend(lat?: number, lng?: number): Promise<Hospital[]> {
    const backendHospitals = await this.getHospitals(lat, lng);
    if (backendHospitals.length > 0) {
      saveHospitalsToStorage(backendHospitals);
      window.dispatchEvent(new CustomEvent('mediflow:hospitals-changed'));
    }
    return backendHospitals;
  }

  async mergeDiscoveredHospitals(discovered: Hospital[]): Promise<Hospital[]> {
    const existing = loadHospitalsFromStorage();
    const merged: Hospital[] = [...existing];
    for (const nh of discovered) {
      const existingIdx = merged.findIndex(h =>
        h.id === nh.id ||
        h.hospitalId === nh.hospitalId ||
        (Math.abs(h.coordinates.lat - nh.coordinates.lat) < 0.003 &&
          Math.abs(h.coordinates.lng - nh.coordinates.lng) < 0.003)
      );
      if (existingIdx >= 0) {
        merged[existingIdx] = { ...merged[existingIdx], ...nh };
      } else {
        merged.unshift(nh);
      }
    }
    saveHospitalsToStorage(merged);
    window.dispatchEvent(new CustomEvent('mediflow:hospitals-changed', { detail: 'merge' }));
    return merged;
  }

  async updateHospital(hospital: Hospital): Promise<Hospital> {
    const stamped: Hospital = { ...hospital, lastUpdated: new Date().toISOString(), updatedBy: 'hospital_staff', configComplete: true };
    try {
      const result = await updateHospitalApi(hospital.id, stamped, '');
      const all = loadHospitalsFromStorage();
      const idx = all.findIndex(h => h.hospitalId === hospital.hospitalId || h.id === hospital.id);
      if (idx >= 0) all[idx] = result.hospital; else all.push(result.hospital);
      saveHospitalsToStorage(all);
      window.dispatchEvent(new CustomEvent('mediflow:hospitals-changed', { detail: hospital.id }));
      return result.hospital;
    } catch (error) {
      console.warn('[HospitalService] API update failed, using localStorage fallback:', error);
      this.updateHospitalSync(stamped);
      return stamped;
    }
  }

  updateHospitalSync(hospital: Hospital): Hospital {
    const all = loadHospitalsFromStorage();
    const idx = all.findIndex(h => h.hospitalId === hospital.hospitalId || h.id === hospital.id);
    if (idx >= 0) all[idx] = hospital; else all.push(hospital);
    saveHospitalsToStorage(all);
    window.dispatchEvent(new CustomEvent('mediflow:hospitals-changed', { detail: hospital.id }));
    return hospital;
  }

  async addDoctor(hospitalId: string, doctor: Doctor): Promise<Doctor> {
    const hospital = this.getHospitalByIdSync(hospitalId);
    const list = hospital?.doctorList ? [...hospital.doctorList] : [];
    const exists = list.findIndex(d => d.id === doctor.id);
    const record: Doctor = { ...doctor, hospitalId, updatedAt: new Date().toISOString(), createdAt: exists >= 0 ? list[exists].createdAt : new Date().toISOString() };
    if (exists >= 0) list[exists] = record; else list.push(record);
    try {
      await createDoctor(record, '');
      await this.updateHospital({ ...(hospital as Hospital), doctorList: list });
    } catch (error) {
      this.updateHospitalSync({ ...(hospital as Hospital), doctorList: list });
    }
    this.resyncDoctors(hospitalId);
    return record;
  }

  async updateDoctor(hospitalId: string, doctorId: string, updates: Partial<Doctor>): Promise<Doctor | null> {
    const hospital = this.getHospitalByIdSync(hospitalId);
    if (!hospital) return null;
    const list = hospital.doctorList || [];
    const idx = list.findIndex(d => d.id === doctorId);
    if (idx < 0) return null;
    list[idx] = { ...list[idx], ...updates, hospitalId, updatedAt: new Date().toISOString() };
    try {
      await updateDoctorApi(hospitalId, doctorId, updates, '');
      await this.updateHospital({ ...hospital, doctorList: list });
    } catch (error) {
      this.updateHospitalSync({ ...hospital, doctorList: list });
    }
    this.resyncDoctors(hospitalId);
    return list[idx];
  }

  async removeDoctor(hospitalId: string, doctorId: string): Promise<void> {
    const hospital = this.getHospitalByIdSync(hospitalId);
    if (!hospital) return;
    const list = (hospital.doctorList || []).filter(d => d.id !== doctorId);
    try {
      await deleteDoctorApi(hospitalId, doctorId, '');
      await this.updateHospital({ ...hospital, doctorList: list });
    } catch (error) {
      this.updateHospitalSync({ ...hospital, doctorList: list });
    }
    this.resyncDoctors(hospitalId);
  }

  getDoctors(hospitalId: string): Doctor[] { return this.getHospitalByIdSync(hospitalId)?.doctorList || []; }

  async addRoom(hospitalId: string, room: Room): Promise<Room> {
    const hospital = this.getHospitalByIdSync(hospitalId);
    const list = hospital?.roomsList ? [...hospital.roomsList] : [];
    const record: Room = { ...room, hospitalId, lastUpdated: new Date().toISOString() };
    list.push(record);
    try {
      await createRoom(record, '');
      await this.updateHospital({ ...(hospital as Hospital), roomsList: list });
    } catch (error) {
      this.updateHospitalSync({ ...(hospital as Hospital), roomsList: list });
    }
    this.resyncRooms(hospitalId);
    return record;
  }

  async updateRoom(hospitalId: string, roomId: string, updates: Partial<Room>): Promise<Room | null> {
    const hospital = this.getHospitalByIdSync(hospitalId);
    if (!hospital) return null;
    const list = hospital.roomsList || [];
    const idx = list.findIndex(r => r.id === roomId);
    if (idx < 0) return null;
    list[idx] = { ...list[idx], ...updates, hospitalId, lastUpdated: new Date().toISOString() };
    try {
      await updateRoomApi(hospitalId, roomId, updates, '');
      await this.updateHospital({ ...hospital, roomsList: list });
    } catch (error) {
      this.updateHospitalSync({ ...hospital, roomsList: list });
    }
    this.resyncRooms(hospitalId);
    return list[idx];
  }

  async removeRoom(hospitalId: string, roomId: string): Promise<void> {
    const hospital = this.getHospitalByIdSync(hospitalId);
    if (!hospital) return;
    const list = (hospital.roomsList || []).filter(r => r.id !== roomId);
    try {
      await deleteRoomApi(hospitalId, roomId, '');
      await this.updateHospital({ ...hospital, roomsList: list });
    } catch (error) {
      this.updateHospitalSync({ ...hospital, roomsList: list });
    }
    this.resyncRooms(hospitalId);
  }

  getRooms(hospitalId: string): Room[] { return this.getHospitalByIdSync(hospitalId)?.roomsList || []; }
  
  async updateHospitalBeds(hospitalId: string, data: Partial<HospitalOperationalData['beds']>): Promise<void> {
    const hospital = this.getHospitalByIdSync(hospitalId);
    if (!hospital) return;
    const beds = { ...hospital.beds, ...data };
    try {
      await updateHospitalBedsApi(hospitalId, beds, '');
      this.updateHospitalSync({ ...hospital, beds, totalBeds: beds.total, availableBeds: beds.available });
    } catch (e) { this.updateHospitalSync({ ...hospital, beds, totalBeds: beds.total, availableBeds: beds.available }); }
  }

  async updateHospitalICU(hospitalId: string, data: Partial<HospitalOperationalData['icu']>): Promise<void> {
    const hospital = this.getHospitalByIdSync(hospitalId);
    if (!hospital) return;
    const icu = { ...hospital.icu, ...data };
    try {
      await updateHospitalICUApi(hospitalId, icu, '');
      this.updateHospitalSync({ ...hospital, icu, icuAvailable: icu.available > 0, totalICUBeds: icu.total, availableICUBeds: icu.available });
    } catch (e) { this.updateHospitalSync({ ...hospital, icu, icuAvailable: icu.available > 0, totalICUBeds: icu.total, availableICUBeds: icu.available }); }
  }

  async updateHospitalEmergencyRooms(hospitalId: string, data: Partial<HospitalOperationalData['emergencyRooms']>): Promise<void> {
    const hospital = this.getHospitalByIdSync(hospitalId);
    if (!hospital) return;
    const emergencyRooms = { ...hospital.emergencyRooms, ...data };
    try {
      await updateHospitalEmergencyRoomsApi(hospitalId, emergencyRooms, '');
      this.updateHospitalSync({ ...hospital, emergencyRooms, totalEmergencyBeds: emergencyRooms.total, availableEmergencyBeds: emergencyRooms.available });
    } catch (e) { this.updateHospitalSync({ ...hospital, emergencyRooms, totalEmergencyBeds: emergencyRooms.total, availableEmergencyBeds: emergencyRooms.available }); }
  }

  async updateHospitalQueue(hospitalId: string, data: Partial<HospitalOperationalData['queue']>): Promise<void> {
    const hospital = this.getHospitalByIdSync(hospitalId);
    if (!hospital) return;
    const queue = { ...hospital.queue, ...data };
    try {
      await updateHospitalQueueApi(hospitalId, queue, '');
      this.updateHospitalSync({ ...hospital, queue, currentERLoadPercent: queue.currentERLoadPercent, estimatedWaitTimeMinutes: queue.estimatedWaitTimeMinutes });
    } catch (e) { this.updateHospitalSync({ ...hospital, queue, currentERLoadPercent: queue.currentERLoadPercent, estimatedWaitTimeMinutes: queue.estimatedWaitTimeMinutes }); }
  }

  async updateHospitalAmbulances(hospitalId: string, data: Partial<HospitalOperationalData['ambulances']>): Promise<void> {
    const hospital = this.getHospitalByIdSync(hospitalId);
    if (!hospital) return;
    const ambulances = { ...hospital.ambulances, ...data };
    try {
      await updateHospitalAmbulancesApi(hospitalId, ambulances, '');
      this.updateHospitalSync({ ...hospital, ambulances, ambulanceAvailableCount: ambulances.available });
    } catch (e) { this.updateHospitalSync({ ...hospital, ambulances, ambulanceAvailableCount: ambulances.available }); }
  }

  async updateHospitalCapabilities(hospitalId: string, data: Partial<HospitalOperationalData['facilities']>): Promise<void> {
    const hospital = this.getHospitalByIdSync(hospitalId);
    if (!hospital) return;
    const facilities = { ...hospital.facilities, ...data };
    try {
      await updateHospitalCapabilitiesApi(hospitalId, facilities, '');
      this.updateHospitalSync({ ...hospital, facilities, emergencyAvailable: facilities.emergencyDepartment, icuAvailable: facilities.icu && hospital.icu.available > 0, oxygenSupport: facilities.oxygenSupport, ventilatorAvailability: facilities.ventilator, cardiacCareAvailable: facilities.cardiacCare, strokeUnitAvailable: facilities.strokeUnit, orthopedicAvailable: facilities.orthopedicSurgeon, pediatricAvailable: facilities.pediatricEmergency });
    } catch (e) { this.updateHospitalSync({ ...hospital, facilities, emergencyAvailable: facilities.emergencyDepartment, icuAvailable: facilities.icu && hospital.icu.available > 0, oxygenSupport: facilities.oxygenSupport, ventilatorAvailability: facilities.ventilator, cardiacCareAvailable: facilities.cardiacCare, strokeUnitAvailable: facilities.strokeUnit, orthopedicAvailable: facilities.orthopedicSurgeon, pediatricAvailable: facilities.pediatricEmergency }); }
  }

  resyncDoctors(hospitalId: string): void {
    const hospital = this.getHospitalByIdSync(hospitalId);
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
    this.updateHospitalSync({ ...hospital, doctors: { total: doctors.length, available, onDuty, bySpecialization } });
  }

  resyncRooms(hospitalId: string): void {
    const hospital = this.getHospitalByIdSync(hospitalId);
    if (!hospital) return;
    const rooms = hospital.roomsList || [];
    const emergencyRooms = rooms.filter(r => r.type === 'Emergency Room');
    const emergencyRoomTotal = Math.max(emergencyRooms.length, hospital.emergencyRooms?.total || 0);
    const emergencyRoomAvailable = emergencyRooms.filter(r => r.status === 'Available').length;
    const beds = rooms.filter(r => r.type === 'General Ward' || r.type === 'ICU');
    const bedTotal = Math.max(beds.length, hospital.beds?.total || 0);
    const bedAvailable = beds.filter(r => r.status === 'Available').length;

    this.updateHospitalSync({
      ...hospital,
      emergencyRooms: { ...hospital.emergencyRooms, total: emergencyRoomTotal, available: emergencyRoomAvailable, occupied: emergencyRoomTotal - emergencyRoomAvailable },
      beds: { ...hospital.beds, total: bedTotal, available: bedAvailable },
      totalEmergencyBeds: emergencyRoomTotal,
      availableEmergencyBeds: emergencyRoomAvailable,
      availableBeds: bedAvailable,
    });
  }
}
export const hospitalService = new HospitalService();
