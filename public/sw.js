// Service Worker para Notificaciones Nativas en Móvil y Escritorio (Personal Dashboard)

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (data && data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag } = data.payload || {};
    self.registration.showNotification(title || '⏰ ¡Hora de tu tarea!', {
      body: body || 'Tienes una tarea programada para este momento.',
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: tag || `task-${Date.now()}`,
      renotify: true,
      requireInteraction: true,
      vibrate: [300, 100, 300, 100, 500],
    });
  }
});
