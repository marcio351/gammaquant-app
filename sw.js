// Service Worker mínimo — satisfaz critério de PWA instalável do Chrome
// SEM CACHE — sempre vai à rede. Só existe pra Chrome aceitar o install.

const VERSION = 'gamma-v8';

self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil((async () => {
        // Limpa qualquer cache antigo
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
        await self.clients.claim();
    })());
});

// Fetch handler obrigatório pro Chrome reconhecer como PWA
// Mas só passa direto pra rede — sem cache, sem interceptação real
self.addEventListener('fetch', (e) => {
    // Deixa o browser lidar normalmente — não interceptamos
    return;
});
