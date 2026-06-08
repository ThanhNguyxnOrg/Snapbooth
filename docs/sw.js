const CACHE_NAME = "snapbooth-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./favicon.svg",
  "./icon-192.png",
  "./icon-512.png"
];

// Install event
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate event
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event (Stale-While-Revalidate pattern)
self.addEventListener("fetch", (e) => {
  // Only handle GET requests and local/relative requests
  if (e.request.method !== "GET") return;

  const url = new URL(e.request.url);
  // Avoid caching tmpfiles.org or external API queries
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(e.request).then((cachedResponse) => {
        const fetchedResponse = fetch(e.request).then((networkResponse) => {
          // Cache successful responses from our own domain
          if (networkResponse.status === 200) {
            cache.put(e.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // Offline fallback
          return cachedResponse;
        });

        return cachedResponse || fetchedResponse;
      });
    })
  );
});
