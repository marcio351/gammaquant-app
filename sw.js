// Service Worker — Gamma Quant App
// Network-first com fallback offline mínimo. Satisfaz critério PWA do Chrome.

const VERSION = 'gamma-v16';
const OFFLINE_URL = '/index.html';

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(VERSION);
        try {
            await cache.add(new Request(OFFLINE_URL, { cache: 'reload' }));
        } catch (e) {}
        self.skipWaiting();
    })());
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)));
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', (event) => {
    const req = event.request;

    if (req.method !== 'GET') return;
    if (!req.url.startsWith(self.location.origin)) return;

    if (req.mode === 'navigate') {
        event.respondWith((async () => {
            try {
                const fresh = await fetch(req);
                return fresh;
            } catch (e) {
                const cache = await caches.open(VERSION);
                const cached = await cache.match(OFFLINE_URL);
                return cached || new Response('Offline', { status: 503 });
            }
        })());
        return;
    }

    event.respondWith((async () => {
        try {
            return await fetch(req);
        } catch (e) {
            const cache = await caches.open(VERSION);
            const cached = await cache.match(req);
            if (cached) return cached;
            return new Response('Offline', { status: 503 });
        }
    })());
});
