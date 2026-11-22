import { backendPublicOrigin, isStorefrontHost, laravelPublicPathPrefix } from './hosts';

/** @deprecated use backendPublicOrigin */
export const storagePublicOrigin = backendPublicOrigin;

/** Store docroot on LiteSpeed: `/storage` → SPA HTML; `/index.php/storage` serves files. */
function storefrontStoragePrefix(): string {
  if (import.meta.env.DEV) return '';
  if (typeof window !== 'undefined' && isStorefrontHost(window.location.hostname)) {
    return laravelPublicPathPrefix();
  }
  return '';
}

function attachStoragePrefix(pathname: string): string {
  if (!pathname.startsWith('/storage/')) return pathname;
  if (pathname.startsWith('/index.php/storage/')) return pathname;
  const prefix = storefrontStoragePrefix();
  return prefix ? `${prefix}${pathname}` : pathname;
}

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
    const path = attachStoragePrefix(parsed.pathname);

    return `${origin}${path}${parsed.search}`;
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
    const path = attachStoragePrefix(normalizeStoragePath(trimmed));
    url = `${storageFileOrigin()}${path}`;
  } else if (trimmed.startsWith('/')) {
    url = trimmed.startsWith('/storage/')
      ? `${storageFileOrigin()}${attachStoragePrefix(trimmed)}`
      : trimmed;
  } else {
    const path = attachStoragePrefix(normalizeStoragePath(trimmed));
    url = `${storageFileOrigin()}${path}`;
  }
  const version = cacheVersion != null && String(cacheVersion) !== '' ? String(cacheVersion) : '';
  if (!version) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}v=${encodeURIComponent(version)}`;
}
