/**
 * useStaffHospital Hook
 * Manages hospital staff operations with proper backend integration.
 * Enforces staff authorization through backend - no client-side bypass.
 */

import { useState, useEffect, useCallback } from 'react';
import { staffApi, MyHospitalResponse } from '../services/api/staffApi';
import { Hospital, Doctor, Room, Bed } from '../types/hospital';
import { hospitalService } from '../services/hospitalService';

interface UseStaffHospitalReturn {
  hospital: Hospital | null;
  operations: any | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
  
  refreshHospital: () => Promise<void>;
  updateHospitalProfile: (data: any) => Promise<boolean>;
  updateOperations: (data: any) => Promise<boolean>;
  
  doctors: Doctor[];
  addDoctor: (doctor: any) => Promise<boolean>;
  updateDoctor: (doctorId: string, updates: any) => Promise<boolean>;
  removeDoctor: (doctorId: string) => Promise<boolean>;
  
  rooms: Room[];
  addRoom: (room: any) => Promise<boolean>;
  updateRoom: (roomId: string, updates: any) => Promise<boolean>;
  removeRoom: (roomId: string) => Promise<boolean>;
}

export function useStaffHospital(token: string | null): UseStaffHospitalReturn {
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [operations, setOperations] = useState<any | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refreshHospital = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response: MyHospitalResponse = await staffApi.getMyHospital(token);
      
      setHospital(transformHospital(response.hospital));
      setOperations(response.operations || null);
      setDoctors(transformDoctors(response.hospital.doctors || []));
      setRooms(transformRooms(response.hospital.rooms || []));
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to load hospital data';
      setError(errorMsg);
      console.error('[useStaffHospital] Load error:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refreshHospital();
  }, [refreshHospital]);

   const updateHospitalProfile = async (data: any): Promise<boolean> => {
     if (!token || !hospital) return false;

     setSaving(true);
     setError(null);

     try {
       const response = await staffApi.updateMyHospital(data, token);
       const transformed = transformHospital(response.hospital);
       setHospital(transformed);
       await hospitalService.updateHospital(transformed);
       return true;
     } catch (err: any) {
       setError(err?.message || 'Failed to update hospital');
       return false;
     } finally {
       setSaving(false);
     }
   };

  const updateOperations = async (data: any): Promise<boolean> => {
    if (!token || !hospital) return false;

    setSaving(true);
    setError(null);

    try {
      const response = await staffApi.updateOperations(data, token);
      setOperations(response);
      return true;
    } catch (err: any) {
      setError(err?.message || 'Failed to update operations');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const addDoctor = async (doctorData: any): Promise<boolean> => {
    if (!token || !hospital) return false;

    setSaving(true);
    setError(null);

    try {
      const response = await staffApi.createDoctor({
        name: doctorData.name,
        specialty: doctorData.specialization || doctorData.specialty,
        registration_number: doctorData.registration_number,
        phone: doctorData.phone,
        email: doctorData.email,
        status: doctorData.status || 'AVAILABLE',
      }, token);

      const newDoctor = transformDoctor(response);
      setDoctors(prev => [...prev, newDoctor]);
      return true;
    } catch (err: any) {
      setError(err?.message || 'Failed to add doctor');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const updateDoctor = async (doctorId: string, updates: any): Promise<boolean> => {
    if (!token || !hospital) return false;

    setSaving(true);
    setError(null);

    try {
      const response = await staffApi.updateDoctor(doctorId, {
        name: updates.name,
        specialty: updates.specialization || updates.specialty,
        registration_number: updates.registration_number,
        phone: updates.phone,
        email: updates.email,
        status: updates.status,
      }, token);

      const updatedDoctor = transformDoctor(response);
      setDoctors(prev => prev.map(d => d.id === doctorId ? updatedDoctor : d));
      return true;
    } catch (err: any) {
      setError(err?.message || 'Failed to update doctor');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const removeDoctor = async (doctorId: string): Promise<boolean> => {
    if (!token || !hospital) return false;

    setSaving(true);
    setError(null);

    try {
      await staffApi.deleteDoctor(doctorId, token);
      setDoctors(prev => prev.filter(d => d.id !== doctorId));
      return true;
    } catch (err: any) {
      setError(err?.message || 'Failed to remove doctor');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const addRoom = async (roomData: any): Promise<boolean> => {
    if (!token || !hospital) return false;

    setSaving(true);
    setError(null);

    try {
      const response = await staffApi.createRoom({
        room_number: roomData.roomNumber,
        room_type: roomData.type || roomData.room_type,
        floor: roomData.floor,
        status: roomData.status || 'AVAILABLE',
      }, token);

      const newRoom = transformRoom(response);
      setRooms(prev => [...prev, newRoom]);
      return true;
    } catch (err: any) {
      setError(err?.message || 'Failed to add room');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const updateRoom = async (roomId: string, updates: any): Promise<boolean> => {
    if (!token || !hospital) return false;

    setSaving(true);
    setError(null);

    try {
      const response = await staffApi.updateRoom(roomId, {
        room_number: updates.roomNumber,
        room_type: updates.type || updates.room_type,
        floor: updates.floor,
        status: updates.status,
      }, token);

      const updatedRoom = transformRoom(response);
      setRooms(prev => prev.map(r => r.id === roomId ? updatedRoom : r));
      return true;
    } catch (err: any) {
      setError(err?.message || 'Failed to update room');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const removeRoom = async (roomId: string): Promise<boolean> => {
    if (!token || !hospital) return false;

    setSaving(true);
    setError(null);

    try {
      await staffApi.deleteRoom(roomId, token);
      setRooms(prev => prev.filter(r => r.id !== roomId));
      return true;
    } catch (err: any) {
      setError(err?.message || 'Failed to remove room');
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    hospital,
    operations,
    loading,
    error,
    saving,
    refreshHospital,
    updateHospitalProfile,
    updateOperations,
    doctors,
    addDoctor,
    updateDoctor,
    removeDoctor,
    rooms,
    addRoom,
    updateRoom,
    removeRoom,
  };
}

function transformHospital(backendHospital: any): Hospital {
  const now = new Date().toISOString();
  return {
    id: backendHospital.id,
    hospitalId: backendHospital.id,
    name: backendHospital.name || '',
    type: 'General Hospital',
    address: backendHospital.address || '',
    coordinates: {
      lat: backendHospital.latitude || 0,
      lng: backendHospital.longitude || 0,
    },
    distanceKm: 0,
    travelTimeMinutes: 0,
    trafficCondition: 'Moderate',
    totalBeds: backendHospital.total_beds || 0,
    availableBeds: backendHospital.available_beds || 0,
    totalICUBeds: backendHospital.total_icu_beds || 0,
    availableICUBeds: backendHospital.available_icu_beds || 0,
    totalEmergencyBeds: backendHospital.total_emergency_beds || 0,
    availableEmergencyBeds: backendHospital.available_emergency_beds || 0,
    estimatedWaitTimeMinutes: backendHospital.estimated_wait_minutes || 0,
    currentERLoadPercent: backendHospital.current_er_load || 0,
    ambulanceAvailableCount: backendHospital.available_ambulances || 0,
    emergencyAvailable: backendHospital.emergency_available || false,
    icuAvailable: backendHospital.icu_available || false,
    phone: backendHospital.phone || '',
    isOpen: true,
    rating: 0,
    specialties: [],
    oxygenSupport: false,
    ventilatorAvailability: false,
    traumaLevel: 0,
    cardiacCareAvailable: false,
    strokeUnitAvailable: false,
    orthopedicAvailable: false,
    pediatricAvailable: false,
    doctorList: transformDoctors(backendHospital.doctors || []),
    roomsList: transformRooms(backendHospital.rooms || []),
    bedList: backendHospital.beds ? backendHospital.beds.map((b: any) => transformBed(b)) : undefined,
    beds: backendHospital.beds || { total: 0, available: 0, occupied: 0, reserved: 0 },
    icu: backendHospital.icu || { total: 0, available: 0, occupied: 0, reserved: 0 },
    emergencyRooms: backendHospital.emergency_rooms || { total: 0, available: 0, occupied: 0, cleaning: 0 },
    ambulances: backendHospital.ambulances || { total: 0, available: 0, dispatched: 0, enRoute: 0, atHospital: 0 },
    queue: backendHospital.queue || { totalPatients: 0, criticalCount: 0, highCount: 0, moderateCount: 0, lowCount: 0, estimatedWaitTimeMinutes: 0, currentERLoadPercent: 0 },
    doctors: { total: 0, available: 0, onDuty: 0, bySpecialization: {} },
    facilities: backendHospital.facilities || {
      emergencyDepartment: false,
      icu: false,
      oxygenSupport: false,
      ventilator: false,
      traumaCare: false,
      cardiacCare: false,
      strokeUnit: false,
      orthopedicSurgeon: false,
      pediatricEmergency: false,
    },
    operationalDataAvailable: true,
    lastUpdated: backendHospital.updated_at || now,
    updatedBy: 'hospital_staff',
    configComplete: true,
  } as Hospital;
}

function transformBed(b: any): Bed {
  return {
    id: b.id,
    hospitalId: b.hospital_id,
    bedNumber: b.bed_number,
    wardType: b.ward_type as any,
    status: b.status as any,
    patientId: b.patient_id,
    patientName: b.patient_name,
    severity: b.severity as any,
    assignedDoctor: b.assigned_doctor,
    updatedAt: b.updated_at || new Date().toISOString(),
  };
}

function transformDoctor(d: any): Doctor {
  return {
    id: d.id,
    hospitalId: d.hospital_id,
    name: d.name,
    specialization: d.specialty || 'General',
    department: d.department || 'General',
    experience: d.experience || 0,
    status: mapDoctorStatus(d.status),
    dutyStatus: 'On Duty',
    emergencyAvailable: true,
    email: d.email,
    phone: d.phone,
    createdAt: d.created_at || new Date().toISOString(),
    updatedAt: d.updated_at || new Date().toISOString(),
  };
}

function transformDoctors(doctors: any[]): Doctor[] {
  return doctors.map(transformDoctor);
}

function transformRoom(r: any): Room {
  return {
    id: r.id,
    hospitalId: r.hospital_id,
    roomNumber: r.room_number,
    type: mapRoomType(r.room_type),
    floor: r.floor || '',
    department: '',
    capacity: 1,
    currentOccupancy: r.status === 'OCCUPIED' ? 1 : 0,
    status: mapRoomStatus(r.status),
    lastUpdated: r.updated_at || new Date().toISOString(),
  };
}

function transformRooms(rooms: any[]): Room[] {
  return rooms.map(transformRoom);
}

function mapDoctorStatus(status: string): Doctor['status'] {
  const statusMap: Record<string, Doctor['status']> = {
    'AVAILABLE': 'Available',
    'BUSY': 'Busy',
    'UNAVAILABLE': 'Unavailable',
    'OFF_DUTY': 'Off Duty',
  };
  return statusMap[status] || 'Available';
}

function mapRoomType(type: string): Room['type'] {
  const typeMap: Record<string, Room['type']> = {
    'EMERGENCY_ROOM': 'Emergency Room',
    'ICU': 'ICU',
    'GENERAL_WARD': 'General Ward',
    'PRIVATE_ROOM': 'Private Room',
    'OPERATION_THEATRE': 'Operation Theatre',
  };
  return typeMap[type] || 'General Ward';
}

function mapRoomStatus(status: string): Room['status'] {
  const statusMap: Record<string, Room['status']> = {
    'AVAILABLE': 'Available',
    'OCCUPIED': 'Occupied',
    'UNDER_MAINTENANCE': 'Maintenance',
    'CLEANING': 'Cleaning',
  };
  return statusMap[status] || 'Available';
}
