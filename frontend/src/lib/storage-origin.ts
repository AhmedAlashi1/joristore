import { backendPublicOrigin } from './hosts';

/** @deprecated use backendPublicOrigin */
export const storagePublicOrigin = backendPublicOrigin;

export function absoluteStorageUrl(pathOrUrl?: string | null): string {
  if (!pathOrUrl) return '';
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/storage/')) {
    return `${backendPublicOrigin()}${trimmed}`;
  }
  if (trimmed.startsWith('/')) return trimmed;
  return `/${trimmed.replace(/^\/+/, '')}`;
}
