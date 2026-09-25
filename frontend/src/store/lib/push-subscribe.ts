import { customerApi } from './api';
import { getCustomerId } from './customer-storage';

const VAPID_CACHE_KEY = 'jori-vapid-public-key';

export type PushEnableReason =
  | 'unsupported'
  | 'denied'
  | 'not_logged_in'
  | 'vapid_off'
  | 'sw_unavailable'
  | 'ios_need_home_screen'
  | 'browser_subscribe_failed'
  | 'api_subscribe_failed';

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64Safe);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    arr[i] = raw.charCodeAt(i);
  }
  return arr;
}

function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandalonePwa() {
  return (
    window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

async function ensureServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;

  let reg = await navigator.serviceWorker.getRegistration('/');
  if (!reg) {
    try {
      reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    } catch {
      /* workbox may already register via vite */
    }
  }

  const start = Date.now();
  while (Date.now() - start < 15000) {
    reg = await navigator.serviceWorker.getRegistration('/');
    if (reg?.active) return reg;
    await new Promise((r) => setTimeout(r, 300));
  }

  try {
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

export async function syncPushSubscription(): Promise<{ ok: boolean; reason?: PushEnableReason }> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, reason: 'unsupported' };
  }
  if (Notification.permission !== 'granted') {
    return { ok: false, reason: 'denied' };
  }
  if (!getCustomerId()) {
    return { ok: false, reason: 'not_logged_in' };
  }

  if (isIos() && !isStandalonePwa()) {
    return { ok: false, reason: 'ios_need_home_screen' };
  }

  let vapid: { enabled: boolean; public_key?: string | null };
  try {
    vapid = (await customerApi.pushVapidKey()) as { enabled: boolean; public_key?: string | null };
  } catch {
    return { ok: false, reason: 'vapid_off' };
  }

  const publicKey = vapid.public_key;
  if (!vapid.enabled || !publicKey) {
    return { ok: false, reason: 'vapid_off' };
  }

  const registration = await ensureServiceWorkerRegistration();
  if (!registration) {
    return { ok: false, reason: 'sw_unavailable' };
  }

  let subscription = await registration.pushManager.getSubscription();
  const cachedKey = localStorage.getItem(VAPID_CACHE_KEY);
  if (subscription && cachedKey && cachedKey !== publicKey) {
    await subscription.unsubscribe();
    subscription = null;
  }

  if (!subscription) {
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    } catch {
      return { ok: false, reason: 'browser_subscribe_failed' };
    }
  }

  localStorage.setItem(VAPID_CACHE_KEY, publicKey);

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, reason: 'browser_subscribe_failed' };
  }

  try {
    await customerApi.pushSubscribe({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      content_encoding: 'aesgcm',
    });
  } catch {
    return { ok: false, reason: 'api_subscribe_failed' };
  }

  return { ok: true };
}

/** Must run from a user tap/click (especially on iOS). */
export async function enablePushFromUserGesture(): Promise<{ ok: boolean; reason?: PushEnableReason }> {
  if (!('Notification' in window) || !('PushManager' in window)) {
    return { ok: false, reason: 'unsupported' };
  }

  let perm = Notification.permission;
  if (perm === 'default') {
    perm = await Notification.requestPermission();
  }
  if (perm !== 'granted') {
    return { ok: false, reason: 'denied' };
  }

  return syncPushSubscription();
}

export function pushFailureMessage(reason: PushEnableReason | undefined, ar: boolean): string {
  switch (reason) {
    case 'vapid_off':
      return ar
        ? 'السيرفر: VAPID غير مضبوط. نفّذ php artisan webpush:vapid وأضف المفاتيح في .env ثم config:cache'
        : 'Server: VAPID not configured. Run webpush:vapid and config:cache';
    case 'not_logged_in':
      return ar ? 'سجّل دخولك أولاً (رقم الهاتف).' : 'Please log in first.';
    case 'ios_need_home_screen':
      return ar
        ? 'على iPhone: من Safari → مشاركة → «إضافة إلى الشاشة الرئيسية» ثم افتح من الأيقونة وفعّل الإشعارات.'
        : 'On iPhone: Add to Home Screen from Safari, open the icon, then enable notifications.';
    case 'sw_unavailable':
      return ar
        ? 'خدمة التطبيق (Service Worker) غير جاهزة. حدّث الصفحة أو ثبّت التطبيق من المتصفح.'
        : 'Service worker not ready. Refresh or install the PWA.';
    case 'denied':
      return ar ? 'تم رفض الإذن. فعّل الإشعارات من إعدادات الجوال للمتصفح/التطبيق.' : 'Permission denied in phone settings.';
    case 'api_subscribe_failed':
      return ar ? 'فشل حفظ الاشتراك على السيرفر. تأكد من تسجيل الدخول وتشغيل migrate.' : 'Server rejected subscription.';
    case 'browser_subscribe_failed':
      return ar ? 'المتصفح رفض Push. استخدم Chrome/Android أو PWA على iPhone.' : 'Browser rejected push subscription.';
    case 'unsupported':
    default:
      return ar ? 'المتصفح لا يدعم إشعارات Push.' : 'Push not supported in this browser.';
  }
}

export async function removePushSubscription(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  try {
    await customerApi.pushUnsubscribe({ endpoint });
  } catch {
    /* ignore */
  }
  await subscription.unsubscribe();
  localStorage.removeItem(VAPID_CACHE_KEY);
}
