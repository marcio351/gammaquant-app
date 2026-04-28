// Service Worker — Gamma Quant App
const CACHE = 'gamma-app-v5';
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

self.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);
    if (e.request.method !== 'GET' || url.origin !== location.origin) return;

    // protocolo.json e HTML: SEMPRE network-first (nunca servir versão velha)
    const isHTML = e.request.headers.get('accept')?.includes('text/html')
        || url.pathname === '/'
        || url.pathname.endsWith('.html');

    if (isHTML || url.pathname.endsWith('/protocolo.json') || url.pathname.endsWith('/sw.js') || url.pathname.endsWith('/manifest.json')) {
        e.respondWith(
            fetch(e.request).then(netResp => {
                const copy = netResp.clone();
                caches.open(CACHE).then(c => c.put(e.request, copy));
                return netResp;
            }).catch(() => caches.match(e.request) || caches.match('/index.html'))
        );
        return;
    }

    // Assets estáticos (CSS, JS, ícones): cache-first
    e.respondWith(
        caches.match(e.request).then(resp =>
            resp || fetch(e.request).then(netResp => {
                const copy = netResp.clone();
                caches.open(CACHE).then(c => c.put(e.request, copy));
                return netResp;
            })
        )
    );
});
