// Cumhuriyet Sitesi PWA Service Worker
// Strateji:
// - HTML sayfaları: Network First (yeni içerik için), fallback cache
// - CSS/JS/Image: Cache First (performans için)
// - API istekleri: Network Only (cache'lenmez)

const CACHE_VERSION = 'cst-v1.0.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const PRECACHE_URLS = [
  '/',
  '/duyurular',
  '/iletisim',
  '/hakkinda',
  '/kentsel-donusum',
  '/anketler',
  '/css/style.css',
  '/js/main.js',
  '/images/logo.png',
  '/site-giris.jpg',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  console.log('[SW] Install:', CACHE_VERSION);
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('[SW] Precache eksik:', err.message);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activate');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !name.startsWith(CACHE_VERSION))
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Sadece same-origin istekler
  if (url.origin !== location.origin) return;

  // POST gibi non-GET istekleri cache'leme
  if (request.method !== 'GET') return;

  // API istekleri (sunucu tarafı): her zaman network
  if (url.pathname.startsWith('/__debug') ||
      url.pathname.startsWith('/yonetim') ||
      url.pathname.startsWith('/api/')) {
    return;
  }

  // Statik kaynaklar (CSS, JS, resim): Cache First
  if (request.destination === 'style' ||
      request.destination === 'script' ||
      request.destination === 'image' ||
      request.destination === 'font' ||
      url.pathname.match(/\.(css|js|png|jpg|jpeg|svg|gif|webp|woff2?)$/)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // HTML sayfaları: Network First with cache fallback
  if (request.destination === 'document' || request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  // Diğer: Network First
  event.respondWith(networkFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return new Response('Offline - kaynak yüklenemedi', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Son çare: offline fallback sayfası
    if (request.destination === 'document') {
      return caches.match('/');
    }
    return new Response('Offline', { status: 503 });
  }
}

// Push bildirim (VAPID / web-push)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch (e) {
    payload = { baslik: 'Cumhuriyet Sitesi', icerik: event.data.text() };
  }
  const baslik = payload.baslik || payload.title || 'Cumhuriyet Sitesi';
  const icerik = payload.icerik || payload.body || '';
  const url = payload.url || '/';
  const onemli = payload.onemli ? 1 : 0;
  const tag = (payload.kategori || 'genel') + '-' + url;
  const secenekler = {
    body: icerik,
    icon: payload.ikon || '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    data: url,
    tag: tag,
    renotify: true,
    requireInteraction: onemli === 1,
    vibrate: onemli === 1 ? [300, 150, 300, 150, 300] : [200, 100, 200]
  };
  event.waitUntil(self.registration.showNotification(baslik, secenekler));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data || '/';
  // Aynı tag'li eski bildirimleri kapat
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((winList) => {
        for (const w of winList) {
          if (w.url && new URL(w.url).pathname === url) {
            return w.focus();
          }
        }
        return clients.openWindow(url);
      })
  );
});
