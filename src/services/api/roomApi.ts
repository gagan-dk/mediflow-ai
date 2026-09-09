/**
 * Room API
 * CRUD operations for hospital room records.
 */

import { apiClient } from './apiClient';
import type {
  GetRoomsQuery,
  GetRoomsResponse,
  CreateRoomRequest,
  CreateRoomResponse,
  UpdateRoomRequest,
  UpdateRoomResponse,
  DeleteRoomResponse,
} from '@/types/api';

function buildQuery(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== ''
  );
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

export async function getRooms(
  query: GetRoomsQuery,
  token?: string
): Promise<GetRoomsResponse> {
  const qs = buildQuery({
    type: query.type,
    status: query.status,
    floor: query.floor,
    department: query.department,
  });
  return apiClient.get<GetRoomsResponse>(
    `/hospitals/${query.hospitalId}/rooms${qs}`
  );
}

export async function createRoom(
  data: CreateRoomRequest,
  token: string
): Promise<CreateRoomResponse> {
  return apiClient.post<CreateRoomResponse>(
    `/hospitals/${data.hospitalId}/rooms`,
    data
  );
}

export async function updateRoom(
  hospitalId: string,
  roomId: string,
  data: UpdateRoomRequest,
  token: string
): Promise<UpdateRoomResponse> {
  return apiClient.put<UpdateRoomResponse>(
    `/hospitals/${hospitalId}/rooms/${roomId}`,
    data
  );
}

export async function deleteRoom(
  hospitalId: string,
  roomId: string,
  token: string
): Promise<DeleteRoomResponse> {
  return apiClient.delete<DeleteRoomResponse>(
    `/hospitals/${hospitalId}/rooms/${roomId}`
  );
}
