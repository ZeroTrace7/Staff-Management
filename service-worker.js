const CACHE_NAME = 'staff-management-v1';
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

// Install event: cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching App Shell');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    }).then(() => self.clients.claim())
  );
});

// Fetch event: Network first, then cache fallback
self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip cross-origin requests, like those to Supabase API
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone and cache the successful response
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      })
      .catch(() => {
        // If network fails, try the cache
        return caches.match(event.request);
      })
  );
});

// Background Sync for offline attendance
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-attendance') {
    console.log('[Service Worker] Background sync triggered for attendance');
    // Call the sync function (this relies on the client notifying the service worker, 
    // or the SW doing the fetching itself. Since SW doesn't have direct access to localStorage,
    // usually we use IndexedDB for offline data storage to let SW read it).
    // For V1, we will trigger sync from the client side via 'online' event listener.
  }
});
