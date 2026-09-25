self.addEventListener('push', (event) => {
  let payload = { title: 'Jori Store', body: '', url: '/notifications' };
  try {
    if (event.data) {
      payload = { ...payload, ...event.data.json() };
    }
  } catch {
    /* ignore */
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Jori Store', {
      body: payload.body || '',
      icon: '/pwa-192.png',
      badge: '/pwa-192.png',
      tag: `jori-push-${Date.now()}`,
      data: { url: payload.url || '/notifications' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/notifications';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(target);
      }
      return undefined;
    }),
  );
});
