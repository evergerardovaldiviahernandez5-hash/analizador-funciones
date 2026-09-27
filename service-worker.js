/* =========================================================
   service-worker.js
   Estrategia:
     - HTML / navegación:  network-first
     - Assets (css/js/png): cache-first con relleno en background
   ========================================================= */
'use strict';

const CACHE = 'af-cache-v28-1';   // ← bump: invalida cachés viejas

const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  // Vendor
  './js/vendor/math.min.js',
  './js/vendor/nerdamer.core.js',
  './js/vendor/Algebra.js',
  './js/vendor/Calculus.js',
  './js/vendor/Solve.js',
  './js/vendor/katex/katex.min.js',
  './js/vendor/katex/katex.min.css',
  // App
  './js/stability.js',
  './js/health.js',
  './js/recovery.js',
  './js/guardian.js',
  './js/input-validation.js',
  './js/core-utils.js',
  './js/parser.js',
  './js/math-render.js',
  './js/format.js',
  './js/graph.js',
  './js/custom_icons.js',
  './js/cores.js',
  './js/modules-extra.js',
  './js/settings.js',
  './js/i18n-strings.js',
  './js/app.js',
  './js/ui-enhancements.js',
  './js/ui-v14.js',
  './js/ui-v15.js',
  // Iconos
  './icons/icon.png',
  './icons/icon-192.png',
  './js/ui-v13.js'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => {
      return Promise.all(
        PRECACHE.map((url) =>
          cache.add(url).catch((err) => console.warn('[SW] No se pudo cachear:', url, err))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isHTML = req.mode === 'navigate' ||
                 (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => cached);
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});