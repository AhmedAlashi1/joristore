import axios from 'axios';
import { getCustomerId } from './customer-storage';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 20000,
  headers: { Accept: 'application/json' },
});

api.interceptors.request.use((config) => {
  const customerId = getCustomerId();
  if (customerId) {
    config.headers['X-Customer-Id'] = String(customerId);
  }
  config.headers['X-Store-Slug'] = import.meta.env.VITE_STORE_SLUG || 'jori-store';
  return config;
});

type ApiEnvelope<T> = { status?: boolean; message?: string; data?: T };

export function unwrap<T>(response: { data?: ApiEnvelope<T> }): T {
  const payload = response.data;
  if (payload?.status === false) throw new Error(payload.message || 'Request failed');
  return payload?.data as T;
}

export const STORE_SLUG = import.meta.env.VITE_STORE_SLUG || 'jori-store';

const storeHeaders = { headers: { 'X-Store-Slug': STORE_SLUG } };

export const storeApi = {
  info: () => api.get('/store', storeHeaders),
  smartSearch: (q: string, locale: string) =>
    api.get('/store/search/ai', { params: { q, locale }, ...storeHeaders }),
  categories: () => api.get('/store/categories', storeHeaders),
  promoBanners: () => api.get('/store/promo-banners', storeHeaders),
  products: (params?: Record<string, unknown>) => api.get('/store/products', { params, ...storeHeaders }),
  brands: () => api.get('/store/brands', storeHeaders),
  productFilters: (params?: Record<string, unknown>) => api.get('/store/product-filters', { params, ...storeHeaders }),
  product: (id: number) => api.get(`/store/products/${id}`, storeHeaders),
  shippingMethods: () => api.get('/store/shipping-methods', storeHeaders),
  deliveryRegions: () => api.get('/store/delivery-regions', storeHeaders),
  deliveryQuote: (params: { delivery_region_id: number; street?: string }) =>
    api.get('/store/delivery-quote', { params, ...storeHeaders }),
  legal: () => api.get('/store/legal', storeHeaders),
  gyms: (params?: Record<string, unknown>) => api.get('/store/gyms', { params, ...storeHeaders }),
  gym: (id: number) => api.get(`/store/gyms/${id}`, storeHeaders),
};

import type { CustomerAddress, CustomerProfile } from '../providers/customer-provider';

type Paginated<T> = { data: T[]; current_page?: number; last_page?: number; total?: number };

export const customerApi = {
  register: async (data: Record<string, unknown>) =>
    unwrap<CustomerProfile>(await api.post('/store/customer/register', data, storeHeaders)),
  login: async (phone: string) =>
    unwrap<CustomerProfile>(await api.post('/store/customer/login', { phone }, storeHeaders)),
  profile: async () => unwrap<CustomerProfile>(await api.get('/store/customer/profile', storeHeaders)),
  updateProfile: async (data: Record<string, unknown>) =>
    unwrap<CustomerProfile>(await api.put('/store/customer/profile', data, storeHeaders)),
  orders: async (page = 1) =>
    unwrap<Paginated<{ id: number; order_number: string; status: string; total: number; placed_at?: string }>>(
      await api.get('/store/customer/orders', { params: { page }, ...storeHeaders }),
    ),
  addAddress: async (data: Record<string, unknown>) =>
    unwrap<CustomerAddress>(await api.post('/store/customer/addresses', data, storeHeaders)),
  updateAddress: async (id: number, data: Record<string, unknown>) =>
    unwrap<CustomerAddress>(await api.put(`/store/customer/addresses/${id}`, data, storeHeaders)),
  deleteAddress: async (id: number) => unwrap<void>(await api.delete(`/store/customer/addresses/${id}`, storeHeaders)),
  placeOrder: async (data: Record<string, unknown>) =>
    unwrap<{ id: number; order_number: string; status: string; total: number }>(
      await api.post('/store/customer/orders', data, storeHeaders),
    ),
  notifications: async (page = 1) =>
    unwrap<{ data: Array<{ id: number; title: string; message: string; read_at?: string; created_at?: string }> }>(
      await api.get('/store/customer/notifications', { params: { page }, ...storeHeaders }),
    ),
  unreadCount: async () => unwrap<{ count: number }>(await api.get('/store/customer/notifications/unread-count', storeHeaders)),
  markNotificationRead: async (id: number) => unwrap<void>(await api.post(`/store/customer/notifications/${id}/read`, {}, storeHeaders)),
  markAllNotificationsRead: async () => unwrap<void>(await api.post('/store/customer/notifications/read-all', {}, storeHeaders)),
  pushVapidKey: async () => unwrap(await api.get('/store/push/vapid-key', storeHeaders)),
  pushSubscribe: async (body: Record<string, unknown>) =>
    unwrap(await api.post('/store/customer/push/subscribe', body, storeHeaders)),
  pushUnsubscribe: async (body: Record<string, unknown>) =>
    unwrap(await api.post('/store/customer/push/unsubscribe', body, storeHeaders)),
};
