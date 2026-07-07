const CACHE_NAME = "studi-shell-v2";
const SHELL_ASSETS = ["/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/")) {
    // Network-first for data — never serve stale API responses from cache.
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  if (request.mode === "navigate") {
    // Network-first for the HTML shell — a new deploy must be picked up
    // immediately when online. Otherwise this ends up pinned forever to
    // whatever JS/CSS bundle hashes were current the first time it was
    // cached, since the app shell (unlike hashed assets) never changes URL.
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copia = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copia));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
    );
    return;
  }

  // Cache-first for everything else (hashed JS/CSS bundles, icons): Vite
  // gives these content-hashed filenames, so a cached copy is always safe
  // to reuse and never goes stale under a fixed URL.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          const copia = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copia));
          return response;
        })
    )
  );
});
