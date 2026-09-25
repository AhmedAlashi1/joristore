import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import UnifiedApp from './UnifiedApp';
import { bootstrapStoreBrandFromCache } from './store/lib/store-brand';

bootstrapStoreBrandFromCache();
document.getElementById('boot-splash')?.remove();

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.__deferredInstallPrompt = e;
});

if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => void r.unregister());
  });
}

registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <UnifiedApp />
    </BrowserRouter>
  </StrictMode>,
);
