import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { clearAuthToken, getAuthToken } from './auth';
import { resolveApiBaseUrl } from './hosts';

type RetryConfig = InternalAxiosRequestConfig & { __retryCount?: number };

export const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 45000,
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

function isRetryableNetworkError(error: AxiosError): boolean {
  if (error.response) {
    return false;
  }
  const msg = String(error.message || '').toLowerCase();
  return msg.includes('network error') || error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK';
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined;
    if (config && isRetryableNetworkError(error)) {
      const method = (config.method || 'get').toLowerCase();
      const retries = config.__retryCount ?? 0;
      if (method === 'get' && retries < 2) {
        const attempt = retries + 1;
        config.__retryCount = attempt;
        await new Promise((r) => window.setTimeout(r, 400 * attempt));
        return api.request(config);
      }
    }

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
