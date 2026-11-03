self.addEventListener('push', (event) => {
  let payload = {
    title: '',
    body: '',
    url: '/notifications',
    icon: '/pwa-192.png',
    badge: '/pwa-192.png',
    dir: 'rtl',
    lang: 'ar',
    nid: String(Date.now()),
  };
  try {
    if (event.data) {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    }
  } catch {
    /* ignore */
  }

  const userTitle = String(payload.title || '').trim();
  const userBody = String(payload.body || '').trim();
  const notificationTitle = userTitle || userBody || 'إشعار';
  const notificationBody =
    userBody && userBody !== userTitle ? userBody : userTitle && userBody === userTitle ? '' : userBody;

  const options = {
    body: notificationBody,
    icon: payload.icon || '/pwa-192.png',
    badge: payload.badge || '/pwa-192.png',
    image: payload.image || undefined,
    tag: payload.nid ? `jori-${payload.nid}` : `jori-${Date.now()}`,
    renotify: true,
    silent: false,
    vibrate: [200, 100, 200, 100, 200],
    dir: payload.dir || 'rtl',
    lang: payload.lang || 'ar',
    timestamp: Date.now(),
    requireInteraction: false,
    data: { url: payload.url || '/notifications' },
  };

  event.waitUntil(self.registration.showNotification(notificationTitle, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/notifications';
  const absolute = new URL(target, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (!client.url.startsWith(self.location.origin)) continue;
        if ('focus' in client) {
          if ('navigate' in client && typeof client.navigate === 'function') {
            return client.navigate(absolute).then(() => client.focus());
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(absolute);
      }
      return undefined;
    }),
  );
});
