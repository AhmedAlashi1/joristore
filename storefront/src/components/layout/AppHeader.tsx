import { Bell, Download, Heart, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useInstall } from '../../providers/install-provider';
import { useNotifications } from '../../providers/notification-provider';
import { useLocale } from '../../providers/locale-provider';
import { useStoreBrand } from '../../providers/store-brand-provider';
import { useWishlist } from '../../providers/wishlist-provider';
import { cn } from '../../lib/utils';

export function AppHeader() {
  const { t } = useLocale();
  const { count: wishCount } = useWishlist();
  const { unreadCount } = useNotifications();
  const { iconVisible: installVisible, openGuide } = useInstall();
  const { name: storeName, logo } = useStoreBrand();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const urlSearch = params.get('search') || '';

  useEffect(() => {
    if (location.pathname === '/shop') setQuery(urlSearch);
  }, [location.pathname, urlSearch]);

  useEffect(() => {
    if (searchOpen) {
      setQuery(location.pathname === '/shop' ? urlSearch : '');
      window.setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [searchOpen, location.pathname, urlSearch]);

  const submitSearch = () => {
    const q = query.trim();
    setSearchOpen(false);
    if (location.pathname !== '/shop') {
      navigate(q ? `/shop?search=${encodeURIComponent(q)}` : '/shop');
      return;
    }
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (q) next.set('search', q);
      else next.delete('search');
      return next;
    }, { replace: true });
  };

  return (
    <>
      <header className="app-header fixed inset-x-0 top-0 z-40 mx-auto max-w-[480px] px-4 pt-[calc(6px+var(--safe-top))]">
        <div className="glass-strong flex items-center justify-between gap-2 rounded-2xl px-3 py-2.5 shadow-sm">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <img src={logo} alt="" className="h-9 w-9 shrink-0 rounded-xl object-cover" />
            <div className="min-w-0">
              <p className="truncate text-[10px] text-[#8a8da8]">{t.welcome}</p>
              <p className="truncate text-sm font-bold">{storeName}</p>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={() => setSearchOpen(true)} className="header-icon-btn" aria-label={t.search}>
              <Search size={18} />
            </button>

            <Link to="/notifications" className={cn('header-icon-btn relative', location.pathname === '/notifications' && 'header-icon-btn-active')} aria-label={t.notifications}>
              <Bell size={18} />
              {unreadCount > 0 ? (
                <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ea5455] px-0.5 text-[8px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              ) : null}
            </Link>

            <Link to="/wishlist" className={cn('header-icon-btn relative', location.pathname === '/wishlist' && 'header-icon-btn-active')} aria-label={t.wishlist}>
              <Heart size={18} fill={wishCount > 0 ? 'currentColor' : 'none'} />
              {wishCount > 0 ? (
                <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--primary)] px-0.5 text-[8px] font-bold text-white">
                  {wishCount > 9 ? '9+' : wishCount}
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

      {searchOpen ? (
        <div className="search-overlay fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm" onClick={() => setSearchOpen(false)}>
          <div className="search-panel absolute inset-x-0 top-0 mx-auto max-w-[480px] px-4 pt-[calc(12px+var(--safe-top))]" onClick={(e) => e.stopPropagation()}>
            <div className="glass-strong flex items-center gap-2 rounded-2xl px-3 py-2 shadow-xl">
              <Search size={18} className="shrink-0 text-[var(--primary)]" />
              <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submitSearch(); if (e.key === 'Escape') setSearchOpen(false); }} placeholder={t.search} className="w-full bg-transparent text-sm outline-none" />
              <button type="button" onClick={() => setSearchOpen(false)} className="rounded-lg p-1 text-[#8a8da8]"><X size={18} /></button>
            </div>
            <button type="button" onClick={submitSearch} className="btn-primary mt-3 w-full py-2.5 text-sm">{t.search}</button>
          </div>
        </div>
      ) : null}
    </>
  );
}
