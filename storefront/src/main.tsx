import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { SplashGate } from './components/splash/SplashGate';
import { CartProvider } from './providers/cart-provider';
import { CustomerProvider } from './providers/customer-provider';
import { InstallProvider } from './providers/install-provider';
import { LocaleProvider } from './providers/locale-provider';
import { NotificationProvider } from './providers/notification-provider';
import { StoreBrandProvider } from './providers/store-brand-provider';
import { WishlistProvider } from './providers/wishlist-provider';
import './index.css';

registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreBrandProvider>
      <SplashGate>
        <InstallProvider>
          <LocaleProvider>
            <WishlistProvider>
              <CustomerProvider>
                <NotificationProvider>
                  <CartProvider>
                    <BrowserRouter>
                      <App />
                    </BrowserRouter>
                  </CartProvider>
                </NotificationProvider>
              </CustomerProvider>
            </WishlistProvider>
          </LocaleProvider>
        </InstallProvider>
      </SplashGate>
    </StoreBrandProvider>
  </StrictMode>,
);
