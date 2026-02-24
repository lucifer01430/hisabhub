const CACHE_VERSION = "expense-tracker-v1";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./app.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(event.request)
        .then((response) => {
          const responseClone = response.clone();
          if (event.request.url.startsWith(self.location.origin) || event.request.url.includes("cdn.jsdelivr.net")) {
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, responseClone));
          }
          return response;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
