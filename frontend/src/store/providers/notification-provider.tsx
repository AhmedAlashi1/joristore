import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { customerApi, extractPaginatedRows } from '../lib/api';
import { useLocale } from './locale-provider';
import {
  disablePushFromUserGesture,
  enablePushFromUserGesture,
  PUSH_OPT_OUT_KEY,
  syncPushSubscription,
  type PushEnableReason,
} from '../lib/push-subscribe';
import { useCustomer } from './customer-provider';

type CustomerNotificationRow = {
  id: number;
  title: string;
  message: string;
  type?: string;
  data?: {
    transfer_reference?: string;
    account_holder_name?: string;
    payment_method_label_ar?: string;
    payment_method_label_en?: string;
    customer_receipt_url?: string | null;
    admin_transfer_receipt_url?: string | null;
    order_number?: string;
    amount?: number;
    admin_note?: string | null;
  };
  read_at?: string | null;
  created_at?: string;
};

type NotificationCtx = {
  items: CustomerNotificationRow[];
  unreadCount: number;
  loading: boolean;
  permission: NotificationPermission | 'unsupported';
  pushEnabled: boolean;
  requestPermission: () => Promise<{ ok: boolean; reason?: PushEnableReason }>;
  disablePush: () => Promise<void>;
  refresh: () => Promise<void>;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
};

const NotificationContext = createContext<NotificationCtx | null>(null);

function playAlertSound() {
  try {
    const ctx = new AudioContext();
    const playTone = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = 0.18;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur);
    };
    playTone(880, 0, 0.25);
    playTone(1175, 0.28, 0.22);
    setTimeout(() => void ctx.close(), 700);
  } catch {
    /* ignore */
  }
}

function showSystemNotification(title: string, body: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const n = new Notification(title, {
      body,
      icon: '/pwa-192.png',
      badge: '/pwa-192.png',
      tag: `jori-${Date.now()}`,
      requireInteraction: false,
    });
    n.onclick = () => {
      window.focus();
      window.location.href = '/notifications';
      n.close();
    };
  } catch {
    /* ignore */
  }
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useCustomer();
  const { locale } = useLocale();
  const [items, setItems] = useState<CustomerNotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    ('Notification' in window ? Notification.permission : 'unsupported'),
  );
  const lastSeenId = useRef(0);

  const refresh = useCallback(async () => {
    if (!isLoggedIn) {
      setItems([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [list, countRes] = await Promise.all([
        customerApi.notifications(1, locale === 'en' ? 'en' : 'ar'),
        customerApi.unreadCount(),
      ]);
      const rows = extractPaginatedRows(list);
      setItems(rows);
      setUnreadCount(countRes.count);

      const newest = rows[0];
      if (newest && newest.id > lastSeenId.current && !newest.read_at) {
        if (lastSeenId.current > 0) {
          showSystemNotification(newest.title, newest.message);
          playAlertSound();
        }
        lastSeenId.current = Math.max(lastSeenId.current, newest.id);
      } else if (newest) {
        lastSeenId.current = Math.max(lastSeenId.current, newest.id);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, locale]);

  useEffect(() => {
    void refresh();
    if (!isLoggedIn) return undefined;
    const timer = window.setInterval(() => void refresh(), 15000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [isLoggedIn, refresh]);

  useEffect(() => {
    if (!isLoggedIn || permission !== 'granted') {
      setPushEnabled(false);
      return;
    }
    if (localStorage.getItem(PUSH_OPT_OUT_KEY) === '1') {
      setPushEnabled(false);
      return;
    }
    void syncPushSubscription()
      .then((r) => setPushEnabled(r.ok))
      .catch(() => setPushEnabled(false));
  }, [isLoggedIn, permission]);

  const requestPermission = useCallback(async () => {
    const result = await enablePushFromUserGesture();
    setPermission('Notification' in window ? Notification.permission : 'unsupported');
    setPushEnabled(result.ok);
    if (result.ok) {
      await refresh();
    }
    return { ok: result.ok, reason: result.reason };
  }, [refresh]);

  const disablePush = useCallback(async () => {
    await disablePushFromUserGesture();
    setPushEnabled(false);
  }, []);

  const markRead = useCallback(async (id: number) => {
    await customerApi.markNotificationRead(id);
    await refresh();
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    await customerApi.markAllNotificationsRead();
    await refresh();
  }, [refresh]);

  const value = useMemo<NotificationCtx>(() => ({
    items,
    unreadCount,
    loading,
    permission,
    pushEnabled,
    requestPermission,
    disablePush,
    refresh,
    markRead,
    markAllRead,
  }), [items, unreadCount, loading, permission, pushEnabled, requestPermission, disablePush, refresh, markRead, markAllRead]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications outside provider');
  return ctx;
}
