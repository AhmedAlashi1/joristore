import { Bell, BellRing, Megaphone, Package, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { iosPushRequiresInstall, pushFailureMessage } from '../lib/push-subscribe';
import { useInstall } from '../providers/install-provider';
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
  const { items, unreadCount, loading, pushReady, pushFullyActive, requestPermission, markRead, markAllRead, refresh } = useNotifications();
  const [enablingPush, setEnablingPush] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const { requestInstall } = useInstall();
  const iosInstallFirst = iosPushRequiresInstall();

  useEffect(() => { void refresh(); }, [refresh]);

  const onEnablePush = async () => {
    setPushError(null);
    setEnablingPush(true);
    try {
      const result = await requestPermission();
      if (!result.ok && result.reason !== 'ios_need_home_screen') {
        setPushError(pushFailureMessage(result.reason, ar));
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

  const showPushCta = pushReady && !pushFullyActive;

  return (
    <div className="notifications-page space-y-3 pb-24">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-[var(--fg)]">{ar ? 'الإشعارات' : 'Notifications'}</h1>
        {unreadCount > 0 ? (
          <button type="button" onClick={() => void markAllRead()} className="text-xs font-semibold text-[var(--primary)]">
            {ar ? 'تعليم الكل كمقروء' : 'Mark all read'}
          </button>
        ) : null}
      </div>

      {showPushCta ? (
        <div className="glass mb-5 flex w-full items-start gap-3 rounded-2xl border border-[var(--glass-border)] p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)]">
            <BellRing size={20} className="text-[var(--primary)]" />
          </span>
          <div className="min-w-0 flex-1">
            {iosInstallFirst ? (
              <>
                <p className="text-sm font-bold text-[var(--fg)]">{ar ? 'ثبّت التطبيق أولاً' : 'Install the app first'}</p>
                <p className="mt-1 text-xs leading-relaxed text-store-muted">
                  {ar
                    ? 'Safari → مشاركة → «إضافة إلى الشاشة الرئيسية»، ثم افتح من الأيقونة.'
                    : 'Share → Add to Home Screen, then open from the icon.'}
                </p>
                <button type="button" onClick={() => void requestInstall()} className="mt-3 text-sm font-bold text-[var(--primary)]">
                  {ar ? 'كيف أثبّت التطبيق؟' : 'How to install'}
                </button>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-[var(--fg)]">{ar ? 'فعّل الإشعارات على جوالك' : 'Enable phone notifications'}</p>
                <p className="mt-1 text-xs leading-relaxed text-store-muted">
                  {ar ? 'اضغط مرة واحدة — مطلوب موافقة نظام iOS/Android.' : 'One tap — your phone will ask for permission.'}
                </p>
                {pushError ? (
                  <p className="mt-2 text-[11px] leading-relaxed text-[#ea5455]">{pushError}</p>
                ) : null}
                <button
                  type="button"
                  disabled={enablingPush}
                  onClick={() => void onEnablePush()}
                  className="mt-3 w-full rounded-xl bg-[var(--primary-soft)] py-2.5 text-sm font-bold text-[var(--primary)] disabled:opacity-50"
                >
                  {enablingPush ? (ar ? 'جاري التفعيل...' : 'Enabling...') : (ar ? 'تفعيل الآن' : 'Enable now')}
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}

      {loading && items.length === 0 ? (
        <div className="glass rounded-2xl py-14 text-center text-sm text-store-muted">{ar ? 'جاري التحميل...' : 'Loading...'}</div>
      ) : items.length === 0 ? (
        <div className="glass rounded-2xl py-14 text-center text-sm text-store-muted">{ar ? 'لا توجد إشعارات' : 'No notifications'}</div>
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
                    'glass relative w-full overflow-hidden rounded-2xl p-4 text-start transition active:scale-[0.99]',
                    unread && 'ring-1 ring-[var(--primary)]/40 shadow-[0_4px_24px_rgba(var(--primary-rgb),0.15)]',
                  )}
                >
                  {unread ? (
                    <span
                      className="absolute end-3 top-4 h-2 w-2 rounded-full bg-[var(--primary)]"
                      aria-hidden
                    />
                  ) : null}

                  <div className="flex items-start gap-3 pe-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                      <Icon size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-bold leading-snug text-[var(--fg)]">{n.title}</p>
                      <span className="mt-1.5 inline-block rounded-md bg-[var(--primary-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--primary)]">
                        {ar ? labelAr : labelEn}
                      </span>

                      {showBody ? (
                        <p className="mt-2.5 text-[13px] leading-relaxed text-store-muted">{n.message}</p>
                      ) : null}

                      {n.data?.transfer_reference ? (
                        <p className="mt-2 text-xs text-[var(--fg)]" dir="ltr">
                          <span className="font-semibold text-store-muted">{ar ? 'رقم التحويل: ' : 'Ref: '}</span>
                          {n.data.transfer_reference}
                        </p>
                      ) : null}
                      {n.data?.account_holder_name ? (
                        <p className="mt-1 text-xs text-[var(--fg)]">
                          <span className="font-semibold text-store-muted">{ar ? 'صاحب الحساب: ' : 'Account: '}</span>
                          {n.data.account_holder_name}
                        </p>
                      ) : null}
                      {n.data?.amount != null ? (
                        <p className="mt-2 text-sm font-bold text-[var(--primary)]">{formatPrice(Number(n.data.amount))}</p>
                      ) : null}
                      {(n.data?.payment_method_label_ar || n.data?.payment_method_label_en) ? (
                        <p className="mt-1 text-xs text-[var(--fg)]">
                          <span className="font-semibold text-store-muted">{ar ? 'طريقة الدفع: ' : 'Method: '}</span>
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

                      <p className="mt-3 border-t border-[var(--glass-border)] pt-2.5 text-[11px] text-store-muted">
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
