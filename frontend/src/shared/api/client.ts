import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { useAuthStore } from '../../store/auth.store.js';
import type { ApiError } from '../types/index.js';

const BASE_URL = `${import.meta.env.VITE_API_URL ?? 'http://localhost:4000'}/api/${import.meta.env.VITE_API_VERSION ?? 'v1'}`;

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── REQUEST: attach Bearer token ────────────────────────────
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const tokens = useAuthStore.getState().tokens;
  if (tokens?.accessToken) {
    config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  }
  return config;
});

// ─── RESPONSE: token refresh on 401 ─────────────────────────
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject:  (err: unknown) => void;
}> = [];

function flushQueue(err: unknown, token: string | null): void {
  for (const { resolve, reject } of pendingQueue) {
    if (err) reject(err);
    else if (token) resolve(token);
  }
  pendingQueue = [];
}

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error);

    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status          = error.response?.status;

    // Not a 401, or already retried — pass through
    if (status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    const refreshToken = useAuthStore.getState().tokens?.refreshToken;
    if (!refreshToken) {
      useAuthStore.getState().clearAuth();
      window.location.href = '/auth/login';
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue this request until the ongoing refresh completes
      return new Promise<AxiosResponse>((resolve, reject) => {
        pendingQueue.push({
          resolve: (token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            resolve(apiClient(originalRequest));
          },
          reject,
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const res = await axios.post<{ data: { accessToken: string; refreshToken: string; expiresIn: number } }>(
        `${BASE_URL}/auth/refresh`,
        { refreshToken },
      );

      const newTokens = res.data.data;
      useAuthStore.getState().setTokens(newTokens);
      flushQueue(null, newTokens.accessToken);

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
      }
      return apiClient(originalRequest);
    } catch (refreshError) {
      flushQueue(refreshError, null);
      useAuthStore.getState().clearAuth();
      window.location.href = '/auth/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);


// ─── Typed request helpers ───────────────────────────────────

export async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await apiClient.get<{ data: T }>(url, { params });
  return res.data.data;
}

export async function post<T>(url: string, data?: unknown): Promise<T> {
  const res = await apiClient.post<{ data: T }>(url, data);
  return res.data.data;
}

export async function put<T>(url: string, data?: unknown): Promise<T> {
  const res = await apiClient.put<{ data: T }>(url, data);
  return res.data.data;
}

export async function patch<T>(url: string, data?: unknown): Promise<T> {
  const res = await apiClient.patch<{ data: T }>(url, data);
  return res.data.data;
}

export async function del<T>(url: string): Promise<T> {
  const res = await apiClient.delete<{ data: T }>(url);
  return res.data.data;
}

// Extract structured API error message
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiError | undefined;
    return data?.error?.message ?? error.message;
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
}
