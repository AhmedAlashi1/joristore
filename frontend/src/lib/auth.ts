const TOKEN_KEY = 'unitill_admin_token';
const ADMIN_KEY = 'unitill_admin_info';

export function setAuthToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export type MerchantInfo = {
  id: number;
  business_name: string;
  slug: string;
  logo?: string | null;
  currency: string;
};

export type StoreInfo = {
  id: number;
  name: string;
  slug: string;
};

export type AdminAuthInfo = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  avatar?: string | null;
  role?: string;
  role_name?: string;
  is_owner?: boolean;
  merchant?: MerchantInfo | null;
  store?: StoreInfo | null;
  permissions: string[];
  /** @deprecated use role / permissions */
  roles?: string[];
};

export function setAdminAuthInfo(admin: AdminAuthInfo) {
  localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
}

export function getAdminAuthInfo(): AdminAuthInfo | null {
  const raw = localStorage.getItem(ADMIN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminAuthInfo;
  } catch {
    return null;
  }
}

export function hasPermission(permission: string) {
  const info = getAdminAuthInfo();
  if (!info) return false;
  if (info.is_owner) return true;
  return Array.isArray(info.permissions) && info.permissions.includes(permission);
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ADMIN_KEY);
}

export function isAuthenticated() {
  return Boolean(getAuthToken());
}
