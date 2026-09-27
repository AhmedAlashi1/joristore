import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import UnifiedApp from './UnifiedApp';
import { purgeStaleAppCachesIfNeeded } from './store/lib/app-cache-purge';
import { bootstrapStoreBrandFromCache, ensureStoreBrandBootstrapped } from './store/lib/store-brand';

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.__deferredInstallPrompt = e;
});

function mountApp() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <UnifiedApp />
      </BrowserRouter>
    </StrictMode>,
  );
}

function bootAfterCacheCheck() {
  registerSW({ immediate: true });

  const isStoreEntry = !window.location.pathname.startsWith('/admin');

  if (isStoreEntry) {
    bootstrapStoreBrandFromCache();
    void ensureStoreBrandBootstrapped();
  } else {
    document.getElementById('pre-splash')?.remove();
  }

  mountApp();
}

void (async () => {
  const isAdmin = window.location.pathname.startsWith('/admin');
  if (!isAdmin) {
    const reloading = await purgeStaleAppCachesIfNeeded();
    if (reloading) return;
  }
  bootAfterCacheCheck();
})();
