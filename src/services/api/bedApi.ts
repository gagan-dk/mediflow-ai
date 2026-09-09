/**
 * Bed API
 * Read and update hospital bed records.
 */

import { apiClient } from './apiClient';
import type {
  GetBedsQuery,
  GetBedsResponse,
  UpdateBedRequest,
  UpdateBedResponse,
} from '@/types/api';

function buildQuery(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][];
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries).toString();
}

export async function getBeds(
  query: GetBedsQuery,
  token?: string
): Promise<GetBedsResponse> {
  const qs = buildQuery({
    hospitalId: query.hospitalId,
    wardType: query.wardType,
    status: query.status,
  });
  return apiClient.get<GetBedsResponse>(`/beds${qs}`);
}

export async function updateBed(
  bedId: string,
  data: UpdateBedRequest,
  token: string
): Promise<UpdateBedResponse> {
  return apiClient.put<UpdateBedResponse>(`/beds/${bedId}`, data);
}
