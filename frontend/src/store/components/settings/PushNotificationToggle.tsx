import { Bell, BellOff, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { iosPushRequiresInstall, pushFailureMessage } from '../../lib/push-subscribe';
import { useInstall } from '../../providers/install-provider';
import { useNotifications } from '../../providers/notification-provider';
import { useLocale } from '../../providers/locale-provider';
import { cn } from '../../lib/utils';

export function PushNotificationToggle({ className }: { className?: string }) {
  const { t, locale } = useLocale();
  const ar = locale === 'ar';
  const { permission, pushReady, pushEnabled, requestPermission, disablePush } = useNotifications();
  const { requestInstall } = useInstall();
  const [busy, setBusy] = useState(false);

  if (!pushReady) return null;

  const isOn = permission === 'granted' && pushEnabled;
  const iosInstallFirst = iosPushRequiresInstall();

  const enable = async () => {
    setBusy(true);
    try {
      const { ok, reason } = await requestPermission();
      if (!ok && reason !== 'ios_need_home_screen') {
        window.alert(pushFailureMessage(reason, ar));
      }
    } finally {
      setBusy(false);
    }
  };

  const toggle = async () => {
    setBusy(true);
    try {
      if (isOn) {
        await disablePush();
        return;
      }
      await enable();
    } finally {
      setBusy(false);
    }
  };

  if (permission === 'unsupported') {
    return null;
  }

  if (isOn) {
    return (
      <div className={cn('glass flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3.5 text-sm', className)}>
        <span className="font-medium">{ar ? 'إشعارات الجوال' : 'Phone notifications'}</span>
        <button
          type="button"
          onClick={() => void toggle()}
          disabled={busy}
          aria-pressed
          aria-label={ar ? 'إيقاف الإشعارات' : 'Turn notifications off'}
          className="push-toggle-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-white shadow-md transition-all active:scale-95 disabled:opacity-50"
        >
          {busy ? <Loader2 size={20} className="animate-spin" /> : <Bell size={20} strokeWidth={2.25} />}
        </button>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className={cn('glass rounded-xl px-4 py-3.5 text-sm', className)}>
        <p className="font-medium text-[var(--fg)]">{t.pushPromptTitle}</p>
        <p className="mt-1 text-xs leading-relaxed text-store-muted">
          {ar
            ? 'الإشعارات محظورة من إعدادات المتصفح. فعّلها من إعدادات الجهاز ثم ارجع هنا.'
            : 'Notifications are blocked in browser settings. Enable them in your device settings, then return here.'}
        </p>
      </div>
    );
  }

  return (
    <div className={cn('glass-strong flex items-start gap-3 rounded-2xl border border-[var(--glass-border)] p-4', className)}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
        <BellOff size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-[var(--fg)]">{t.pushPromptTitle}</p>
        <p className="mt-1 text-xs leading-relaxed text-store-muted">{t.pushPromptBody}</p>
        {iosInstallFirst ? (
          <button
            type="button"
            onClick={() => void requestInstall()}
            className="mt-3 text-sm font-bold text-[var(--primary)]"
          >
            {ar ? 'كيف أثبّت التطبيق؟' : 'How to install the app'}
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => void enable()}
            className="mt-3 w-full rounded-xl bg-[var(--primary)] py-2.5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? (ar ? 'جاري التفعيل...' : 'Enabling...') : t.pushPromptAction}
          </button>
        )}
      </div>
    </div>
  );
}
