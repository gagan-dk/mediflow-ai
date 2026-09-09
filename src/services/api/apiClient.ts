export interface ApiError {
  status: number;
  message: string;
  code?: string;
  detail?: unknown;
}

export class ApiClientError extends Error implements ApiError {
  status: number;
  code?: string;
  detail?: unknown;

  constructor(status: number, message: string, code?: string, detail?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const REQUEST_TIMEOUT = 30000;

let currentAccessToken: string | null = null;

export const apiClient = {
  setAccessToken(token: string | null) {
    currentAccessToken = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  },

  getAccessToken(): string | null {
    return currentAccessToken || localStorage.getItem('auth_token');
  },

  async request<T>(
    method: string,
    endpoint: string,
    body?: unknown,
    options?: { skipAuth?: boolean }
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = this.getAccessToken();
    if (token && !options?.skipAuth) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorData: any;
        try {
          errorData = await response.json();
        } catch {
          throw new ApiClientError(
            response.status,
            response.statusText,
            `HTTP_${response.status}`
          );
        }

        const message =
          errorData.detail?.message ||
          errorData.message ||
          errorData.detail ||
          response.statusText;

        throw new ApiClientError(response.status, message, errorData.code, errorData);
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiClientError) {
        throw error;
      }

      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new ApiClientError(
          0,
          'Network error. Please check your connection.',
          'NETWORK_ERROR'
        );
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiClientError(
          408,
          'Request timeout',
          'REQUEST_TIMEOUT'
        );
      }

      throw new ApiClientError(500, String(error), 'UNKNOWN_ERROR', error);
    }
  },

  get<T>(endpoint: string, options?: { skipAuth?: boolean }): Promise<T> {
    return this.request<T>('GET', endpoint, undefined, options);
  },

  post<T>(endpoint: string, body: unknown, options?: { skipAuth?: boolean }): Promise<T> {
    return this.request<T>('POST', endpoint, body, options);
  },

  put<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>('PUT', endpoint, body);
  },

  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>('DELETE', endpoint);
  },
};
