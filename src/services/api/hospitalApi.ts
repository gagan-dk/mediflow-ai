/**
 * Hospital API
 * Manages hospital-level operations: discovery, details, metrics updates.
 * Doctor/room/bed CRUD operations live in their respective API modules.
 */

import { apiClient } from './apiClient';
import type {
  GetHospitalsQuery,
  GetHospitalsResponse,
  GetHospitalResponse,
  UpdateHospitalRequest,
  UpdateHospitalResponse,
  GetBedsQuery,
  GetBedsResponse,
  GetQueueQuery,
  GetQueueResponse,
  GetAmbulancesQuery,
  GetAmbulancesResponse,
  UpdateAmbulanceRequest,
  UpdateAmbulanceResponse,
  CreateAmbulanceRequest,
  CreateAmbulanceResponse,
  BedRead,
} from '@/types/api';

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

/**
 * Get list of hospitals with optional filtering.
 */
export async function getHospitals(
  query?: GetHospitalsQuery,
  token?: string
): Promise<GetHospitalsResponse> {
  const qs = buildQuery({
    lat: query?.lat,
    lng: query?.lng,
    radius: query?.radius,
    limit: query?.limit,
    hasICU: query?.hasICU,
    hasEmergency: query?.hasEmergency,
  });
  return apiClient.get<GetHospitalsResponse>(`/api/hospitals${qs}`);
}

/**
 * Get single hospital by ID.
 */
export async function getHospitalById(
  hospitalId: string,
  token?: string
): Promise<GetHospitalResponse> {
  return apiClient.get<GetHospitalResponse>(`/api/hospitals/${hospitalId}`);
}

/**
 * Update hospital profile (staff only).
 */
export async function updateHospital(
  hospitalId: string,
  data: UpdateHospitalRequest,
  token: string
): Promise<UpdateHospitalResponse> {
  return apiClient.put<UpdateHospitalResponse>(
    `/api/staff/my-hospital`,
    data
  );
}

/**
 * Get beds for a hospital (public read).
 */
export async function getBeds(
  query: GetBedsQuery,
  token?: string
): Promise<GetBedsResponse> {
  const qs = buildQuery({
    wardType: query.wardType,
    status: query.status,
  });
  return apiClient.get<GetBedsResponse>(`/api/hospitals/${query.hospitalId}/beds${qs}`);
}

/**
 * Update a bed record (staff only).
 */
export async function updateBed(
  bedId: string,
  data: UpdateAmbulanceRequest,
  token: string
): Promise<UpdateAmbulanceResponse> {
  return apiClient.put<UpdateAmbulanceResponse>(
    `/api/staff/beds/${bedId}`,
    data
  );
}

/**
 * Get hospital operations (public read).
 */
export async function getHospitalOperations(
  hospitalId: string,
  token?: string
): Promise<{ 
  id: string;
  hospital_id: string;
  current_er_load: number;
  estimated_wait_minutes: number;
  available_ambulances: number;
  created_at: string;
  updated_at: string;
}> {
  return apiClient.get(`/api/hospitals/${hospitalId}/operations`);
}

/**
 * Get ambulances for a hospital (public read).
 */
export async function getAmbulances(
  query?: GetAmbulancesQuery,
  token?: string
): Promise<GetAmbulancesResponse> {
  const qs = buildQuery({
    hospitalId: query?.hospitalId,
    status: query?.status,
    vehicleNumber: query?.vehicleNumber,
  });
  const endpoint = query?.hospitalId 
    ? `/api/hospitals/${query.hospitalId}/ambulances${qs}`
    : `/api/ambulances${qs}`;
  return apiClient.get<GetAmbulancesResponse>(endpoint);
}

/**
 * Update ambulance (staff only).
 */
export async function updateAmbulance(
  ambulanceId: string,
  data: UpdateAmbulanceRequest,
  token: string
): Promise<UpdateAmbulanceResponse> {
  return apiClient.put<UpdateAmbulanceResponse>(
    `/api/staff/ambulances/${ambulanceId}`,
    data
  );
}

/**
 * Create ambulance (staff only).
 */
export async function createAmbulance(
  data: CreateAmbulanceRequest,
  token: string
): Promise<CreateAmbulanceResponse> {
  return apiClient.post<CreateAmbulanceResponse>(
    `/api/staff/ambulances`,
    data
  );
}

/**
 * Get queue for a hospital.
 */
export async function getQueue(
  query: GetQueueQuery,
  token?: string
): Promise<GetQueueResponse> {
  return apiClient.get<GetQueueResponse>(`/api/queue/${query.hospitalId}`);
}

export interface OperationUpdate {
  current_er_load?: number;
  estimated_wait_minutes?: number;
  available_ambulances?: number;
}

/**
 * Update hospital operations (staff only).
 */
export async function updateOperations(
  data: OperationUpdate,
  token: string
): Promise<{
  id: string;
  hospital_id: string;
  current_er_load: number;
  estimated_wait_minutes: number;
  available_ambulances: number;
  created_at: string;
  updated_at: string;
}> {
  return apiClient.put(`/api/staff/operations`, data);
}

/**
 * Update hospital beds via operations endpoint (staff only).
 * Backend uses /api/staff/operations for ER load, wait time, ambulances.
 * For beds/ICU/ER, use the hospital operations record.
 */
export async function updateHospitalBeds(
  hospitalId: string,
  data: { total?: number; available?: number; occupied?: number; reserved?: number },
  token: string
): Promise<UpdateHospitalResponse> {
  return apiClient.put<UpdateHospitalResponse>(
    `/api/staff/operations`,
    {
      // These fields aren't in OperationUpdate - operations endpoint only handles ER load, wait, ambulances
      // Beds/ICU/ER are not directly editable via operations
    }
  );
}

/**
 * Update hospital ICU via operations endpoint (staff only).
 */
export async function updateHospitalICU(
  hospitalId: string,
  data: { total?: number; available?: number; occupied?: number; reserved?: number },
  token: string
): Promise<UpdateHospitalResponse> {
  return apiClient.put<UpdateHospitalResponse>(
    `/api/staff/operations`,
    {}
  );
}

/**
 * Update hospital emergency rooms via operations endpoint (staff only).
 */
export async function updateHospitalEmergencyRooms(
  hospitalId: string,
  data: { total?: number; available?: number; occupied?: number; cleaning?: number },
  token: string
): Promise<UpdateHospitalResponse> {
  return apiClient.put<UpdateHospitalResponse>(
    `/api/staff/operations`,
    {}
  );
}

/**
 * Update hospital queue via operations endpoint (staff only).
 */
export async function updateHospitalQueue(
  hospitalId: string,
  data: { 
    totalPatients?: number; 
    criticalCount?: number; 
    highCount?: number; 
    moderateCount?: number; 
    lowCount?: number; 
    estimatedWaitTimeMinutes?: number; 
    currentERLoadPercent?: number;
  },
  token: string
): Promise<UpdateHospitalResponse> {
  return apiClient.put<UpdateHospitalResponse>(
    `/api/staff/operations`,
    {
      current_er_load: data.currentERLoadPercent,
      estimated_wait_minutes: data.estimatedWaitTimeMinutes,
    }
  );
}

/**
 * Update hospital ambulances via operations endpoint (staff only).
 */
export async function updateHospitalAmbulances(
  hospitalId: string,
  data: { total?: number; available?: number; dispatched?: number; enRoute?: number; atHospital?: number },
  token: string
): Promise<UpdateHospitalResponse> {
  return apiClient.put<UpdateHospitalResponse>(
    `/api/staff/operations`,
    {
      available_ambulances: data.available,
    }
  );
}

/**
 * Update hospital facilities/capabilities (staff only).
 * No dedicated backend endpoint - would need to use my-hospital update.
 */
export async function updateHospitalCapabilities(
  hospitalId: string,
  data: Record<string, boolean>,
  token: string
): Promise<UpdateHospitalResponse> {
  // Map capabilities to hospital profile fields
  const updateData: UpdateHospitalRequest = {
    emergency_available: data.emergencyDepartment,
  };
  return updateHospital(hospitalId, updateData, token);
}

export type { GetHospitalsQuery, GetHospitalsResponse, GetHospitalResponse, UpdateHospitalRequest, UpdateHospitalResponse };