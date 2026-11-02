import { backendPublicOrigin, isStorefrontHost } from './hosts';

/** @deprecated use backendPublicOrigin */
export const storagePublicOrigin = backendPublicOrigin;

/**
 * Storefront: same-origin `/storage` (public_html/storage → joristore/storage/app/public).
 * Dashboard / admin: Laravel public origin.
 */
function storageFileOrigin(): string {
  if (typeof window !== 'undefined' && isStorefrontHost(window.location.hostname)) {
    return window.location.origin.replace(/\/$/, '');
  }

  return backendPublicOrigin();
}

function normalizeStoragePath(trimmed: string): string {
  if (trimmed.startsWith('/storage/')) {
    return trimmed;
  }
  if (trimmed.startsWith('storage/')) {
    return `/${trimmed}`;
  }

  return `/storage/${trimmed.replace(/^\/+/, '')}`;
}

/** Rewrite baked dashboard storage URLs to storefront origin when shop runs on sportsworldps.com. */
function rewriteStorageUrlForStorefront(url: string): string {
  if (typeof window === 'undefined' || !isStorefrontHost(window.location.hostname)) {
    return url;
  }
  try {
    const parsed = new URL(url);
    if (!parsed.pathname.startsWith('/storage/')) {
      return url;
    }
    const origin = window.location.origin.replace(/\/$/, '');

    return `${origin}${parsed.pathname}${parsed.search}`;
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
    url = rewriteStorageUrlForStorefront(trimmed);
  } else if (trimmed.startsWith('/storage/') || trimmed.startsWith('storage/')) {
    url = `${storageFileOrigin()}${normalizeStoragePath(trimmed)}`;
  } else if (trimmed.startsWith('/')) {
    url = trimmed;
  } else {
    url = `/${trimmed.replace(/^\/+/, '')}`;
  }
  const version = cacheVersion != null && String(cacheVersion) !== '' ? String(cacheVersion) : '';
  if (!version) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}v=${encodeURIComponent(version)}`;
}
