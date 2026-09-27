import { STORE_BRAND_CACHE_KEY } from './store-brand';

/** Bump when old SW / localStorage causes hangs or stale UI after deploy. */
export const APP_CACHE_REVISION = '2026-09-27-v7';

const REVISION_KEY = 'jori-app-cache-revision';
const RELOAD_FLAG = 'jori-cache-purge-reloaded';

const LOGO_DATA_KEY = 'jori-store-logo-data';
const LOGO_FOR_KEY = 'jori-store-logo-for';

function removeStorageByPrefix(storage: Storage, prefix: string) {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key?.startsWith(prefix)) keys.push(key);
  }
  keys.forEach((key) => storage.removeItem(key));
}

export async function purgeStaleAppCachesIfNeeded(): Promise<boolean> {
  try {
    const prev = localStorage.getItem(REVISION_KEY);
    if (prev === APP_CACHE_REVISION) return false;

    localStorage.removeItem(STORE_BRAND_CACHE_KEY);
    localStorage.removeItem(LOGO_DATA_KEY);
    localStorage.removeItem(LOGO_FOR_KEY);
    removeStorageByPrefix(localStorage, 'jori-cache:');
    removeStorageByPrefix(sessionStorage, 'jori-cache:');

    localStorage.setItem(REVISION_KEY, APP_CACHE_REVISION);

    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
    }

    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));
    }

    if (sessionStorage.getItem(RELOAD_FLAG) !== APP_CACHE_REVISION) {
      sessionStorage.setItem(RELOAD_FLAG, APP_CACHE_REVISION);
      window.location.reload();
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/** Manual clear from settings (keeps customer login + cart). */
export async function clearStorefrontCaches(): Promise<void> {
  localStorage.removeItem(STORE_BRAND_CACHE_KEY);
  localStorage.removeItem(LOGO_DATA_KEY);
  localStorage.removeItem(LOGO_FOR_KEY);
  removeStorageByPrefix(localStorage, 'jori-cache:');
  removeStorageByPrefix(sessionStorage, 'jori-cache:');

  if ('caches' in window) {
    const names = await caches.keys();
    await Promise.all(names.map((name) => caches.delete(name)));
  }

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((reg) => reg.unregister()));
  }
}
