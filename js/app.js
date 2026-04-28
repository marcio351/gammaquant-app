/* ============================================
   GAMMA QUANT — APP DE ACESSO RÁPIDO (simples)
   ============================================ */

// ===== 1. SERVICE WORKER =====
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js?v=12').then(reg => {
            reg.update();
        }).catch(err => console.warn('SW falhou:', err));
    });
}

// ===== 1.1 INSTALL PROMPT (Android/Chrome/Edge) =====
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    const banner = document.getElementById('install-banner');
    if (banner) banner.dataset.nativePrompt = '1';
});

window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    const banner = document.getElementById('install-banner');
    if (banner) banner.hidden = true;
    try { localStorage.setItem('install-dismissed-until', String(Date.now() + 1000 * 60 * 60 * 24 * 365)); } catch(e) {}
});

// ===== 2. PROTOCOLO DO DIA =====
async function loadProtocol() {
    try {
        const res = await fetch(`https://plataforma.gammaquant.com.br/protocolo.json?t=${Date.now()}`);
        if (!res.ok) throw new Error('Falha no fetch');
        const data = await res.json();

        const dateEl = document.getElementById('protocol-date');
        const liveBtn = document.getElementById('btn-live');
        const pdfBtn = document.getElementById('btn-pdf');

        const [y, m, d] = data.date.split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        const dateStr = dt.toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });
        dateEl.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

        liveBtn.href = data.videoUrl || '#';
        pdfBtn.href = data.pdfFile
            ? `https://plataforma.gammaquant.com.br/pdfs/${data.pdfFile}`
            : '#';
    } catch (err) {
        console.error('Erro ao carregar protocolo:', err);
        document.getElementById('protocol-date').textContent = 'Confira a live de hoje no canal';
    }
}

// ===== 3. STATUS DO PREGÃO + COUNTDOWN =====
function updateMarketStatus() {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const dow = now.getDay();

    const statusEl = document.getElementById('market-status');
    const dotEl = statusEl.querySelector('.status-dot');
    const textEl = statusEl.querySelector('.status-text');

    const isWeekday = dow >= 1 && dow <= 5;
    const minutesNow = h * 60 + m;
    const marketOpen = 10 * 60;
    const marketClose = 17 * 60;

    if (isWeekday && minutesNow >= marketOpen && minutesNow < marketClose) {
        dotEl.className = 'status-dot open';
        textEl.textContent = 'Pregão aberto';
    } else {
        dotEl.className = 'status-dot closed';
        textEl.textContent = isWeekday ? 'Pregão fechado' : 'Final de semana';
    }

    const countdownEl = document.getElementById('countdown');
    const countdownTime = document.getElementById('countdown-time');
    if (isWeekday) {
        const liveTarget = 8 * 60 + 30;
        if (minutesNow < liveTarget) {
            const diffMin = liveTarget - minutesNow;
            const hh = String(Math.floor(diffMin / 60)).padStart(2, '0');
            const mm = String(diffMin % 60).padStart(2, '0');
            const ss = String(60 - now.getSeconds()).padStart(2, '0');
            countdownTime.textContent = `${hh}:${mm}:${ss}`;
            countdownEl.hidden = false;
        } else {
            countdownEl.hidden = true;
        }
    } else {
        countdownEl.hidden = true;
    }
}

// ===== 4. BANNER DE INSTALAÇÃO =====
function setupInstallBanner() {
    const banner = document.getElementById('install-banner');
    if (!banner) return;

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true;

    if (isStandalone) return;

    let dismissed = false;
    try {
        const until = parseInt(localStorage.getItem('install-dismissed-until') || '0', 10);
        if (until && Date.now() < until) dismissed = true;
    } catch(e) {}

    if (dismissed) return;

    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const sub = document.getElementById('install-banner-sub');

    banner.addEventListener('click', async (ev) => {
        ev.preventDefault();

        if (deferredInstallPrompt) {
            try {
                deferredInstallPrompt.prompt();
                const choice = await deferredInstallPrompt.userChoice;
                deferredInstallPrompt = null;
                if (choice && choice.outcome === 'accepted') {
                    banner.hidden = true;
                } else {
                    window.location.href = '/como-instalar.html';
                }
            } catch (err) {
                window.location.href = '/como-instalar.html';
            }
            return;
        }

        window.location.href = '/como-instalar.html';
    });

    if (isIOS && sub) {
        sub.textContent = 'Toque para ver o passo a passo';
    }

    banner.hidden = false;
}

// ===== 6. VERSÃO + NOTIFICAÇÃO DE ATUALIZAÇÃO =====
async function checkVersion() {
    try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const { version, date, build } = await res.json();

        // Atualiza display da versão no footer
        const footerEl = document.getElementById('footer-version');
        if (footerEl) footerEl.textContent = `v${version}`;

        // Compara com versão vista anteriormente
        let lastSeen = null;
        try { lastSeen = localStorage.getItem('last-seen-build'); } catch(e) {}

        // Primeira visita: só registra (não mostra toast)
        if (!lastSeen) {
            try { localStorage.setItem('last-seen-build', build); } catch(e) {}
            return;
        }

        // Build mudou: mostra toast
        if (lastSeen !== build) {
            showUpdateToast();
            try { localStorage.setItem('last-seen-build', build); } catch(e) {}
        }
    } catch (e) {
        console.warn('Erro ao verificar versão:', e);
    }
}

function showUpdateToast() {
    const toast = document.getElementById('update-toast');
    if (!toast) return;
    toast.hidden = false;
    setTimeout(() => { toast.hidden = true; }, 3200);
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    loadProtocol();
    updateMarketStatus();
    setInterval(updateMarketStatus, 1000);

    setupInstallBanner();
    checkVersion();

    setInterval(loadProtocol, 5 * 60 * 1000);
    setInterval(checkVersion, 5 * 60 * 1000); // checa atualização a cada 5min
});
