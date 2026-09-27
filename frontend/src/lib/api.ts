import axios from 'axios';
import { clearAuthToken, getAuthToken } from './auth';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 20000,
  headers: {
    Accept: 'application/json',
  },
});

/** Longer timeout for Google Places / AI / bulk send */
export const LONG_REQUEST_TIMEOUT_MS = 120000;

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const url = String(config.url || '');
  if (
    url.includes('/place-search') ||
    url.includes('/ai-outreach/') ||
    url.includes('/company-analysis/') ||
    url.includes('/email-campaigns/') ||
    url.includes('/outreach/')
  ) {
    config.timeout = LONG_REQUEST_TIMEOUT_MS;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearAuthToken();
      const path = window.location.pathname;
      if (path.startsWith('/admin') && !path.startsWith('/admin/login')) {
        window.location.replace('/admin/login');
      }
    }
    return Promise.reject(error);
  },
);
