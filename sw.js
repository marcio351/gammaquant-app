// Service Worker — Gamma Quant App
const CACHE = 'gamma-app-v2';
const ASSETS = [
    '/',
    '/index.html',
    '/css/app.css',
    '/js/app.js',
    '/manifest.json',
    '/icons/logo-white.svg',
    '/icons/favicon.svg',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/icons/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE).then(c => c.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);

    // protocolo.json sempre da rede (dados frescos do dia)
    if (url.pathname.endsWith('/protocolo.json')) {
        e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
        return;
    }

    // Resto: cache-first com fallback de rede
    if (e.request.method === 'GET' && url.origin === location.origin) {
        e.respondWith(
            caches.match(e.request).then(resp =>
                resp || fetch(e.request).then(netResp => {
                    const copy = netResp.clone();
                    caches.open(CACHE).then(c => c.put(e.request, copy));
                    return netResp;
                }).catch(() => caches.match('/index.html'))
            )
        );
    }
});
