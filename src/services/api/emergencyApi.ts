import { apiClient } from './apiClient';
import type {
  CreateEmergencyRequest,
  EmergencyCaseRead,
  SelectHospitalRequest,
  SelectHospitalResponse,
  QueueTokenView,
  GetQueueResponse,
  BackendQueueStatus,
  UpdateQueueStatusResponse,
} from '@/types/api';

export async function createEmergencyCase(
  data: CreateEmergencyRequest
): Promise<EmergencyCaseRead> {
  return apiClient.post<EmergencyCaseRead>('/api/emergency-cases', data);
}

export async function getEmergencyCase(
  caseId: string
): Promise<EmergencyCaseRead> {
  return apiClient.get<EmergencyCaseRead>(`/api/emergency-cases/${caseId}`);
}

export async function listMyEmergencyCases(): Promise<{ items: EmergencyCaseRead[]; total: number }> {
  return apiClient.get('/api/patients/me/emergency-cases');
}

export async function selectHospitalForCase(
  data: SelectHospitalRequest
): Promise<SelectHospitalResponse> {
  return apiClient.post<SelectHospitalResponse>(
    `/api/emergency-cases/${data.emergencyId}/hospital-selection`,
    { hospital_id: data.hospitalId }
  );
}

export async function getQueueForHospital(
  hospitalId: string
): Promise<GetQueueResponse> {
  return apiClient.get<GetQueueResponse>(`/api/queue/${hospitalId}`);
}

export async function updateQueueTokenStatus(
  tokenId: string,
  status: BackendQueueStatus
): Promise<UpdateQueueStatusResponse> {
  return apiClient.put<UpdateQueueStatusResponse>(
    `/api/queue/tokens/${tokenId}/status`,
    { status }
  );
}
