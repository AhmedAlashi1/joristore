import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';
import { bumpMediaCacheVersion } from '../lib/media-cache-bust';
import { prefetchStoreHome } from '../lib/prefetch-home';
import { useCustomer } from './customer-provider';
import { useLocale } from './locale-provider';
import { useNotifications } from './notification-provider';

const PULL_TRIGGER = 68;
const PULL_MAX = 110;
const REFRESH_OVERLAY_MAX_MS = 2600;
const TASK_TIMEOUT_MS = 2200;

function isPullRefreshDisabled(pathname: string): boolean {
  if (pathname === '/checkout') return true;
  if (pathname.startsWith('/account/addresses/new')) return true;
  if (/^\/account\/addresses\/\d+\/edit/.test(pathname)) return true;
  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
  return Promise.race([promise, delay(ms).then(() => undefined)]);
}

type PullRefreshCtx = {
  refreshKey: number;
  registerPageRefresh: (fn: (() => void | Promise<void>) | null) => void;
};

const PullRefreshContext = createContext<PullRefreshCtx | null>(null);

/** Bumps when user pull-refreshes; use in useEffect deps to reload page data (without unmounting). */
export function usePullRefreshOutletKey(): number {
  return useContext(PullRefreshContext)?.refreshKey ?? 0;
}

export function usePullToRefresh(onRefresh: () => void | Promise<void>) {
  const ctx = useContext(PullRefreshContext);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (!ctx) return;
    ctx.registerPageRefresh(() => onRefreshRef.current());
    return () => ctx.registerPageRefresh(null);
  }, [ctx]);
}

function PullRefreshOverlay({ active, ar }: { active: boolean; ar: boolean }) {
  if (!active) return null;
  return (
    <div
      className="pull-refresh-overlay pointer-events-none fixed inset-0 z-[55] flex items-center justify-center px-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="absolute inset-0 bg-[var(--bg)]/18" />
      <div className="pull-refresh-card relative flex items-center gap-2 rounded-full border border-white/35 bg-white/78 px-3 py-1.5 shadow-[0_6px_20px_rgba(79,70,229,0.1)] backdrop-blur-sm dark:border-white/10 dark:bg-[#1a1a2e]/78">
        <div className="pull-refresh-orbit relative flex h-7 w-7 shrink-0 items-center justify-center">
          <span className="pull-refresh-ring absolute inset-0 rounded-full border border-[var(--primary)]/20" />
          <span className="pull-refresh-ring-active absolute inset-0 rounded-full border border-transparent border-t-[var(--primary)]/85" />
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-[#c4b5fd] via-[#a5b4fc] to-[#7dd3fc] text-white">
            <svg viewBox="0 0 24 24" width="10" height="10" fill="none" aria-hidden>
              <path
                d="M12 5v3M12 16v3M7 12H5M19 12h-2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </div>
        <p className="pe-0.5 text-[11px] font-medium text-[var(--fg)]/90">
          {ar ? 'جاري التحديث…' : 'Refreshing…'}
        </p>
      </div>
    </div>
  );
}

export function PullRefreshProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const { isLoggedIn, refresh: refreshCustomer } = useCustomer();
  const { refresh: refreshNotifications } = useNotifications();

  const [refreshKey, setRefreshKey] = useState(0);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const refreshingRef = useRef(false);
  const pageRefreshRef = useRef<(() => void | Promise<void>) | null>(null);

  const registerPageRefresh = useCallback((fn: (() => void | Promise<void>) | null) => {
    pageRefreshRef.current = fn;
  }, []);

  const runRefresh = useCallback(async () => {
    await bumpMediaCacheVersion();

    const pageExtra = pageRefreshRef.current;
    await Promise.race([
      Promise.allSettled([
        withTimeout(prefetchStoreHome({ force: true }), TASK_TIMEOUT_MS),
        isLoggedIn ? withTimeout(refreshCustomer(), TASK_TIMEOUT_MS) : Promise.resolve(),
        isLoggedIn ? withTimeout(refreshNotifications(), TASK_TIMEOUT_MS) : Promise.resolve(),
        pageExtra ? withTimeout(Promise.resolve(pageExtra()), TASK_TIMEOUT_MS) : Promise.resolve(),
      ]),
      delay(REFRESH_OVERLAY_MAX_MS),
    ]);

    setRefreshKey((k) => k + 1);
  }, [isLoggedIn, refreshCustomer, refreshNotifications]);

  const disabled = isPullRefreshDisabled(pathname);

  useEffect(() => {
    refreshingRef.current = refreshing;
  }, [refreshing]);

  useEffect(() => {
    if (disabled) return;

    let startY = 0;
    let tracking = false;
    let triggered = false;

    const scrollTop = () => window.scrollY || document.documentElement.scrollTop || 0;

    const onTouchStart = (e: TouchEvent) => {
      if (refreshingRef.current || e.touches.length !== 1) return;
      if (scrollTop() > 2) return;
      startY = e.touches[0].clientY;
      tracking = true;
      triggered = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!tracking || refreshingRef.current) return;
      if (scrollTop() > 2) {
        tracking = false;
        setPull(0);
        return;
      }
      const dy = e.touches[0].clientY - startY;
      if (dy > 8) {
        if (e.cancelable) e.preventDefault();
        setPull(Math.min(dy * 0.45, PULL_MAX));
        triggered = dy * 0.45 >= PULL_TRIGGER;
      } else if (dy <= 0) {
        setPull(0);
      }
    };

    const onTouchEnd = () => {
      if (!tracking) return;
      tracking = false;
      if (triggered && !refreshingRef.current) {
        refreshingRef.current = true;
        setRefreshing(true);
        setPull(0);
        void runRefresh()
          .catch(() => undefined)
          .finally(() => {
            refreshingRef.current = false;
            setRefreshing(false);
            setPull(0);
          });
      } else {
        setPull(0);
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [disabled, runRefresh]);

  useEffect(() => {
    if (disabled) setPull(0);
  }, [disabled, pathname]);

  const showPullHint = !refreshing && pull > 6;
  const pullProgress = Math.min(pull / PULL_TRIGGER, 1);

  const ctxValue = useMemo(
    () => ({ refreshKey, registerPageRefresh }),
    [refreshKey, registerPageRefresh],
  );

  return (
    <PullRefreshContext.Provider value={ctxValue}>
      <PullRefreshOverlay active={refreshing} ar={ar} />
      {showPullHint ? (
        <div
          className="pointer-events-none fixed inset-x-0 top-[calc(var(--header-h)+var(--safe-top)+var(--open-app-h,0px)+8px)] z-[34] mx-auto flex max-w-[480px] justify-center opacity-80"
          style={{ transform: `translateY(${pull * 0.2}px)` }}
        >
          <span className="rounded-full bg-white/55 px-2 py-0.5 text-[9px] font-medium text-store-muted/90 shadow-sm backdrop-blur-sm dark:bg-black/25">
            {pullProgress >= 1 ? (ar ? 'افلت' : 'Release') : (ar ? '↓ اسحب' : '↓ Pull')}
          </span>
        </div>
      ) : null}
      {children}
    </PullRefreshContext.Provider>
  );
}
