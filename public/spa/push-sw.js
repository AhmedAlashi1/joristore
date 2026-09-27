self.addEventListener('push', (event) => {
  let payload = { title: 'Jori Store', body: '', url: '/notifications' };
  try {
    if (event.data) {
      payload = { ...payload, ...event.data.json() };
    }
  } catch {
    /* ignore */
  }

  const title = payload.title || 'Jori Store';
  const options = {
    body: payload.body || '',
    icon: '/pwa-192.png',
    badge: '/pwa-192.png',
    tag: 'jori-store-push',
    renotify: true,
    silent: false,
    vibrate: [180, 80, 180],
    data: { url: payload.url || '/notifications' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/notifications';
  const absolute = new URL(target, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
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
