import { backendPublicOrigin } from './hosts';

/** @deprecated use backendPublicOrigin */
export const storagePublicOrigin = backendPublicOrigin;

export function absoluteStorageUrl(pathOrUrl?: string | null, cacheVersion?: string | number | null): string {
  if (!pathOrUrl) return '';
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return '';
  let url = '';
  if (/^https?:\/\//i.test(trimmed)) {
    url = trimmed;
  } else if (trimmed.startsWith('/storage/')) {
    url = `${backendPublicOrigin()}${trimmed}`;
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
