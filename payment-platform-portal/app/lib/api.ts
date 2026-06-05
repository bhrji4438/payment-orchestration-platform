'use client';

import axios, { AxiosError } from 'axios';
import { useAuthStore } from '@/store/authStore';

const CORE_API_URL = process.env.NEXT_PUBLIC_CORE_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: CORE_API_URL,
  headers: { 'Content-Type': 'application/json' }
});

// ─── Request Interceptor: attach access token ─────────────────────────────
api.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken;
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// ─── Response Interceptor: silent token refresh on 401 ───────────────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

function processQueue(error: any, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token!);
    }
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response?.status === 401 && !originalRequest._retry) {
      const data = error.response.data as any;

      // Only retry if token is expired (not invalid/unauthorized)
      if (data?.code !== 'TOKEN_EXPIRED') {
        if (!originalRequest.url?.includes('/v1/auth/login') && !originalRequest.url?.includes('/v1/auth/signup')) {
          useAuthStore.getState().logout();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const { refreshToken, setTokens, logout } = useAuthStore.getState();

      if (!refreshToken) {
        logout();
        if (typeof window !== 'undefined') window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${CORE_API_URL}/v1/auth/refresh`, { refreshToken });
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;
        setTokens(newAccessToken, newRefreshToken);
        processQueue(null, newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        logout();
        if (typeof window !== 'undefined') window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ─── Auth API calls ────────────────────────────────────────────────────────
export const authApi = {
  signup: (data: { name: string; email: string; password: string; merchantName: string }) =>
    api.post('/v1/auth/signup', data),

  login: (data: { email: string; password: string }) =>
    api.post('/v1/auth/login', data),

  logout: (refreshToken: string) =>
    api.post('/v1/auth/logout', { refreshToken }),

  me: () => api.get('/v1/auth/me'),

  requestPasswordReset: (email: string) =>
    api.post('/v1/auth/password/reset/request', { email }),

  confirmPasswordReset: (token: string, newPassword: string) =>
    api.post('/v1/auth/password/reset/confirm', { token, newPassword })
};

// ─── Reporting API calls ───────────────────────────────────────────────────
export const reportingApi = {
  getAnalytics: (merchantId: string) =>
    axios.get(`${process.env.NEXT_PUBLIC_REPORTING_API_URL || 'http://localhost:3005'}/analytics/${merchantId}`)
};

// ─── Payments API calls ────────────────────────────────────────────────────
export const paymentsApi = {
  getPayments: (params?: { status?: string; search?: string; limit?: number; cursor?: string }) =>
    api.get('/v1/payments', { params }),
  getPayment: (id: string) => api.get(`/v1/payments/${id}`),
  createPayment: (data: any, config?: any) => api.post('/v1/payments', data, config)
};

// ─── Gateways API calls ────────────────────────────────────────────────────
export const gatewaysApi = {
  getProviders: () => api.get('/v1/gateways/providers'),
  getConfigurations: () => api.get('/v1/gateways/configurations'),
  createConfiguration: (data: any) => api.post('/v1/gateways/configurations', data),
  updateConfiguration: (id: string, data: any) => api.put(`/v1/gateways/configurations/${id}`, data),
  deleteConfiguration: (id: string) => api.delete(`/v1/gateways/configurations/${id}`),
  resetCircuit: (id: string) => api.post(`/v1/gateways/configurations/${id}/circuit-reset`)
};

// ─── API Keys API calls ────────────────────────────────────────────────────
export const apiKeysApi = {
  getKeys: () => api.get('/v1/api-keys'),
  rotate: (data: { name: string }) => api.post('/v1/api-keys/rotate', data),
  revoke: (data: { id: string }) => api.post('/v1/api-keys/revoke', data)
};

export const customersApi = {
  getCustomers: (params?: { limit?: number; cursor?: string; search?: string }) => 
    api.get('/v1/customers', { params }),
  getCustomer: (id: string) => api.get(`/v1/customers/${id}`),
  createCustomer: (data: any) => api.post('/v1/customers', data),
  updateCustomer: (id: string, data: any) => api.put(`/v1/customers/${id}`, data),
  updateStatus: (id: string, isActive: boolean) => api.put(`/v1/customers/${id}/status`, { isActive })
};

export const transactionsApi = {
  getTransaction: (id: string) => api.get(`/v1/transactions/${id}`)
};
