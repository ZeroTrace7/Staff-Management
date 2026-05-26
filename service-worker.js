const CACHE_NAME = 'staff-management-v11';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/employee.html',
  '/owner.html',
  '/css/style.css',
  '/js/app.js',
  '/js/utils.js',
  '/js/offline-sync.js',
  '/js/location.js',
  '/js/camera.js',
  '/js/auth.js',
  '/js/attendance.js',
  '/js/admin-dashboard.js',
  '/js/supabase-client.js',
  '/manifest.json'
];

const RUNTIME_CACHE_HOSTS = new Set([
  'cdn.jsdelivr.net'
]);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
        return Promise.resolve();
      })))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isRuntimeCacheable = RUNTIME_CACHE_HOSTS.has(url.hostname);

  if (!isSameOrigin && !isRuntimeCacheable) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response || response.status !== 200) {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
