import { isDashboardHost } from './hosts';

const STORAGE_KEY = 'jori-dashboard-pwa-cleared-v2';

/** Old PWA service workers on dashboard host break admin API calls after a few minutes. */
export async function clearDashboardPwaOnce(): Promise<void> {
  if (!import.meta.env.PROD || typeof window === 'undefined') {
    return;
  }
  if (!isDashboardHost(window.location.hostname)) {
    return;
  }
  if (localStorage.getItem(STORAGE_KEY) === '1') {
    return;
  }

  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // ignore — admin should still load
  }
}
