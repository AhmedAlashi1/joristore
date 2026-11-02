import { backendPublicOrigin, isDashboardHost, isStorefrontHost, JORI_HOSTS } from './hosts';

/** @deprecated use backendPublicOrigin */
export const storagePublicOrigin = backendPublicOrigin;

/** Uploaded files live on the Laravel host (dashboard), not always on the storefront domain. */
function storageFileOrigin(): string {
  if (typeof window !== 'undefined' && isStorefrontHost(window.location.hostname)) {
    const fromEnv = import.meta.env.VITE_BACKEND_ORIGIN || import.meta.env.VITE_API_ORIGIN;
    if (fromEnv && String(fromEnv).trim()) {
      return String(fromEnv).trim().replace(/\/$/, '');
    }

    return JORI_HOSTS.dashboardOrigin;
  }

  return backendPublicOrigin();
}

function rewriteStorefrontStorageUrl(url: string): string {
  if (typeof window === 'undefined' || !isStorefrontHost(window.location.hostname)) {
    return url;
  }
  try {
    const parsed = new URL(url, window.location.origin);
    if (!parsed.pathname.startsWith('/storage/')) {
      return url;
    }
    if (isDashboardHost(parsed.hostname)) {
      return parsed.toString();
    }
    const dash = new URL(JORI_HOSTS.dashboardOrigin);
    parsed.protocol = dash.protocol;
    parsed.hostname = dash.hostname;
    parsed.port = dash.port;

    return parsed.toString();
  } catch {
    return url;
  }
}

export function absoluteStorageUrl(pathOrUrl?: string | null, cacheVersion?: string | number | null): string {
  if (!pathOrUrl) return '';
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return '';
  let url = '';
  if (/^https?:\/\//i.test(trimmed)) {
    url = rewriteStorefrontStorageUrl(trimmed);
  } else if (trimmed.startsWith('/storage/')) {
    url = `${storageFileOrigin()}${trimmed}`;
  } else if (trimmed.startsWith('/')) {
    url = trimmed;
  } else if (trimmed.startsWith('storage/')) {
    url = `${storageFileOrigin()}/${trimmed}`;
  } else {
    url = `/${trimmed.replace(/^\/+/, '')}`;
  }
  const version = cacheVersion != null && String(cacheVersion) !== '' ? String(cacheVersion) : '';
  if (!version) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}v=${encodeURIComponent(version)}`;
}
