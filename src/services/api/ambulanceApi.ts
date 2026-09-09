/**
 * Ambulance API
 * Read and update hospital ambulance fleet records.
 */

import { apiClient } from './apiClient';
import type {
  GetAmbulancesQuery,
  GetAmbulancesResponse,
  UpdateAmbulanceRequest,
  UpdateAmbulanceResponse,
} from '@/types/api';

function buildQuery(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][];
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries).toString();
}

export async function getAmbulances(
  query?: GetAmbulancesQuery,
  token?: string
): Promise<GetAmbulancesResponse> {
  const qs = buildQuery({
    hospitalId: query?.hospitalId,
    status: query?.status,
    vehicleNumber: query?.vehicleNumber,
  });
  return apiClient.get<GetAmbulancesResponse>(`/ambulances${qs}`);
}

export async function getAmbulanceById(
  ambulanceId: string,
  token?: string
): Promise<{ ambulance: import('@/types/ambulance').Ambulance }> {
  return apiClient.get(`/ambulances/${ambulanceId}`);
}

export async function updateAmbulance(
  ambulanceId: string,
  data: UpdateAmbulanceRequest,
  token: string
): Promise<UpdateAmbulanceResponse> {
  return apiClient.put<UpdateAmbulanceResponse>(`/ambulances/${ambulanceId}`, data);
}
