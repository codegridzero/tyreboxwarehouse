const CACHE_NAME = 'tire-warehouse-v1';
const ASSETS = [
  './',
  './index.html',
  './css/app.css',
  './manifest.json',
  './assets/lib/sql-wasm.js',
  './assets/lib/sql-wasm.wasm',
  './assets/icons/icon.svg',
  './js/app.js',
  './js/db.js',
  './js/router.js',
  './js/utils.js',
  './js/components/navbar.js',
  './js/components/sidebar.js',
  './js/components/modal.js',
  './js/components/toast.js',
  './js/services/inventoryService.js',
  './js/services/productService.js',
  './js/services/truckService.js',
  './js/services/dispatchService.js',
  './js/services/salesService.js',
  './js/services/returnService.js',
  './js/services/closingService.js',
  './js/services/reportService.js',
  './js/services/backupService.js',
  './js/services/seedData.js',
  './js/pages/dashboard.js',
  './js/pages/dailyControl.js',
  './js/pages/loading.js',
  './js/pages/sales.js',
  './js/pages/returns.js',
  './js/pages/inventory.js',
  './js/pages/products.js',
  './js/pages/trucks.js',
  './js/pages/reports.js',
  './js/pages/settings.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) return caches.delete(k);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      return cached || fetch(e.request).catch(() => cached);
    })
  );
});
