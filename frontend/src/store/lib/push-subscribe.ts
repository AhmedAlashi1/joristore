import { customerApi } from './api';

const VAPID_CACHE_KEY = 'jori-vapid-public-key';

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

async function waitForServiceWorker(maxMs = 12000): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const reg = await navigator.serviceWorker.getRegistration('/');
    if (reg?.active) return reg;
    await new Promise((r) => setTimeout(r, 250));
  }
  try {
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

export async function syncPushSubscription(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }
  if (Notification.permission !== 'granted') {
    return false;
  }

  let vapid: { enabled: boolean; public_key?: string | null };
  try {
    vapid = (await customerApi.pushVapidKey()) as { enabled: boolean; public_key?: string | null };
  } catch {
    return false;
  }

  const publicKey = vapid.public_key;
  if (!vapid.enabled || !publicKey) {
    return false;
  }

  const registration = await waitForServiceWorker();
  if (!registration) return false;

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
      return false;
    }
  }

  localStorage.setItem(VAPID_CACHE_KEY, publicKey);

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return false;
  }

  try {
    await customerApi.pushSubscribe({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      content_encoding: 'aesgcm',
    });
  } catch {
    return false;
  }

  return true;
}

/** Must run from a user tap/click (especially on iOS). */
export async function enablePushFromUserGesture(): Promise<{ ok: boolean; reason?: string }> {
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

  const ok = await syncPushSubscription();
  return { ok, reason: ok ? undefined : 'subscribe_failed' };
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
