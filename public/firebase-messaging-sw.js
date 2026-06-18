// Service worker para notificaciones push en segundo plano (FCM Web Push).
// Intencionalmente sin dependencias CDN: maneja el evento push directamente
// con la Web Push API estándar. El campo webpush.notification del Admin SDK
// se entrega como JSON en event.data, compatible con este handler.

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let notification = {};
  try {
    const payload = event.data.json();
    notification = payload?.notification ?? {};
  } catch {
    return;
  }

  event.waitUntil(
    self.registration.showNotification(notification.title || 'Acontplus Recordatorios', {
      body:  notification.body  || '',
      icon:  notification.icon  || '/logo.png',
      badge: '/logo.png',
    })
  );
});
