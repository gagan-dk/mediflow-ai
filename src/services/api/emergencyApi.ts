/**
 * Emergency API
 * Handles emergency case creation, AI-assisted prioritization, hospital selection,
 * and queue token issuance.
 */

import { apiClient } from './apiClient';
import type {
  CreateEmergencyRequest,
  CreateEmergencyResponse,
  SelectHospitalRequest,
  SelectHospitalResponse,
} from '@/types/api';

/**
 * Create an emergency case and receive AI-assisted prioritization result.
 */
export async function createEmergency(
  data: CreateEmergencyRequest,
  token: string
): Promise<CreateEmergencyResponse> {
  return apiClient.post<CreateEmergencyResponse>('/emergencies', data, token);
}

/**
 * Get an existing emergency case by ID.
 */
export async function getEmergency(
  emergencyId: string,
  token: string
): Promise<CreateEmergencyResponse> {
  return apiClient.get<CreateEmergencyResponse>(`/emergencies/${emergencyId}`, token);
}

/**
 * Select a hospital for an emergency case and receive a queue token.
 */
export async function selectHospital(
  data: SelectHospitalRequest,
  token: string
): Promise<SelectHospitalResponse> {
  return apiClient.post<SelectHospitalResponse>(
    `/emergencies/${data.emergencyId}/select-hospital`,
    { hospitalId: data.hospitalId },
    token
  );
}

/**
 * Get queue token status for a patient.
 */
export async function getQueueTokenStatus(
  emergencyId: string,
  token: string
): Promise<{ queueToken: string; status: string; position: number }> {
  return apiClient.get(`/emergencies/${emergencyId}/queue-status`, token);
}
