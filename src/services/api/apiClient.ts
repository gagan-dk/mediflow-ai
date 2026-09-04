import { ApiError } from '@/types/api';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        code: errorData.code || 'API_ERROR',
        message: errorData.message || 'An error occurred',
        statusCode: response.status,
      } as ApiError;
    }

    return await response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw { message: 'Request timed out' } as ApiError;
    }
    throw error;
  }
}

export const apiClient = {
  get: <T>(endpoint: string, token?: string, options: RequestInit = {}) =>
    request<T>(endpoint, { ...options, method: 'GET' }, token),
  post: <T>(endpoint: string, data: any, token?: string, options: RequestInit = {}) =>
    request<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(data) }, token),
  put: <T>(endpoint: string, data: any, token?: string, options: RequestInit = {}) =>
    request<T>(endpoint, { ...options, method: 'PUT', body: JSON.stringify(data) }, token),
  delete: <T>(endpoint: string, token?: string, options: RequestInit = {}) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }, token),
};
