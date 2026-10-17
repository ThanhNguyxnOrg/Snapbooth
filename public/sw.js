const CACHE_NAME = "snapbooth-v3";
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

// Fetch event:
// - Navigations and HTML: network-first so a new deploy is picked up
//   immediately; the cache only serves as the offline fallback.
// - Everything else (Vite-hashed assets, icons): cache-first, since their
//   URLs change with every build.
self.addEventListener("fetch", (e) => {
  // Only handle GET requests and local/relative requests
  if (e.request.method !== "GET") return;

  const url = new URL(e.request.url);
  // Avoid caching tmpfiles.org or external API queries
  if (url.origin !== self.location.origin) return;

  const isDocument =
    e.request.mode === "navigate" || url.pathname.endsWith(".html");

  if (isDocument) {
    e.respondWith(
      fetch(e.request)
        .then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, networkResponse.clone()));
          }
          return networkResponse;
        })
        .catch(() =>
          caches.match(e.request).then((cached) => cached || caches.match("./index.html"))
        )
    );
    return;
  }

  e.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(e.request);
      if (cached) return cached;
      try {
        const networkResponse = await fetch(e.request);
        if (networkResponse.status === 200) {
          cache.put(e.request, networkResponse.clone());
        }
        return networkResponse;
      } catch {
        // Offline and not cached: fail with a real network error response
        // instead of passing undefined to respondWith.
        return new Response("Offline", { status: 503, statusText: "Offline" });
      }
    })
  );
});
