import { Bell, BellOff, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { pushFailureMessage } from '../../lib/push-subscribe';
import { useNotifications } from '../../providers/notification-provider';
import { useLocale } from '../../providers/locale-provider';
import { cn } from '../../lib/utils';

export function PushNotificationToggle({ className }: { className?: string }) {
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const { permission, pushEnabled, requestPermission, disablePush } = useNotifications();
  const [busy, setBusy] = useState(false);

  const isOn = permission === 'granted' && pushEnabled;

  const toggle = async () => {
    setBusy(true);
    try {
      if (isOn) {
        await disablePush();
        return;
      }
      const { ok, reason } = await requestPermission();
      if (!ok) {
        window.alert(pushFailureMessage(reason, ar));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn('glass flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3.5 text-sm', className)}>
      <span className="font-medium">{ar ? 'إشعارات الجوال' : 'Phone notifications'}</span>
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={busy || permission === 'unsupported'}
        aria-pressed={isOn}
        aria-label={isOn ? (ar ? 'إيقاف الإشعارات' : 'Turn notifications off') : (ar ? 'تفعيل الإشعارات' : 'Turn notifications on')}
        className={cn(
          'push-toggle-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all active:scale-95 disabled:opacity-50',
          isOn ? 'bg-[var(--primary)] text-white shadow-md' : 'bg-[var(--primary-soft)] text-[var(--primary)]',
        )}
      >
        {busy ? (
          <Loader2 size={20} className="animate-spin" />
        ) : isOn ? (
          <Bell size={20} strokeWidth={2.25} />
        ) : (
          <BellOff size={20} strokeWidth={2.25} />
        )}
      </button>
    </div>
  );
}
