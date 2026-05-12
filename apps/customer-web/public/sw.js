/*
 * Mundial 26 — Service Worker
 * Precache of the app shell + runtime cache for CDN fonts/scripts.
 * Strategy: cache-first for app shell, stale-while-revalidate for CDN assets.
 */
const VERSION = "mundial26-v1.9.5";
const SHELL_CACHE = `shell-${VERSION}`;
const RUNTIME_CACHE = `runtime-${VERSION}`;

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-180.png",
  "./icons/icon-167.png",
  "./icons/icon-152.png",
  "./icons/icon-120.png",
  "./icons/icon-master.svg",
];

// Install — precache the shell. We deliberately do NOT call skipWaiting()
// here: the new SW stays in `waiting` until the page asks us to activate it
// via postMessage({type:"SKIP_WAITING"}). That gives the user a chance to
// finish what they're doing before the controller swaps under them.
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(SHELL_CACHE).then((c) => c.addAll(APP_SHELL))
  );
});

// Activate — drop every cache whose name doesn't match the CURRENT VERSION.
// Both SHELL_CACHE and RUNTIME_CACHE are versioned (e.g. `shell-mundial26-v1.0.2`),
// so any cache from a previous VERSION (incl. older shell + runtime) is cleaned.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Allow the page to ask the waiting SW to activate immediately.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Fetch strategy
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isCDN = /unpkg\.com|cdn\.tailwindcss\.com|fonts\.googleapis\.com|fonts\.gstatic\.com/.test(url.hostname);

  if (isSameOrigin) {
    // Cache-first for app shell
    event.respondWith(
      caches.match(req).then((cached) => {
        return (
          cached ||
          fetch(req).then((res) => {
            // Only cache successful responses
            if (res.ok) {
              const copy = res.clone();
              caches.open(SHELL_CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }).catch(() => caches.match("./index.html"))
        );
      })
    );
    return;
  }

  if (isCDN) {
    // Stale-while-revalidate
    event.respondWith(
      caches.open(RUNTIME_CACHE).then((cache) =>
        cache.match(req).then((cached) => {
          const network = fetch(req).then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          }).catch(() => cached);
          return cached || network;
        })
      )
    );
  }
});
