import { BellRing, Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { enablePushFromUserGesture, iosPushRequiresInstall, pushFailureMessage, PUSH_OPT_OUT_KEY } from '../../lib/push-subscribe';
import { PUSH_PROMPT_AFTER_AUTH_KEY } from '../../lib/push-prompt-state';
import { useCustomer } from '../../providers/customer-provider';
import { useLocale } from '../../providers/locale-provider';
import { useNotifications } from '../../providers/notification-provider';

const SESSION_DISMISS_KEY = 'jori-push-modal-dismiss-session';

export function PushEnableModal() {
  const { t, locale } = useLocale();
  const ar = locale === 'ar';
  const location = useLocation();
  const { isLoggedIn } = useCustomer();
  const { permission, pushReady, pushFullyActive, refresh } = useNotifications();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const onAccountPage = location.pathname === '/account';

  const mayPrompt =
    onAccountPage
    && pushReady
    && isLoggedIn
    && !pushFullyActive
    && permission !== 'denied'
    && permission !== 'unsupported'
    && !iosPushRequiresInstall();

  useEffect(() => {
    if (!mayPrompt) {
      setOpen(false);
      return;
    }
    try {
      if (localStorage.getItem(PUSH_OPT_OUT_KEY) === '1') {
        setOpen(false);
        return;
      }
      if (sessionStorage.getItem(SESSION_DISMISS_KEY) === '1') {
        setOpen(false);
        return;
      }
      const afterAuth = sessionStorage.getItem(PUSH_PROMPT_AFTER_AUTH_KEY) === '1';
      if (!afterAuth) {
        setOpen(false);
        return;
      }
      sessionStorage.removeItem(PUSH_PROMPT_AFTER_AUTH_KEY);
    } catch {
      setOpen(false);
      return;
    }
    setOpen(true);
  }, [mayPrompt]);

  if (!open || !mayPrompt) return null;

  const onEnable = async () => {
    setBusy(true);
    try {
      localStorage.removeItem(PUSH_OPT_OUT_KEY);
      const result = await enablePushFromUserGesture();
      await refresh();
      if (result.ok) {
        setOpen(false);
      } else if (result.reason !== 'ios_need_home_screen') {
        window.alert(pushFailureMessage(result.reason, ar));
      }
    } finally {
      setBusy(false);
    }
  };

  const onLater = () => {
    try {
      sessionStorage.setItem(SESSION_DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  return createPortal(
    <div
      className="push-enable-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-5 backdrop-blur-sm"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onLater();
      }}
    >
      <div
        className="glass-strong relative w-full max-w-[21rem] rounded-3xl border border-[var(--glass-border)] p-6 shadow-2xl"
        role="dialog"
        aria-modal
        aria-labelledby="push-modal-title"
      >
        <button
          type="button"
          className="absolute end-4 top-4 rounded-lg p-1.5 text-store-muted transition hover:bg-white/10"
          aria-label={ar ? 'إغلاق' : 'Close'}
          onClick={onLater}
        >
          <X size={20} />
        </button>
        <div className="flex flex-col items-center pt-2 text-center">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <BellRing size={28} />
          </span>
          <h2 id="push-modal-title" className="text-lg font-bold text-[var(--fg)]">
            {t.pushPromptTitle}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-store-muted">{t.pushPromptBody}</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void onEnable()}
            className="btn-primary mt-6 w-full py-3 text-sm"
          >
            {busy ? <Loader2 className="mx-auto animate-spin" size={22} /> : t.pushPromptAction}
          </button>
          <button type="button" onClick={onLater} className="mt-4 text-xs font-semibold text-store-muted">
            {ar ? 'ليس الآن' : 'Not now'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
