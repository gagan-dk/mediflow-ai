/**
 * Staff API Service
 * Backend integration for hospital staff management.
 * Staff authorization is enforced server-side based on hospital_staff table.
 * No hospital_id is sent in request bodies - it's resolved from authenticated staff context.
 */

import { apiClient } from './apiClient';

export interface StaffDoctorCreate {
  name: string;
  specialty: string;
  registration_number?: string;
  phone?: string;
  email?: string;
  status?: 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE' | 'OFF_DUTY';
}

export interface StaffDoctorUpdate {
  name?: string;
  specialty?: string;
  registration_number?: string;
  phone?: string;
  email?: string;
  status?: 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE' | 'OFF_DUTY';
}

export interface StaffRoomCreate {
  room_number: string;
  room_type: string;
  floor?: string;
  status?: 'AVAILABLE' | 'OCCUPIED' | 'UNDER_MAINTENANCE' | 'CLEANING';
}

export interface StaffRoomUpdate {
  room_number?: string;
  room_type?: string;
  floor?: string;
  status?: 'AVAILABLE' | 'OCCUPIED' | 'UNDER_MAINTENANCE' | 'CLEANING';
}

export interface StaffBedCreate {
  bed_number: string;
  bed_type: string;
  room_id?: string;
  status?: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'UNDER_MAINTENANCE';
}

export interface StaffBedUpdate {
  bed_number?: string;
  bed_type?: string;
  room_id?: string;
  status?: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'UNDER_MAINTENANCE';
}

export interface StaffAmbulanceCreate {
  vehicle_number: string;
  type?: 'BLS' | 'ALS' | 'ACL';
  status?: 'AVAILABLE' | 'DISPATCHED' | 'IN_TRANSIT' | 'AT_HOSPITAL';
  latitude?: number;
  longitude?: number;
  current_assignment?: string;
}

export interface StaffAmbulanceUpdate {
  vehicle_number?: string;
  type?: 'BLS' | 'ALS' | 'ACL';
  status?: 'AVAILABLE' | 'DISPATCHED' | 'IN_TRANSIT' | 'AT_HOSPITAL';
  latitude?: number;
  longitude?: number;
  current_assignment?: string;
}

export interface StaffOperationUpdate {
  current_er_load?: number;
  estimated_wait_minutes?: number;
  available_ambulances?: number;
}

export interface StaffHospitalUpdate {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  emergency_available?: boolean;
  status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
}

export interface MyHospitalResponse {
  hospital: any;
  operations?: any;
}

export interface DoctorResponse {
  id: string;
  name: string;
  specialty: string;
  registration_number?: string;
  phone?: string;
  email?: string;
  status: string;
  hospital_id: string;
  created_at: string;
  updated_at: string;
}

export interface RoomResponse {
  id: string;
  room_number: string;
  room_type: string;
  floor?: string;
  status: string;
  hospital_id: string;
  created_at: string;
  updated_at: string;
}

export interface BedResponse {
  id: string;
  bed_number: string;
  bed_type: string;
  room_id?: string;
  status: string;
  hospital_id: string;
  created_at: string;
  updated_at: string;
}

export interface AmbulanceResponse {
  id: string;
  vehicle_number: string;
  type: string;
  status: string;
  latitude?: number;
  longitude?: number;
  current_assignment?: string;
  hospital_id: string;
  created_at: string;
  updated_at: string;
}

export interface OperationResponse {
  id: string;
  hospital_id: string;
  current_er_load: number;
  estimated_wait_minutes: number;
  available_ambulances: number;
  created_at: string;
  updated_at: string;
}

class StaffApi {
  /**
   * Get my hospital snapshot (resolved from authenticated staff context)
   */
  async getMyHospital(token: string): Promise<MyHospitalResponse> {
    return apiClient.get<MyHospitalResponse>('/api/staff/my-hospital');
  }

  /**
   * Update my hospital profile
   */
  async updateMyHospital(
    data: StaffHospitalUpdate,
    token: string
  ): Promise<MyHospitalResponse> {
    return apiClient.put<MyHospitalResponse>('/api/staff/my-hospital', data);
  }

  /**
   * Create a doctor for my hospital
   */
  async createDoctor(data: StaffDoctorCreate, token: string): Promise<DoctorResponse> {
    return apiClient.post<DoctorResponse>('/api/staff/doctors', data);
  }

  /**
   * Update a doctor
   */
  async updateDoctor(
    doctorId: string,
    data: StaffDoctorUpdate,
    token: string
  ): Promise<DoctorResponse> {
    return apiClient.put<DoctorResponse>(`/api/staff/doctors/${doctorId}`, data);
  }

  /**
   * Delete a doctor
   */
  async deleteDoctor(doctorId: string, token: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/api/staff/doctors/${doctorId}`);
  }

  /**
   * Create a room for my hospital
   */
  async createRoom(data: StaffRoomCreate, token: string): Promise<RoomResponse> {
    return apiClient.post<RoomResponse>('/api/staff/rooms', data);
  }

  /**
   * Update a room
   */
  async updateRoom(
    roomId: string,
    data: StaffRoomUpdate,
    token: string
  ): Promise<RoomResponse> {
    return apiClient.put<RoomResponse>(`/api/staff/rooms/${roomId}`, data);
  }

  /**
   * Delete a room
   */
  async deleteRoom(roomId: string, token: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/api/staff/rooms/${roomId}`);
  }

  /**
   * Create a bed for my hospital
   */
  async createBed(data: StaffBedCreate, token: string): Promise<BedResponse> {
    return apiClient.post<BedResponse>('/api/staff/beds', data);
  }

  /**
   * Update a bed
   */
  async updateBed(
    bedId: string,
    data: StaffBedUpdate,
    token: string
  ): Promise<BedResponse> {
    return apiClient.put<BedResponse>(`/api/staff/beds/${bedId}`, data);
  }

  /**
   * Create an ambulance for my hospital
   */
  async createAmbulance(data: StaffAmbulanceCreate, token: string): Promise<AmbulanceResponse> {
    return apiClient.post<AmbulanceResponse>('/api/staff/ambulances', data);
  }

  /**
   * Update an ambulance
   */
  async updateAmbulance(
    ambulanceId: string,
    data: StaffAmbulanceUpdate,
    token: string
  ): Promise<AmbulanceResponse> {
    return apiClient.put<AmbulanceResponse>(
      `/api/staff/ambulances/${ambulanceId}`,
      data
    );
  }

  /**
   * Update hospital operations (ER load, wait time, ambulances)
   */
  async updateOperations(
    data: StaffOperationUpdate,
    token: string
  ): Promise<OperationResponse> {
    return apiClient.put<OperationResponse>('/api/staff/operations', data);
  }
}

export const staffApi = new StaffApi();
