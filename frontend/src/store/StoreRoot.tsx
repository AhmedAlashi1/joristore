import type { ReactNode } from 'react';
import { cn } from './lib/utils';
import { SplashGate } from './components/splash/SplashGate';
import { CartProvider } from './providers/cart-provider';
import { CustomerProvider } from './providers/customer-provider';
import { InstallProvider } from './providers/install-provider';
import { LocaleProvider } from './providers/locale-provider';
import { NotificationProvider } from './providers/notification-provider';
import { StoreBrandProvider, useStoreBrand } from './providers/store-brand-provider';
import { AppearanceProvider, useAppearance } from './providers/appearance-provider';
import { WishlistProvider } from './providers/wishlist-provider';
import StoreApp from './StoreApp';
import './index.css';

function StoreShell({ children }: { children: ReactNode }) {
  const { isDark } = useAppearance();
  return (
    <div className={cn('store-app min-h-full', isDark && 'dark')}>
      {children}
    </div>
  );
}

function StoreProviders() {
  const { theme } = useStoreBrand();

  return (
    <AppearanceProvider brandTheme={theme}>
      <StoreShell>
        <SplashGate>
          <InstallProvider>
            <LocaleProvider>
              <WishlistProvider>
                <CustomerProvider>
                  <NotificationProvider>
                    <CartProvider>
                      <StoreApp />
                    </CartProvider>
                  </NotificationProvider>
                </CustomerProvider>
              </WishlistProvider>
            </LocaleProvider>
          </InstallProvider>
        </SplashGate>
      </StoreShell>
    </AppearanceProvider>
  );
}

export function StoreRoot() {
  return (
    <StoreBrandProvider>
      <StoreProviders />
    </StoreBrandProvider>
  );
}
