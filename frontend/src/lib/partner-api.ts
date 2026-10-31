import axios from 'axios';
import { clearPartnerAuth, getPartnerToken } from './partner-auth';
import { resolveApiBaseUrl } from './hosts';

const STORE_SLUG = import.meta.env.VITE_STORE_SLUG || 'jori-store';

export const partnerApi = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 20000,
  headers: {
    Accept: 'application/json',
    'X-Store-Slug': STORE_SLUG,
  },
});

partnerApi.interceptors.request.use((config) => {
  const token = getPartnerToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers['X-Store-Slug'] = STORE_SLUG;
  return config;
});

partnerApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearPartnerAuth();
      const path = window.location.pathname;
      if (path.startsWith('/partner') && !path.startsWith('/partner/login')) {
        window.location.replace('/partner/login');
      }
    }
    return Promise.reject(error);
  },
);
