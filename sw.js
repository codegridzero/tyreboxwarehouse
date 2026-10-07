// Service Worker with Network-First Strategy and Instant Cache Invalidation
const CACHE_NAME = 'tire-warehouse-v20261007';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// Network-First strategy: always fetch fresh from server, fallback to cache only if offline
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        return networkResponse;
      })
      .catch(() => caches.match(e.request))
  );
});
