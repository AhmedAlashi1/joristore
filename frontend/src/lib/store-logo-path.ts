import { api } from './api';
import { ensureApiSuccess } from './api-response';

export async function fetchStoreLogoPath(cached?: string | null): Promise<string | null> {
  const hit = cached?.trim();
  if (hit) return hit;

  try {
    const res = await api.get('/admin/settings/store');
    const data = ensureApiSuccess<{ store?: { logo?: string | null } }>(res, '');
    return data.store?.logo?.trim() || null;
  } catch {
    return null;
  }
}
