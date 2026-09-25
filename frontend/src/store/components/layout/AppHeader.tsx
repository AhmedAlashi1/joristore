import { Bell, Download, Search } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SmartSearchOverlay } from '../search/SmartSearchOverlay';
import { useInstall } from '../../providers/install-provider';
import { useNotifications } from '../../providers/notification-provider';
import { useLocale } from '../../providers/locale-provider';
import { useStoreBrand } from '../../providers/store-brand-provider';
import { cn } from '../../lib/utils';

export function AppHeader() {
  const { t } = useLocale();
  const { unreadCount } = useNotifications();
  const { iconVisible: installVisible, openGuide } = useInstall();
  const { name: storeName, logo } = useStoreBrand();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <header className="app-header fixed inset-x-0 top-0 z-40 mx-auto max-w-[480px] px-4 pt-[calc(6px+var(--safe-top))]">
        <div className="glass-strong flex items-center justify-between gap-2 rounded-2xl px-3 py-2.5 shadow-sm">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <img src={logo} alt="" className="h-9 w-9 shrink-0 rounded-xl object-cover" />
            <div className="min-w-0">
              <p className="text-store-muted truncate text-[10px]">{t.welcome}</p>
              <p className="truncate text-sm font-bold text-[var(--fg)]">{storeName}</p>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={() => setSearchOpen(true)} className="header-icon-btn" aria-label={t.smartSearch}>
              <Search size={18} />
            </button>

            <Link
              to="/notifications"
              className={cn('header-icon-btn relative', location.pathname === '/notifications' && 'header-icon-btn-active')}
              aria-label={t.notifications}
            >
              <Bell size={18} />
              {unreadCount > 0 ? (
                <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ea5455] px-0.5 text-[8px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              ) : null}
            </Link>

            {installVisible ? (
              <button type="button" onClick={openGuide} className="header-icon-btn header-icon-install" aria-label={t.installButton}>
                <Download size={18} />
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <SmartSearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
