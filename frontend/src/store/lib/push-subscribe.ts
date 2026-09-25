import { customerApi, unwrap } from './api';

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

export async function syncPushSubscription(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }
  if (Notification.permission !== 'granted') {
    return false;
  }

  const { enabled, public_key: publicKey } = unwrap<{ enabled: boolean; public_key?: string | null }>(
    await customerApi.pushVapidKey(),
  );
  if (!enabled || !publicKey) {
    return false;
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return false;
  }

  await customerApi.pushSubscribe({
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    content_encoding: 'aesgcm',
  });

  return true;
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
}
