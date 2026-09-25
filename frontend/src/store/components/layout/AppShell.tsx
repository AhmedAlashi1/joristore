import { Heart, Home, Package, ShoppingCart, User } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { AppHeader } from './AppHeader';
import { OpenInAppBar } from '../install/OpenInAppBar';
import { useInstall } from '../../providers/install-provider';
import { InstallBanner } from '../install/InstallBanner';
import { InstallGuideModal } from '../install/InstallGuideModal';
import { useCart } from '../../providers/cart-provider';
import { useWishlist } from '../../providers/wishlist-provider';
import { useLocale } from '../../providers/locale-provider';
import { cn } from '../../lib/utils';

const tabs = [
  { to: '/', icon: Home, labelKey: 'home' as const, end: true },
  { to: '/orders', icon: Package, labelKey: 'orders' as const },
  { to: '/wishlist', icon: Heart, labelKey: 'wishlist' as const },
  { to: '/cart', icon: ShoppingCart, labelKey: 'cart' as const },
  { to: '/account', icon: User, labelKey: 'account' as const },
];

export function AppShell() {
  const { t } = useLocale();
  const { count } = useCart();
  const { count: wishCount } = useWishlist();
  const location = useLocation();
  const { iconVisible, installed } = useInstall();
  const showOpenInApp = iconVisible && !installed;

  return (
    <div className={cn('app-shell', showOpenInApp && 'has-open-in-app')}>
      <div className="app-bg" aria-hidden>
        <div className="app-bg-orb app-bg-orb-1" />
        <div className="app-bg-orb app-bg-orb-2" />
      </div>

      <OpenInAppBar />
      <AppHeader />

      <main className="relative z-10 px-4 pt-[calc(var(--header-h)+var(--safe-top)+var(--open-app-h)+20px)]">
        <div key={location.pathname} className="page-enter">
          <Outlet />
        </div>
      </main>

      <InstallGuideModal />
      <InstallBanner />

      <div className="bottom-nav-dock fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[480px] px-3" style={{ paddingBottom: 'calc(6px + var(--safe-bottom))' }}>
        <nav className="bottom-nav glass-strong flex items-stretch justify-around rounded-[28px] px-1 py-1.5">
          {tabs.map(({ to, icon: Icon, labelKey, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'bottom-nav-item relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-[22px] py-2 transition-all duration-300',
                  isActive ? 'bottom-nav-item-active' : 'text-store-muted',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive ? <span className="bottom-nav-pill" aria-hidden /> : null}
                  <span className={cn('relative z-10', isActive && 'bottom-nav-icon-active')}>
                    <Icon size={21} strokeWidth={isActive ? 2.5 : 2} />
                    {labelKey === 'cart' && count > 0 ? (
                      <span className="absolute -end-2.5 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--primary)] px-1 text-[9px] font-bold text-white shadow-md">
                        {count > 9 ? '9+' : count}
                      </span>
                    ) : null}
                    {labelKey === 'wishlist' && wishCount > 0 ? (
                      <span className="absolute -end-2.5 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#ea5455] px-1 text-[9px] font-bold text-white shadow-md">
                        {wishCount > 9 ? '9+' : wishCount}
                      </span>
                    ) : null}
                  </span>
                  <span className={cn('relative z-10 text-[9px] font-bold tracking-wide', isActive && 'text-[var(--primary)]')}>
                    {t[labelKey]}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
