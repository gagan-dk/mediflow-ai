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
  UpdateBedRequest,
  UpdateBedResponse,
  GetQueueQuery,
  GetQueueResponse,
  GetAmbulancesQuery,
  GetAmbulancesResponse,
  UpdateAmbulanceRequest,
  UpdateAmbulanceResponse,
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
  return apiClient.get<GetHospitalsResponse>(`/hospitals${qs}`);
}

/**
 * Get single hospital by ID.
 */
export async function getHospitalById(
  hospitalId: string,
  token?: string
): Promise<GetHospitalResponse> {
  return apiClient.get<GetHospitalResponse>(`/hospitals/${hospitalId}`);
}

/**
 * Update hospital operational data (staff only).
 */
export async function updateHospital(
  hospitalId: string,
  data: UpdateHospitalRequest,
  token: string
): Promise<UpdateHospitalResponse> {
  return apiClient.put<UpdateHospitalResponse>(
    `/hospitals/${hospitalId}`,
    data
  );
}

/**
 * Get beds for a hospital (staff only).
 */
export async function getBeds(
  query: GetBedsQuery,
  token?: string
): Promise<GetBedsResponse> {
  const qs = buildQuery({
    wardType: query.wardType,
    status: query.status,
  });
  return apiClient.get<GetBedsResponse>(`/hospitals/${query.hospitalId}/beds${qs}`);
}

/**
 * Update a bed record (staff only).
 */
export async function updateBed(
  hospitalId: string,
  bedId: string,
  data: UpdateBedRequest,
  token: string
): Promise<UpdateBedResponse> {
  return apiClient.put<UpdateBedResponse>(
    `/hospitals/${hospitalId}/beds/${bedId}`,
    data
  );
}

/**
 * Update hospital beds metrics (staff only).
 */
export async function updateHospitalBeds(
  hospitalId: string,
  data: { total?: number; available?: number; occupied?: number; reserved?: number },
  token: string
): Promise<UpdateHospitalResponse> {
  return apiClient.put<UpdateHospitalResponse>(
    `/hospitals/${hospitalId}/beds/metrics`,
    data
  );
}

/**
 * Update hospital ICU metrics (staff only).
 */
export async function updateHospitalICU(
  hospitalId: string,
  data: { total?: number; available?: number; occupied?: number; reserved?: number },
  token: string
): Promise<UpdateHospitalResponse> {
  return apiClient.put<UpdateHospitalResponse>(
    `/hospitals/${hospitalId}/icu/metrics`,
    data
  );
}

/**
 * Update hospital emergency rooms metrics (staff only).
 */
export async function updateHospitalEmergencyRooms(
  hospitalId: string,
  data: { total?: number; available?: number; occupied?: number; cleaning?: number },
  token: string
): Promise<UpdateHospitalResponse> {
  return apiClient.put<UpdateHospitalResponse>(
    `/hospitals/${hospitalId}/emergency-rooms/metrics`,
    data
  );
}

/**
 * Update hospital queue metrics (staff only).
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
    `/hospitals/${hospitalId}/queue/metrics`,
    data
  );
}

/**
 * Update hospital ambulances metrics (staff only).
 */
export async function updateHospitalAmbulances(
  hospitalId: string,
  data: { total?: number; available?: number; dispatched?: number; enRoute?: number; atHospital?: number },
  token: string
): Promise<UpdateHospitalResponse> {
  return apiClient.put<UpdateHospitalResponse>(
    `/hospitals/${hospitalId}/ambulances/metrics`,
    data
  );
}

/**
 * Update hospital facilities/capabilities (staff only).
 */
export async function updateHospitalCapabilities(
  hospitalId: string,
  data: Record<string, boolean>,
  token: string
): Promise<UpdateHospitalResponse> {
  return apiClient.put<UpdateHospitalResponse>(
    `/hospitals/${hospitalId}/capabilities`,
    data
  );
}

/**
 * Get ambulances for a hospital.
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
    ? `/hospitals/${query.hospitalId}/ambulances${qs}`
    : `/ambulances${qs}`;
  return apiClient.get<GetAmbulancesResponse>(endpoint);
}

/**
 * Update ambulance (staff only).
 */
export async function updateAmbulance(
  hospitalId: string,
  ambulanceId: string,
  data: UpdateAmbulanceRequest,
  token: string
): Promise<UpdateAmbulanceResponse> {
  return apiClient.put<UpdateAmbulanceResponse>(
    `/hospitals/${hospitalId}/ambulances/${ambulanceId}`,
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
  const qs = buildQuery({
    status: query.status,
  });
  return apiClient.get<GetQueueResponse>(`/hospitals/${query.hospitalId}/queue${qs}`);
}

/**
 * Update queue patient status (staff only).
 */
export async function updateQueuePatient(
  hospitalId: string,
  patientId: string,
  data: { status?: string; assignedRoom?: string; assignedDoctor?: string },
  token: string
): Promise<{ patient: any; message: string }> {
  return apiClient.put<{ patient: any; message: string }>(
    `/hospitals/${hospitalId}/queue/${patientId}`,
    data
  );
}
