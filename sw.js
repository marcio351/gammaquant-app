// Service Worker — modo cleanup (não cacheia nada, só limpa antigos)
self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
        const regs = await self.registration ? [self.registration] : [];
        for (const reg of regs) {
            try { await reg.unregister(); } catch(e) {}
        }
        await self.clients.claim();
    })());
});

// Não intercepta nenhum fetch — sempre vai direto pra rede
