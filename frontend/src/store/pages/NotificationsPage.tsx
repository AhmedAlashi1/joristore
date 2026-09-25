import { Bell, BellRing } from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCustomer } from '../providers/customer-provider';
import { useLocale } from '../providers/locale-provider';
import { useNotifications } from '../providers/notification-provider';

export function CustomerNotificationsPage() {
  const { t, locale } = useLocale();
  const ar = locale === 'ar';
  const { isLoggedIn } = useCustomer();
  const { items, unreadCount, permission, requestPermission, markRead, markAllRead, refresh } = useNotifications();

  useEffect(() => { void refresh(); }, [refresh]);

  if (!isLoggedIn) {
    return (
      <div className="py-16 text-center">
        <Bell size={48} className="mx-auto mb-4 text-[var(--primary)] opacity-40" />
        <p className="font-bold">{ar ? 'سجّل دخول لعرض الإشعارات' : 'Login to view notifications'}</p>
        <Link to="/account" className="btn-primary mt-4 inline-flex">{t.account}</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{ar ? 'الإشعارات' : 'Notifications'}</h1>
        {unreadCount > 0 ? (
          <button type="button" onClick={() => void markAllRead()} className="text-xs font-semibold text-[var(--primary)]">
            {ar ? 'تعليم الكل كمقروء' : 'Mark all read'}
          </button>
        ) : null}
      </div>

      {permission !== 'granted' ? (
        <button type="button" onClick={() => void requestPermission()} className="glass-strong flex w-full items-center gap-3 rounded-2xl p-4 text-start">
          <BellRing size={22} className="text-[var(--primary)]" />
          <div>
            <p className="text-sm font-bold">{ar ? 'فعّل الإشعارات على جوالك' : 'Enable phone notifications'}</p>
            <p className="text-xs text-[#8a8da8]">{ar ? 'ستصلك تنبيهات مع رنة عند وصول عروض وطلبات' : 'Get alerts with sound for offers and orders'}</p>
          </div>
        </button>
      ) : null}

      {items.length === 0 ? (
        <div className="glass rounded-2xl py-16 text-center text-sm text-[#8a8da8]">{ar ? 'لا توجد إشعارات' : 'No notifications'}</div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => !n.read_at && void markRead(n.id)}
              className={`glass-strong w-full rounded-2xl p-4 text-start ${!n.read_at ? 'ring-2 ring-[var(--primary-soft)]' : ''}`}
            >
              <p className="font-bold">{n.title}</p>
              <p className="mt-1 text-sm text-[#6f6b7d]">{n.message}</p>
              <p className="mt-2 text-[10px] text-[#8a8da8]">{n.created_at ? new Date(n.created_at).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en') : ''}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
