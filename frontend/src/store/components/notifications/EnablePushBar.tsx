import { Bell } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { enablePushFromUserGesture, pushFailureMessage } from '../../lib/push-subscribe';
import { useCustomer } from '../../providers/customer-provider';
import { useInstall } from '../../providers/install-provider';
import { useLocale } from '../../providers/locale-provider';
import { useNotifications } from '../../providers/notification-provider';

export function EnablePushBar() {
  const { t, locale } = useLocale();
  const { isLoggedIn } = useCustomer();
  const { iconVisible, installed } = useInstall();
  const { permission, pushEnabled, refresh } = useNotifications();
  const [busy, setBusy] = useState(false);
  const showOpenInApp = iconVisible && !installed;

  const notificationsActive = useMemo(() => {
    const browserPerm =
      typeof Notification !== 'undefined' ? Notification.permission : permission;
    return browserPerm === 'granted' && pushEnabled;
  }, [permission, pushEnabled]);

  const visible = isLoggedIn
    && !notificationsActive
    && permission !== 'denied'
    && permission !== 'unsupported';

  useEffect(() => {
    const shell = document.querySelector('.app-shell');
    if (!shell) return;
    shell.classList.toggle('has-push-prompt', visible);
    return () => shell.classList.remove('has-push-prompt');
  }, [visible]);

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

  const topGap = showOpenInApp ? 14 : 8;

  return (
    <div
      className="enable-push-bar fixed inset-x-0 z-30 mx-auto max-w-[480px] px-3"
      style={{
        top: `calc(var(--header-h) + var(--safe-top) + var(--open-app-h) + ${topGap}px)`,
      }}
    >
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
      </div>
    </div>
  );
}
