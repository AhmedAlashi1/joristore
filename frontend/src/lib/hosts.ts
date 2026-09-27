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

/** Laravel app URL (API + `/storage`). */
export function backendPublicOrigin(): string {
  const fromEnv = import.meta.env.VITE_BACKEND_ORIGIN || import.meta.env.VITE_API_ORIGIN;
  if (fromEnv && String(fromEnv).trim()) {
    return String(fromEnv).replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    if (isStorefrontHost(window.location.hostname)) {
      return JORI_HOSTS.dashboardOrigin;
    }
    return window.location.origin;
  }

  return JORI_HOSTS.dashboardOrigin;
}

/** Axios base URL (`…/api`). */
export function resolveApiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_BASE_URL;
  if (fromEnv && String(fromEnv).trim()) {
    return String(fromEnv).replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    if (isStorefrontHost(window.location.hostname)) {
      return `${JORI_HOSTS.dashboardOrigin}/api`;
    }
    if (isDashboardHost(window.location.hostname)) {
      return `${window.location.origin}/api`;
    }
  }

  return '/api';
}
