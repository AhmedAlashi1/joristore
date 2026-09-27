/** Laravel public disk — on production files are served from the dashboard host. */
const DASHBOARD_STORAGE_ORIGIN = 'https://dashboard.joristore.com';

/** Origin for `/storage/*` URLs (uploads, logos, product images). */
export function storagePublicOrigin(): string {
  const fromEnv = import.meta.env.VITE_BACKEND_ORIGIN || import.meta.env.VITE_API_ORIGIN;
  if (fromEnv && String(fromEnv).trim()) {
    return String(fromEnv).replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    if (host === 'joristore.com' || host === 'www.joristore.com') {
      return DASHBOARD_STORAGE_ORIGIN;
    }
    return window.location.origin;
  }

  return DASHBOARD_STORAGE_ORIGIN;
}

export function absoluteStorageUrl(pathOrUrl?: string | null): string {
  if (!pathOrUrl) return '';
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/storage/')) {
    return `${storagePublicOrigin()}${trimmed}`;
  }
  if (trimmed.startsWith('/')) return trimmed;
  return `/${trimmed.replace(/^\/+/, '')}`;
}
