import axios from 'axios';
import { resolveApiBaseUrl } from '../../lib/hosts';
import { getCustomerId } from './customer-storage';

export const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 35000,
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

/** Readable message from axios / API envelope (Arabic-friendly server messages pass through). */
export function apiErrorMessage(error: unknown, ar: boolean): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as ApiEnvelope<unknown> | undefined;
    if (body?.message && typeof body.message === 'string') {
      return body.message;
    }
    const status = error.response?.status;
    if (status === 503) {
      return ar
        ? 'جداول المحفظة غير موجودة على السيرفر. نفّذ: php artisan migrate --force'
        : 'Wallet tables missing on server. Run: php artisan migrate --force';
    }
    if (status === 500) {
      return ar
        ? 'خطأ في السيرفر. ارفع آخر نسخة من الـ API ثم نفّذ migrate على الاستضافة.'
        : 'Server error. Deploy latest API code, then run migrate on hosting.';
    }
    if (error.code === 'ECONNABORTED' || error.message.toLowerCase().includes('timeout')) {
      return ar ? 'انتهت مهلة الاتصال. تحقق من الإنترنت وحاول مجدداً.' : 'Connection timed out. Check network and retry.';
    }
  }
  return error instanceof Error ? error.message : ar ? 'فشل الطلب' : 'Request failed';
}

export const STORE_SLUG = import.meta.env.VITE_STORE_SLUG || 'jori-store';

const storeHeaders = { headers: { 'X-Store-Slug': STORE_SLUG } };

export const storeApi = {
  info: () => api.get('/store', storeHeaders),
  smartSearch: (q: string, locale: string) =>
    api.get('/store/search/ai', { params: { q, locale }, ...storeHeaders }),
  categories: () => api.get('/store/categories', storeHeaders),
  promoBanners: (cacheBust?: number) =>
    api.get('/store/promo-banners', {
      params: cacheBust ? { _v: cacheBust } : undefined,
      ...storeHeaders,
    }),
  products: (params?: Record<string, unknown>) => api.get('/store/products', { params, ...storeHeaders }),
  brands: () => api.get('/store/brands', storeHeaders),
  productFilters: (params?: Record<string, unknown>) => api.get('/store/product-filters', { params, ...storeHeaders }),
  product: (id: number) => api.get(`/store/products/${id}`, storeHeaders),
  shippingMethods: () => api.get('/store/shipping-methods', storeHeaders),
  deliveryRegions: () => api.get('/store/delivery-regions', storeHeaders),
  deliveryQuote: (params: { delivery_region_id: number; street?: string }) =>
    api.get('/store/delivery-quote', { params, ...storeHeaders }),
  legal: () => api.get('/store/legal', storeHeaders),
  paymentMethods: () => api.get('/store/payment-methods', storeHeaders),
  gyms: (params?: Record<string, unknown>) => api.get('/store/gyms', { params, ...storeHeaders }),
  gym: (id: number) => api.get(`/store/gyms/${id}`, storeHeaders),
};

import type { CustomerAddress, CustomerProfile } from '../providers/customer-provider';

type Paginated<T> = { data: T[]; current_page?: number; last_page?: number; total?: number };

/** Laravel paginator inside API envelope — tolerate single or double `data` nesting. */
export function extractPaginatedRows<T>(page: Paginated<T> | T[] | null | undefined): T[] {
  if (!page) return [];
  if (Array.isArray(page)) return page;
  const inner = page.data;
  if (Array.isArray(inner)) return inner;
  if (inner && typeof inner === 'object' && Array.isArray((inner as Paginated<T>).data)) {
    return (inner as Paginated<T>).data;
  }
  return [];
}

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
  order: async (id: number) =>
    unwrap<{
      id: number;
      order_number: string;
      status: string;
      payment_status: string;
      shipping_status: string;
      subtotal: number;
      shipping: number;
      total: number;
      placed_at?: string;
      items: Array<{
        id: number;
        product_name: string;
        variant_name?: string;
        quantity: number;
        unit_price: number;
        total: number;
      }>;
      tracking_steps: Array<{ status: string; note?: string | null; at?: string }>;
    }>(await api.get(`/store/customer/orders/${id}`, storeHeaders)),
  addAddress: async (data: Record<string, unknown>) =>
    unwrap<CustomerAddress>(await api.post('/store/customer/addresses', data, storeHeaders)),
  updateAddress: async (id: number, data: Record<string, unknown>) =>
    unwrap<CustomerAddress>(await api.put(`/store/customer/addresses/${id}`, data, storeHeaders)),
  deleteAddress: async (id: number) => unwrap<void>(await api.delete(`/store/customer/addresses/${id}`, storeHeaders)),
  placeOrder: async (data: Record<string, unknown>) =>
    unwrap<{ id: number; order_number: string; status: string; total: number }>(
      await api.post('/store/customer/orders', data, storeHeaders),
    ),
  walletFeed: async (signal?: AbortSignal) =>
    unwrap<{
      overview: { balance: number; pending_top_up: number; pending_withdrawal: number };
      transactions: Array<{
        id: number;
        type: 'credit' | 'debit';
        amount: number;
        balance_after: number;
        label_ar: string;
        label_en: string;
        note?: string | null;
        created_at?: string;
      }>;
      requests: Array<{
        id: number;
        type: 'top_up' | 'withdrawal';
        amount: number;
        status: string;
        customer_note?: string | null;
        admin_note?: string | null;
        created_at?: string;
        processed_at?: string | null;
      }>;
    }>(await api.get('/store/customer/wallet/feed', { ...storeHeaders, signal })),
  walletOverview: async () =>
    unwrap<{ balance: number; pending_top_up: number; pending_withdrawal: number }>(
      await api.get('/store/customer/wallet/overview', storeHeaders),
    ),
  walletTransactions: async (page = 1) =>
    unwrap<Paginated<{
      id: number;
      type: 'credit' | 'debit';
      amount: number;
      balance_after: number;
      label_ar: string;
      label_en: string;
      note?: string | null;
      created_at?: string;
    }>>(await api.get('/store/customer/wallet/transactions', { params: { page }, ...storeHeaders })),
  walletRequests: async (page = 1) =>
    unwrap<Paginated<{
      id: number;
      type: 'top_up' | 'withdrawal';
      amount: number;
      status: string;
      customer_note?: string | null;
      admin_note?: string | null;
      created_at?: string;
      processed_at?: string | null;
    }>>(await api.get('/store/customer/wallet/requests', { params: { page }, ...storeHeaders })),
  walletTopUp: async (data: {
    amount: number;
    payment_method: string;
    transfer_reference?: string;
    account_holder_name?: string;
    receipt_path?: string;
    note?: string;
  }) =>
    unwrap(await api.post('/store/customer/wallet/top-up', data, storeHeaders)),
  syncCart: async (items: unknown[]) =>
    unwrap(await api.put('/store/customer/cart', { items }, { ...storeHeaders, timeout: 8000 })),
  walletWithdraw: async (data: {
    amount: number;
    payment_method: string;
    transfer_reference: string;
    account_holder_name: string;
    note?: string;
  }) =>
    unwrap(await api.post('/store/customer/wallet/withdraw', data, storeHeaders)),
  validateCoupon: async (data: { code: string; subtotal: number; shipping: number }) =>
    unwrap<{
      code: string;
      name: string;
      type: string;
      applies_to: 'subtotal' | 'shipping';
      subtotal_discount: number;
      shipping: number;
      savings: number;
    }>(await api.post('/store/customer/coupons/validate', data, storeHeaders)),
  uploadPaymentReceipt: async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return unwrap<{ path: string; url: string }>(
      await api.post('/store/customer/media/payment-receipt', form, {
        ...storeHeaders,
        headers: { ...storeHeaders.headers, 'Content-Type': 'multipart/form-data' },
      }),
    );
  },
  notifications: async (page = 1, locale: 'ar' | 'en' = 'ar') =>
    unwrap<Paginated<{ id: number; title: string; message: string; type?: string; data?: Record<string, unknown>; read_at?: string | null; created_at?: string }>>(
      await api.get('/store/customer/notifications', { params: { page, locale }, ...storeHeaders }),
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
