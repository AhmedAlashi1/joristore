/** Production host layout (cPanel). */
export const JORI_HOSTS = {
  store: 'joristore.com',
  storeWww: 'www.joristore.com',
  dashboardOrigin: 'https://dashboard.joristore.com',
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
      return JORI_HOSTS.dashboardOrigin;
    }
    return window.location.origin;
  }

  return JORI_HOSTS.dashboardOrigin;
}

/** Axios `baseURL` — always ends with `/api` (no trailing slash). */
export function resolveApiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_BASE_URL;
  if (fromEnv && String(fromEnv).trim()) {
    const envVal = String(fromEnv).trim().replace(/\/$/, '');
    // Dev proxy path must not ship in production builds (store would call joristore.com/api).
    if (!(envVal === '/api' && !import.meta.env.DEV)) {
      return normalizeApiBaseUrl(envVal);
    }
  }

  if (import.meta.env.DEV) {
    return '/api';
  }

  const prefix = apiPathPrefix();
  const origin = isStorefrontHost(typeof window !== 'undefined' ? window.location.hostname : '')
    ? JORI_HOSTS.dashboardOrigin
    : typeof window !== 'undefined'
      ? window.location.origin
      : JORI_HOSTS.dashboardOrigin;

  return `${origin}${prefix}/api`;
}
