import { Bell, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { enablePushFromUserGesture, pushFailureMessage } from '../../lib/push-subscribe';
import { useCustomer } from '../../providers/customer-provider';
import { useLocale } from '../../providers/locale-provider';
import { useNotifications } from '../../providers/notification-provider';

const DISMISS_KEY = 'jori-push-prompt-dismiss';

function isMobile() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export function EnablePushBar() {
  const { t, locale } = useLocale();
  const { isLoggedIn } = useCustomer();
  const { permission, pushEnabled, refresh } = useNotifications();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isLoggedIn || !isMobile()) {
      setVisible(false);
      return;
    }
    if (permission === 'granted' && pushEnabled) {
      setVisible(false);
      return;
    }
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === '1') {
        setVisible(false);
        return;
      }
    } catch {
      /* ignore */
    }
    setVisible(permission !== 'granted' || !pushEnabled);
  }, [isLoggedIn, permission, pushEnabled]);

  if (!visible) return null;

  const ar = locale === 'ar';

  const onEnable = async () => {
    setBusy(true);
    try {
      const result = await enablePushFromUserGesture();
      await refresh();
      if (!result.ok) {
        window.alert(pushFailureMessage(result.reason, ar));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-x-0 top-[calc(var(--header-h)+var(--safe-top)+var(--open-app-h)+4px)] z-30 mx-auto max-w-[480px] px-3">
      <div className="glass-strong flex items-start gap-2 rounded-2xl border border-[var(--primary-soft)] p-3 shadow-md">
        <Bell className="mt-0.5 shrink-0 text-[var(--primary)]" size={20} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{t.pushPromptTitle}</p>
          <p className="mt-0.5 text-xs text-store-muted">{t.pushPromptBody}</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void onEnable()}
            className="btn-primary mt-2 w-full py-2 text-sm"
          >
            {busy ? (ar ? 'جاري التفعيل...' : 'Enabling...') : t.pushPromptAction}
          </button>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-lg p-1 text-store-muted"
          aria-label={t.dismiss}
          onClick={() => {
            try {
              sessionStorage.setItem(DISMISS_KEY, '1');
            } catch {
              /* ignore */
            }
            setVisible(false);
          }}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
