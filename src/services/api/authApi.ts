/**
 * Authentication API
 * Handles login, registration, and current-user retrieval.
 *
 * Follows Gagan's backend contract exactly:
 *   POST /api/auth/login   → { access_token, token_type, expires_in, user }
 *   POST /api/auth/register → UserRead
 *   GET  /api/auth/me       → UserRead
 *
 * SECURITY:
 * - Never log tokens or passwords.
 * - No backend logout endpoint exists; logout is client-side only.
 */

import { apiClient, ApiClientError } from './apiClient';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: 'PATIENT' | 'HOSPITAL_STAFF' | 'ADMIN';
  created_at: string;
  updated_at: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
}

export type AuthError = ApiClientError;

export async function authLogin(payload: LoginPayload): Promise<LoginResponse> {
  return apiClient.post<LoginResponse>('/api/auth/login', payload, { skipAuth: true });
}

export async function authRegister(payload: RegisterPayload): Promise<AuthUser> {
  return apiClient.post<AuthUser>('/api/auth/register', payload, { skipAuth: true });
}

export async function authGetCurrentUser(): Promise<AuthUser> {
  return apiClient.get<AuthUser>('/api/auth/me');
}

export async function authHealthCheck(): Promise<{ status: string }> {
  return apiClient.get<{ status: string }>('/api/health', { skipAuth: true });
}
