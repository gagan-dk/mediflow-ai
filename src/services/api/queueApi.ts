/**
 * Queue API
 * Manages hospital queue/token records.
 */

import { apiClient } from './apiClient';
import type {
  GetQueueQuery,
  GetQueueResponse,
  UpdateQueueStatusRequest,
  UpdateQueueStatusResponse,
} from '@/types/api';

function buildQuery(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][];
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries).toString();
}

/**
 * Get queue patients for a hospital.
 */
export async function getQueue(
  query: GetQueueQuery,
  token?: string
): Promise<GetQueueResponse> {
  return apiClient.get<GetQueueResponse>(`/api/queue/${query.hospitalId}`);
}

/**
 * Update a patient's queue status (assign room, doctor, etc.).
 */
export async function updateQueueStatus(
  patientId: string,
  data: UpdateQueueStatusRequest,
  token?: string
): Promise<UpdateQueueStatusResponse> {
  return apiClient.put<UpdateQueueStatusResponse>(
    `/api/queue/tokens/${patientId}/status`,
    data
  );
}

/**
 * Remove a patient from the queue (discharged, transferred, etc.).
 */
export async function removeFromQueue(
  patientId: string,
  token?: string
): Promise<{ message: string }> {
  return apiClient.put(`/api/queue/tokens/${patientId}/status`, { status: 'CANCELLED' });
}
