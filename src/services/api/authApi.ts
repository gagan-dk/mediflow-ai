/**
 * Authentication API
 * Handles login, registration, and user session management.
 *
 * SECURITY: Never log tokens or passwords.
 */

import { apiClient } from './apiClient';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  UserProfile,
} from '@/types/api';

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  return apiClient.post<LoginResponse>('/auth/login', credentials);
}

export async function register(data: RegisterRequest): Promise<RegisterResponse> {
  return apiClient.post<RegisterResponse>('/auth/register', data);
}

export async function getCurrentUser(token: string): Promise<UserProfile> {
  return apiClient.get<UserProfile>('/auth/me', token);
}

export async function logout(token: string): Promise<void> {
  try {
    await apiClient.post<void>('/auth/logout', {}, token);
  } catch {
    // Logout always succeeds locally even if the server call fails.
  }
}
