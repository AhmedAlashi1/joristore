import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import UnifiedApp from './UnifiedApp';
import { purgeStaleAppCachesIfNeeded } from './store/lib/app-cache-purge';
import { isStorefrontHost, JORI_HOSTS } from './lib/hosts';
import { bootstrapStoreBrandFromCache, ensureStoreBrandBootstrapped } from './store/lib/store-brand';

/** Admin lives on dashboard; storefront SPA may still ship on joristore.com. */
function redirectAdminOffStorefront() {
  if (!import.meta.env.PROD) return;
  const { hostname, pathname, search, hash } = window.location;
  if (!isStorefrontHost(hostname) || !pathname.startsWith('/admin')) return;
  window.location.replace(`${JORI_HOSTS.dashboardOrigin}${pathname}${search}${hash}`);
}

redirectAdminOffStorefront();

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
