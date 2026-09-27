export const SPLASH_DONE_EVENT = 'jori-splash-done';

declare global {
  interface Window {
    __joriSplashDone?: boolean;
    __deferredInstallPrompt?: Event | null;
  }
}

export function dismissPreSplash() {
  document.getElementById('pre-splash')?.remove();
}

export function dispatchSplashDone() {
  if (window.__joriSplashDone) return;
  window.__joriSplashDone = true;
  window.dispatchEvent(new CustomEvent(SPLASH_DONE_EVENT));
}
