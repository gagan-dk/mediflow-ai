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
    `/hospitals/${query.hospitalId}/doctors${qs}`,
    token
  );
}

export async function getDoctorById(
  hospitalId: string,
  doctorId: string,
  token?: string
): Promise<CreateDoctorResponse> {
  return apiClient.get<CreateDoctorResponse>(
    `/hospitals/${hospitalId}/doctors/${doctorId}`,
    token
  );
}

export async function createDoctor(
  data: CreateDoctorRequest,
  token: string
): Promise<CreateDoctorResponse> {
  return apiClient.post<CreateDoctorResponse>(
    `/hospitals/${data.hospitalId}/doctors`,
    data,
    token
  );
}

export async function updateDoctor(
  hospitalId: string,
  doctorId: string,
  data: UpdateDoctorRequest,
  token: string
): Promise<UpdateDoctorResponse> {
  return apiClient.put<UpdateDoctorResponse>(
    `/hospitals/${hospitalId}/doctors/${doctorId}`,
    data,
    token
  );
}

export async function deleteDoctor(
  hospitalId: string,
  doctorId: string,
  token: string
): Promise<DeleteDoctorResponse> {
  return apiClient.delete<DeleteDoctorResponse>(
    `/hospitals/${hospitalId}/doctors/${doctorId}`,
    token
  );
}
