/** Production host layout (cPanel). */
export const JORI_HOSTS = {
  store: 'sportsworldps.com',
  storeWww: 'www.sportsworldps.com',
  dashboardOrigin: 'https://dashboard.sportsworldps.com',
} as const;

export function isStorefrontHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === JORI_HOSTS.store || h === JORI_HOSTS.storeWww;
}

export function isDashboardHost(hostname: string): boolean {
  return hostname.toLowerCase() === new URL(JORI_HOSTS.dashboardOrigin).hostname;
}

function envBackendOrigin(): string | null {
  const v = import.meta.env.VITE_BACKEND_ORIGIN || import.meta.env.VITE_API_ORIGIN;
  return v && String(v).trim() ? String(v).replace(/\/$/, '') : null;
}

/** Set `VITE_STORE_CROSS_ORIGIN_API=1` to call dashboard host (needs valid dashboard SSL). */
function storefrontUsesSameOriginApi(): boolean {
  const flag = import.meta.env.VITE_STORE_CROSS_ORIGIN_API;
  if (flag === 'true' || flag === '1') return false;
  return true;
}

function dashboardHostname(): string {
  const raw = envBackendOrigin() ?? JORI_HOSTS.dashboardOrigin;
  try {
    return new URL(raw.includes('://') ? raw : `https://${raw}`).hostname;
  } catch {
    return new URL(JORI_HOSTS.dashboardOrigin).hostname;
  }
}

/** API/storage origin for the storefront tab (same host as the shop when possible). */
function storefrontPublicOrigin(): string {
  if (typeof window === 'undefined') {
    return JORI_HOSTS.dashboardOrigin;
  }
  if (storefrontUsesSameOriginApi()) {
    return window.location.origin.replace(/\/$/, '');
  }
  const proto = window.location.protocol;
  return `${proto}//${dashboardHostname()}`;
}

/** LiteSpeed/cPanel: `/api` 404 until rewrite fixed — use `/index.php/api`. */
function useIndexPhpApi(): boolean {
  const flag = import.meta.env.VITE_LARAVEL_INDEX_PHP;
  if (flag === 'true' || flag === '1') return true;
  if (flag === 'false' || flag === '0') return false;
  if (import.meta.env.DEV) return false;
  return true;
}

function apiPathPrefix(): string {
  return useIndexPhpApi() ? '/index.php' : '';
}

/** Fix baked `.env` like `https://dashboard…/api` (LiteSpeed 404 without `index.php`). */
function normalizeApiBaseUrl(raw: string): string {
  const url = raw.trim().replace(/\/$/, '');
  if (!useIndexPhpApi()) return url;

  const dash = JORI_HOSTS.dashboardOrigin;
  if (url === `${dash}/api` || url.startsWith(`${dash}/api/`)) {
    return url.replace(`${dash}/api`, `${dash}/index.php/api`);
  }
  return url;
}

/** Laravel app URL (API + `/storage`). */
export function backendPublicOrigin(): string {
  const fromEnv = envBackendOrigin();
  if (fromEnv) return fromEnv;

  if (typeof window !== 'undefined') {
    if (isStorefrontHost(window.location.hostname)) {
      return storefrontPublicOrigin();
    }
    return window.location.origin;
  }

  return JORI_HOSTS.dashboardOrigin;
}

/** Axios `baseURL` — always ends with `/api` (no trailing slash). */
export function resolveApiBaseUrl(): string {
  if (import.meta.env.DEV) {
    return '/api';
  }

  const prefix = apiPathPrefix();

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // Admin on dashboard host: always same origin (fixes http/https + stale baked VITE_* URLs).
    if (isDashboardHost(host)) {
      return `${window.location.origin.replace(/\/$/, '')}${prefix}/api`;
    }
    if (isStorefrontHost(host)) {
      return `${storefrontPublicOrigin()}${prefix}/api`;
    }
    return `${window.location.origin.replace(/\/$/, '')}${prefix}/api`;
  }

  const fromEnv = import.meta.env.VITE_API_BASE_URL;
  if (fromEnv && String(fromEnv).trim()) {
    const envVal = String(fromEnv).trim().replace(/\/$/, '');
    if (envVal !== '/api') {
      return normalizeApiBaseUrl(envVal);
    }
  }

  return `${JORI_HOSTS.dashboardOrigin}${prefix}/api`;
}
