const CACHE = 'sipai-v2';
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { self.clients.claim(); });
self.addEventListener('fetch', e => {
  e.respondWith(fetch(e.request).catch(() => new Response('offline')));
});
