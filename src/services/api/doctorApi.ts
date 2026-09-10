/**
 * Doctor API
 * CRUD operations for hospital doctor records.
 */

import { apiClient } from './apiClient';
import type {
  GetDoctorsQuery,
  GetDoctorsResponse,
  CreateDoctorRequest,
  CreateDoctorResponse,
  UpdateDoctorRequest,
  UpdateDoctorResponse,
  DeleteDoctorResponse,
  DoctorRead,
} from '@/types/api';

function buildQuery(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

export async function getDoctors(
  query: GetDoctorsQuery,
  token?: string
): Promise<GetDoctorsResponse> {
  const qs = buildQuery({
    specialization: query.specialization,
    status: query.status,
    department: query.department,
  });
  return apiClient.get<GetDoctorsResponse>(
    `/api/hospitals/${query.hospitalId}/doctors${qs}`
  );
}

export async function getDoctorById(
  hospitalId: string,
  doctorId: string,
  token?: string
): Promise<DoctorRead> {
  return apiClient.get<DoctorRead>(
    `/api/hospitals/${hospitalId}/doctors/${doctorId}`
  );
}

export async function createDoctor(
  data: CreateDoctorRequest,
  token: string
): Promise<CreateDoctorResponse> {
  return apiClient.post<CreateDoctorResponse>(
    `/api/staff/doctors`,
    data
  );
}

export async function updateDoctor(
  doctorId: string,
  data: UpdateDoctorRequest,
  token: string
): Promise<UpdateDoctorResponse> {
  return apiClient.put<UpdateDoctorResponse>(
    `/api/staff/doctors/${doctorId}`,
    data
  );
}

export async function deleteDoctor(
  doctorId: string,
  token: string
): Promise<DeleteDoctorResponse> {
  return apiClient.delete<DeleteDoctorResponse>(
    `/api/staff/doctors/${doctorId}`
  );
}