/* Minimal service worker: app-shell caching + offline fallback. API calls are never cached. */
const VERSION = 'srkians-v1';
const SHELL = ['/', '/offline.html', '/favicon.svg', '/manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io')) return;

  if (request.mode === 'navigate') {
    e.respondWith(fetch(request).catch(() => caches.match('/offline.html')));
    return;
  }
  if (url.origin === location.origin && url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.match(request).then(
        (hit) => hit || fetch(request).then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(request, copy));
          return res;
        })
      )
    );
  }
});

// Firebase Cloud Messaging-ready: display pushes sent with a notification payload.
self.addEventListener('push', (e) => {
  if (!e.data) return;
  let data = {};
  try { data = e.data.json(); } catch { data = { notification: { title: 'SRKians', body: e.data.text() } }; }
  const n = data.notification || data;
  e.waitUntil(self.registration.showNotification(n.title || 'SRKians', { body: n.body, icon: '/icons/icon.svg', data: { link: data.fcmOptions?.link || n.link || '/' } }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.openWindow(e.notification.data?.link || '/'));
});
