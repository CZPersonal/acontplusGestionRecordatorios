// Kill-switch SW: desregistra caches corruptos y cede el control a la red.
// No tiene fetch handler -> todas las peticiones van directo a Firebase Hosting.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(names.map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});
