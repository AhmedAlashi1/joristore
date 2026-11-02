/** Normalize API / cart image paths for storefront media URLs. */
export function normalizeProductImagePath(raw?: string | null): string | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/storage/')) return trimmed;
  if (trimmed.startsWith('storage/')) return `/${trimmed}`;
  if (trimmed.startsWith('/')) return trimmed;

  return `/storage/${trimmed.replace(/^\/+/, '')}`;
}

export function pickProductImage(data: {
  image?: string | null;
  images?: string[] | null;
}): string | null {
  const primary = normalizeProductImagePath(data.image);
  if (primary) return primary;
  const list = data.images ?? [];
  for (const row of list) {
    const normalized = normalizeProductImagePath(row);
    if (normalized) return normalized;
  }

  return null;
}
