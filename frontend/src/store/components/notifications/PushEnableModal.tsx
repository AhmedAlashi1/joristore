import { BellRing, Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { enablePushFromUserGesture, pushFailureMessage, PUSH_OPT_OUT_KEY } from '../../lib/push-subscribe';
import { useCustomer } from '../../providers/customer-provider';
import { useLocale } from '../../providers/locale-provider';
import { useNotifications } from '../../providers/notification-provider';

const SESSION_DISMISS_KEY = 'jori-push-modal-dismiss-session';

export function PushEnableModal() {
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const { isLoggedIn } = useCustomer();
  const { permission, pushEnabled, refresh } = useNotifications();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const needsPush =
    isLoggedIn
    && !pushEnabled
    && permission !== 'denied'
    && permission !== 'unsupported';

  useEffect(() => {
    if (!needsPush) {
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
    } catch {
      /* ignore */
    }
    setOpen(true);
  }, [needsPush]);

  if (!open || !needsPush) return null;

  const onEnable = async () => {
    setBusy(true);
    try {
      localStorage.removeItem(PUSH_OPT_OUT_KEY);
      const result = await enablePushFromUserGesture();
      await refresh();
      if (result.ok) {
        setOpen(false);
      } else {
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

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 p-4 pb-[calc(5.5rem+var(--safe-bottom))] sm:items-center">
      <div
        className="glass-strong relative w-full max-w-[20.5rem] rounded-3xl border border-[var(--primary)]/25 p-5 shadow-2xl"
        role="dialog"
        aria-modal
        aria-labelledby="push-modal-title"
      >
        <button
          type="button"
          className="absolute end-6 top-6 rounded-lg p-1 text-store-muted"
          aria-label={ar ? 'إغلاق' : 'Close'}
          onClick={onLater}
        >
          <X size={20} />
        </button>
        <div className="flex flex-col items-center text-center">
          <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <BellRing size={28} />
          </span>
          <h2 id="push-modal-title" className="text-lg font-bold">
            {ar ? 'فعّل الإشعارات' : 'Enable notifications'}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-store-muted">
            {ar
              ? 'اضغط «تفعيل» مرة واحدة لتصلك عروض المتجر وطلباتك حتى والتطبيق مغلق. (مطلوب من نظام الجوال — لا يمكن التفعيل تلقائياً بدون موافقتك.)'
              : 'Tap Enable once to get store alerts when the app is closed. Your phone requires this one-time approval.'}
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void onEnable()}
            className="btn-primary mt-5 w-full py-3 text-sm"
          >
            {busy ? <Loader2 className="mx-auto animate-spin" size={22} /> : (ar ? 'تفعيل الإشعارات' : 'Enable notifications')}
          </button>
          <button type="button" onClick={onLater} className="mt-3 text-xs font-semibold text-[#8a8da8]">
            {ar ? 'ليس الآن' : 'Not now'}
          </button>
        </div>
      </div>
    </div>
  );
}
