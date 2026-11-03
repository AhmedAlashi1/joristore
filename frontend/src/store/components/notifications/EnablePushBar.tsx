import { Bell } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { enablePushFromUserGesture, iosPushRequiresInstall, pushFailureMessage } from '../../lib/push-subscribe';
import { useCustomer } from '../../providers/customer-provider';
import { useInstall } from '../../providers/install-provider';
import { useLocale } from '../../providers/locale-provider';
import { useNotifications } from '../../providers/notification-provider';

const PUSH_BAR_GAP_PX = 14;

export function EnablePushBar() {
  const { t, locale } = useLocale();
  const location = useLocation();
  const { isLoggedIn } = useCustomer();
  const { iconVisible, installed } = useInstall();
  const { permission, pushEnabled, refresh } = useNotifications();
  const [busy, setBusy] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const showOpenInApp = iconVisible && !installed;
  const ar = locale === 'ar';
  const iosInstallFirst = iosPushRequiresInstall();

  const notificationsActive = useMemo(() => {
    const browserPerm =
      typeof Notification !== 'undefined' ? Notification.permission : permission;
    return browserPerm === 'granted' && pushEnabled;
  }, [permission, pushEnabled]);

  const visible = isLoggedIn
    && !notificationsActive
    && permission !== 'denied'
    && permission !== 'unsupported'
    && location.pathname !== '/notifications'
    && !iosInstallFirst;

  useEffect(() => {
    const shell = document.querySelector('.app-shell');
    if (!shell) return;
    shell.classList.toggle('has-push-prompt', visible);
    const el = shell as HTMLElement;
    if (!visible) el.style.removeProperty('--push-prompt-h');
    return () => {
      shell.classList.remove('has-push-prompt');
      el.style.removeProperty('--push-prompt-h');
    };
  }, [visible]);

  useEffect(() => {
    const shell = document.querySelector('.app-shell');
    const node = barRef.current;
    if (!visible || !shell || !node) return;

    const el = shell as HTMLElement;
    const syncHeight = () => {
      const h = node.getBoundingClientRect().height;
      el.style.setProperty('--push-prompt-h', `${Math.ceil(h) + PUSH_BAR_GAP_PX}px`);
    };

    syncHeight();
    const ro = new ResizeObserver(syncHeight);
    ro.observe(node);
    window.addEventListener('resize', syncHeight);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', syncHeight);
    };
  }, [visible, inlineError, locale]);

  if (!visible) return null;

  const onEnable = async () => {
    setInlineError(null);
    setBusy(true);
    try {
      const result = await enablePushFromUserGesture();
      await refresh();
      if (!result.ok) {
        setInlineError(pushFailureMessage(result.reason, ar));
      }
    } finally {
      setBusy(false);
    }
  };

  const topOffset = showOpenInApp ? 12 : 10;

  return (
    <div
      ref={barRef}
      className="enable-push-bar fixed inset-x-0 z-30 mx-auto max-w-[480px] px-4"
      style={{
        top: `calc(var(--header-h) + var(--safe-top) + var(--open-app-h) + ${topOffset}px)`,
      }}
    >
      <div className="glass flex items-start gap-3 rounded-2xl border border-[var(--glass-border)] p-3.5 shadow-sm">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
          <Bell size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[var(--fg)]">{t.pushPromptTitle}</p>
          <p className="mt-1 text-xs leading-relaxed text-store-muted">{t.pushPromptBody}</p>
          {inlineError ? (
            <p className="mt-2 rounded-lg bg-[#ea5455]/10 px-2.5 py-2 text-[11px] leading-relaxed text-[#ffb4b4]">
              {inlineError}
            </p>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => void onEnable()}
            className="mt-3 w-full rounded-xl bg-[var(--primary-soft)] py-2.5 text-sm font-bold text-[var(--primary)] transition active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? (ar ? 'جاري التفعيل...' : 'Enabling...') : t.pushPromptAction}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Shown on iOS Safari instead of push bar — install PWA first (no alert trap). */
export function IosPushInstallHint() {
  const { locale } = useLocale();
  const { isLoggedIn } = useCustomer();
  const { requestInstall } = useInstall();
  const { permission, pushEnabled } = useNotifications();
  const location = useLocation();
  const barRef = useRef<HTMLDivElement>(null);
  const ar = locale === 'ar';

  const needsHint =
    isLoggedIn
    && iosPushRequiresInstall()
    && !pushEnabled
    && permission !== 'denied'
    && location.pathname !== '/notifications';

  useEffect(() => {
    const shell = document.querySelector('.app-shell');
    if (!shell) return;
    shell.classList.toggle('has-push-prompt', needsHint);
    const el = shell as HTMLElement;
    if (!needsHint) el.style.removeProperty('--push-prompt-h');
    return () => {
      shell.classList.remove('has-push-prompt');
      el.style.removeProperty('--push-prompt-h');
    };
  }, [needsHint]);

  useEffect(() => {
    const shell = document.querySelector('.app-shell');
    const node = barRef.current;
    if (!needsHint || !shell || !node) return;
    const el = shell as HTMLElement;
    const syncHeight = () => {
      el.style.setProperty('--push-prompt-h', `${Math.ceil(node.getBoundingClientRect().height) + PUSH_BAR_GAP_PX}px`);
    };
    syncHeight();
    const ro = new ResizeObserver(syncHeight);
    ro.observe(node);
    return () => ro.disconnect();
  }, [needsHint]);

  if (!needsHint) return null;

  return (
    <div
      ref={barRef}
      className="fixed inset-x-0 z-30 mx-auto max-w-[480px] px-4"
      style={{ top: 'calc(var(--header-h) + var(--safe-top) + var(--open-app-h) + 10px)' }}
    >
      <div className="glass flex items-start gap-3 rounded-2xl border border-[var(--primary)]/20 p-3.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
          <Bell size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[var(--fg)]">
            {ar ? 'ثبّت التطبيق أولاً' : 'Install the app first'}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-store-muted">
            {ar
              ? 'على iPhone: Safari → مشاركة → «إضافة إلى الشاشة الرئيسية»، ثم افتح من الأيقونة وفعّل الإشعارات.'
              : 'On iPhone: Share → Add to Home Screen, open the icon, then enable notifications.'}
          </p>
          <button
            type="button"
            onClick={() => void requestInstall()}
            className="mt-3 text-sm font-bold text-[var(--primary)]"
          >
            {ar ? 'كيف أثبّت التطبيق؟' : 'How to install'}
          </button>
        </div>
      </div>
    </div>
  );
}
