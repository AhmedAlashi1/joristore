import { STORE_SLUG } from './api';

function cacheKey(key: string) {
  return `jori-cache:${STORE_SLUG}:${key}`;
}

export function readStoreCache<T>(key: string): T | null {
  for (const storage of [sessionStorage, localStorage]) {
    try {
      const raw = storage.getItem(cacheKey(key));
      if (!raw) continue;
      return JSON.parse(raw) as T;
    } catch {
      /* ignore */
    }
  }
  return null;
}

export function writeStoreCache(key: string, value: unknown) {
  const raw = JSON.stringify(value);
  try {
    sessionStorage.setItem(cacheKey(key), raw);
  } catch {
    /* ignore */
  }
  try {
    localStorage.setItem(cacheKey(key), raw);
  } catch {
    /* ignore */
  }
}
