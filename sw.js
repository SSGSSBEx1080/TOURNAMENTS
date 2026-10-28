/* GAMEpiada · service worker v4.8 (общие результаты и админка)
   Стратегия: навигация и JS/CSS — network-first (обновления приезжают сразу),
   картинки — cache-first, офлайн — из кеша.
   Данные Google Таблицы (gviz) и шрифты не кэшируются. */
const VERSION = 'gamepiada-v4.8.1';
const CORE = [
  './',
  './index.html',
  './styles.css',
  './data.js',
  './app.js',
  './favicon.svg',
  './site.webmanifest',
  './assets/arena.webp',
  './assets/og.jpg',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(CORE.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // gviz / fonts — только сеть

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(VERSION).then((cache) => cache.put('./index.html', copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match('./index.html').then((hit) => hit || caches.match('./')))
    );
    return;
  }

  /* Картинки и шрифты — cache-first: экономим трафик и держим офлайн. */
  if (/\.(png|jpe?g|webp|svg|gif|ico|woff2?|ttf)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(request, { ignoreSearch: true }).then((cached) => cached || fetch(request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(VERSION).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return response;
      }).catch(() => cached))
    );
    return;
  }

  /* JS/CSS/манифест — network-first: новая версия сайта видна сразу,
     кеш остаётся только как офлайн-фолбэк. */
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(VERSION).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true }).then((hit) => hit || caches.match('./index.html')))
  );
});
