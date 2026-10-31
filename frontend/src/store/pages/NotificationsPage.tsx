import { Bell, BellRing, Megaphone, Package, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { pushFailureMessage } from '../lib/push-subscribe';
import { useCustomer } from '../providers/customer-provider';
import { useLocale } from '../providers/locale-provider';
import { formatPrice } from '../lib/utils';
import { useNotifications } from '../providers/notification-provider';

function notificationVisual(type?: string) {
  if (type?.includes('wallet')) return { Icon: Wallet, labelAr: 'المحفظة', labelEn: 'Wallet' };
  if (type?.includes('order') || type?.includes('payment')) {
    return { Icon: Package, labelAr: 'طلب', labelEn: 'Order' };
  }
  if (type === 'broadcast') return { Icon: Megaphone, labelAr: 'من المتجر', labelEn: 'From store' };
  return { Icon: Bell, labelAr: 'تنبيه', labelEn: 'Alert' };
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
      <div className="py-16 text-center">
        <Bell size={48} className="mx-auto mb-4 text-[var(--primary)] opacity-40" />
        <p className="font-bold">{ar ? 'سجّل دخول لعرض الإشعارات' : 'Login to view notifications'}</p>
        <Link to="/account" className="btn-primary mt-4 inline-flex">{t.account}</Link>
      </div>
    );
  }

  const showPushCta = permission !== 'granted' || !pushEnabled;

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">{ar ? 'الإشعارات' : 'Notifications'}</h1>
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
          className="glass-strong flex w-full items-center gap-3 rounded-2xl border border-[var(--primary-soft)] p-4 text-start shadow-sm"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)]">
            <BellRing size={22} className="text-[var(--primary)]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">{ar ? 'فعّل الإشعارات على جوالك' : 'Enable phone notifications'}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-[#8a8da8]">
              {ar
                ? 'تظهر الإشعارات هنا دائماً. للتنبيه مع رنة عند إغلاق التطبيق، فعّل Push من الزر.'
                : 'Notifications always appear here. Enable push for alerts when the app is closed.'}
            </p>
            <span className="mt-2 inline-block text-xs font-semibold text-[var(--primary)]">
              {enablingPush ? (ar ? 'جاري التفعيل...' : 'Enabling...') : (ar ? 'تفعيل الآن' : 'Enable now')}
            </span>
          </div>
        </button>
      ) : null}

      {loading && items.length === 0 ? (
        <div className="glass rounded-2xl py-16 text-center text-sm text-[#8a8da8]">{ar ? 'جاري التحميل...' : 'Loading...'}</div>
      ) : items.length === 0 ? (
        <div className="glass rounded-2xl py-16 text-center text-sm text-[#8a8da8]">{ar ? 'لا توجد إشعارات' : 'No notifications'}</div>
      ) : (
        <div className="space-y-3">
          {items.map((n) => {
            const { Icon, labelAr, labelEn } = notificationVisual(n.type);
            const unread = !n.read_at;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => unread && void markRead(n.id)}
                className={`glass-strong relative w-full overflow-hidden rounded-2xl p-4 text-start transition ${unread ? 'ring-2 ring-[var(--primary)]/35' : ''}`}
              >
                {unread ? (
                  <span className="absolute end-3 top-3 h-2.5 w-2.5 rounded-full bg-[var(--primary)]" aria-hidden />
                ) : null}
                <div className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/[0.04] text-[var(--primary)]">
                    <Icon size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold leading-snug">{n.title}</p>
                      <span className="rounded-full bg-[var(--primary-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--primary)]">
                        {ar ? labelAr : labelEn}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-[#6f6b7d]">{n.message}</p>
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
                        <img src={n.data.customer_receipt_url} alt="" className="max-h-36 w-full object-contain bg-white" />
                        <span className="block bg-black/[0.03] px-2 py-1 text-[10px] font-medium">{ar ? 'إيصال التحويل' : 'Transfer receipt'}</span>
                      </a>
                    ) : null}
                    {n.data?.admin_transfer_receipt_url ? (
                      <a href={n.data.admin_transfer_receipt_url} target="_blank" rel="noreferrer" className="mt-2 block overflow-hidden rounded-xl border border-[var(--primary)]/25" onClick={(e) => e.stopPropagation()}>
                        <img src={n.data.admin_transfer_receipt_url} alt="" className="max-h-36 w-full object-contain bg-white" />
                        <span className="block bg-[var(--primary-soft)] px-2 py-1 text-[10px] font-medium">{ar ? 'إشعار التحويل من المتجر' : 'Store transfer notice'}</span>
                      </a>
                    ) : null}
                    <p className="mt-2 text-[10px] text-[#8a8da8]">
                      {n.created_at ? new Date(n.created_at).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en') : ''}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
