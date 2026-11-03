import { Bell, BellRing, Megaphone, Package, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { pushFailureMessage } from '../lib/push-subscribe';
import { cn, formatPrice } from '../lib/utils';
import { useCustomer } from '../providers/customer-provider';
import { useLocale } from '../providers/locale-provider';
import { useNotifications } from '../providers/notification-provider';

function notificationVisual(type?: string) {
  if (type?.includes('wallet')) return { Icon: Wallet, labelAr: 'المحفظة', labelEn: 'Wallet' };
  if (type?.includes('order') || type?.includes('payment')) {
    return { Icon: Package, labelAr: 'طلب', labelEn: 'Order' };
  }
  if (type === 'broadcast') return { Icon: Megaphone, labelAr: 'من المتجر', labelEn: 'من المتجر' };
  return { Icon: Bell, labelAr: 'تنبيه', labelEn: 'Alert' };
}

function messageDiffersFromTitle(title: string, message: string): boolean {
  return message.trim() !== '' && message.trim() !== title.trim();
}

export function CustomerNotificationsPage() {
  const { t, locale } = useLocale();
  const ar = locale === 'ar';
  const { isLoggedIn } = useCustomer();
  const { items, unreadCount, loading, permission, pushEnabled, requestPermission, markRead, markAllRead, refresh } = useNotifications();
  const [enablingPush, setEnablingPush] = useState(false);

  useEffect(() => { void refresh(); }, [refresh]);

  const onEnablePush = async () => {
    setEnablingPush(true);
    try {
      const result = await requestPermission();
      if (!result.ok) {
        window.alert(pushFailureMessage(result.reason, ar));
      }
    } finally {
      setEnablingPush(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="mx-auto max-w-[20rem] py-16 text-center">
        <Bell size={48} className="mx-auto mb-4 text-[var(--primary)] opacity-40" />
        <p className="font-bold">{ar ? 'سجّل دخول لعرض الإشعارات' : 'Login to view notifications'}</p>
        <Link to="/account" className="btn-primary mt-4 inline-flex">{t.account}</Link>
      </div>
    );
  }

  const showPushCta = permission !== 'granted' || !pushEnabled;

  return (
    <div className="notifications-page mx-auto w-full max-w-[20.5rem] pb-24 pt-0.5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-lg font-bold">{ar ? 'الإشعارات' : 'Notifications'}</h1>
        {unreadCount > 0 ? (
          <button type="button" onClick={() => void markAllRead()} className="text-xs font-semibold text-[var(--primary)]">
            {ar ? 'تعليم الكل كمقروء' : 'Mark all read'}
          </button>
        ) : null}
      </div>

      {showPushCta ? (
        <button
          type="button"
          disabled={enablingPush}
          onClick={() => void onEnablePush()}
          className="notification-card mb-5 flex w-full items-start gap-3 rounded-2xl border border-[var(--primary)]/20 bg-[var(--glass-bg)] p-4 text-start shadow-sm"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)]">
            <BellRing size={20} className="text-[var(--primary)]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">{ar ? 'فعّل الإشعارات على جوالك' : 'Enable phone notifications'}</p>
            <p className="mt-1 text-xs leading-relaxed text-store-muted">
              {ar
                ? 'للوصول خارج التطبيق فعّل Push من الزر.'
                : 'Enable push for alerts when the app is closed.'}
            </p>
            <span className="mt-2 inline-block text-xs font-semibold text-[var(--primary)]">
              {enablingPush ? (ar ? 'جاري التفعيل...' : 'Enabling...') : (ar ? 'تفعيل الآن' : 'Enable now')}
            </span>
          </div>
        </button>
      ) : null}

      {loading && items.length === 0 ? (
        <div className="notification-card rounded-2xl py-14 text-center text-sm text-store-muted">{ar ? 'جاري التحميل...' : 'Loading...'}</div>
      ) : items.length === 0 ? (
        <div className="notification-card rounded-2xl py-14 text-center text-sm text-store-muted">{ar ? 'لا توجد إشعارات' : 'No notifications'}</div>
      ) : (
        <ul className="flex list-none flex-col gap-3.5 p-0">
          {items.map((n) => {
            const { Icon, labelAr, labelEn } = notificationVisual(n.type);
            const unread = !n.read_at;
            const showBody = messageDiffersFromTitle(n.title, n.message);
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => unread && void markRead(n.id)}
                  className={cn(
                    'notification-card relative w-full overflow-hidden rounded-2xl border bg-[var(--glass-bg)] p-4 text-start shadow-sm transition active:scale-[0.99]',
                    unread
                      ? 'border-[var(--primary)]/35 shadow-[0_4px_20px_rgba(var(--primary-rgb),0.12)]'
                      : 'border-black/[0.06] dark:border-white/10',
                  )}
                >
                  {unread ? (
                    <span
                      className="absolute end-3 top-4 h-2 w-2 rounded-full bg-[var(--primary)]"
                      aria-hidden
                    />
                  ) : null}

                  <div className="flex items-start gap-3 pe-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/[0.04] text-[var(--primary)] dark:bg-white/[0.07]">
                      <Icon size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-bold leading-snug text-[var(--fg)]">{n.title}</p>
                      <span className="mt-1.5 inline-block rounded-md bg-[var(--primary-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--primary)]">
                        {ar ? labelAr : labelEn}
                      </span>

                      {showBody ? (
                        <p className="mt-2.5 text-[13px] leading-relaxed text-[#6f6b7d] dark:text-[#b6b8cc]">{n.message}</p>
                      ) : null}

                      {n.data?.transfer_reference ? (
                        <p className="mt-2 text-xs" dir="ltr">
                          <span className="font-semibold">{ar ? 'رقم التحويل: ' : 'Ref: '}</span>
                          {n.data.transfer_reference}
                        </p>
                      ) : null}
                      {n.data?.account_holder_name ? (
                        <p className="mt-1 text-xs">
                          <span className="font-semibold">{ar ? 'صاحب الحساب: ' : 'Account: '}</span>
                          {n.data.account_holder_name}
                        </p>
                      ) : null}
                      {n.data?.amount != null ? (
                        <p className="mt-2 text-sm font-bold text-[var(--primary)]">{formatPrice(Number(n.data.amount))}</p>
                      ) : null}
                      {(n.data?.payment_method_label_ar || n.data?.payment_method_label_en) ? (
                        <p className="mt-1 text-xs">
                          <span className="font-semibold">{ar ? 'طريقة الدفع: ' : 'Method: '}</span>
                          {ar ? n.data.payment_method_label_ar : n.data.payment_method_label_en}
                        </p>
                      ) : null}
                      {n.data?.admin_note ? (
                        <p className="mt-1 text-xs text-store-muted">{n.data.admin_note}</p>
                      ) : null}
                      {n.data?.customer_receipt_url ? (
                        <a href={n.data.customer_receipt_url} target="_blank" rel="noreferrer" className="mt-2 block overflow-hidden rounded-xl border border-black/10" onClick={(e) => e.stopPropagation()}>
                          <img src={n.data.customer_receipt_url} alt="" className="max-h-32 w-full object-contain bg-white" />
                          <span className="block bg-black/[0.03] px-2 py-1 text-[10px] font-medium">{ar ? 'إيصال التحويل' : 'Transfer receipt'}</span>
                        </a>
                      ) : null}
                      {n.data?.admin_transfer_receipt_url ? (
                        <a href={n.data.admin_transfer_receipt_url} target="_blank" rel="noreferrer" className="mt-2 block overflow-hidden rounded-xl border border-[var(--primary)]/25" onClick={(e) => e.stopPropagation()}>
                          <img src={n.data.admin_transfer_receipt_url} alt="" className="max-h-32 w-full object-contain bg-white" />
                          <span className="block bg-[var(--primary-soft)] px-2 py-1 text-[10px] font-medium">{ar ? 'إشعار التحويل من المتجر' : 'Store transfer notice'}</span>
                        </a>
                      ) : null}

                      <p className="mt-3 border-t border-black/[0.06] pt-2.5 text-[10px] text-[#8a8da8] dark:border-white/10">
                        {n.created_at ? new Date(n.created_at).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en') : ''}
                      </p>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
