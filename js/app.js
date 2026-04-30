/* ============================================
   GAMMA QUANT — APP DE ACESSO RÁPIDO (simples)
   ============================================ */

// ===== 1. SERVICE WORKER =====
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js?v=14').then(reg => {
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
    markAsInstalled();
    hideInstallBanner();
});

function markAsInstalled() {
    try {
        localStorage.setItem('gamma-installed', '1');
        localStorage.setItem('install-dismissed-until', String(Date.now() + 1000 * 60 * 60 * 24 * 365));
    } catch(e) {}
}

function hideInstallBanner() {
    const banner = document.getElementById('install-banner');
    if (banner) banner.hidden = true;
}

function isAppInstalled() {
    // 1) Display modes que indicam PWA standalone
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
    if (window.matchMedia('(display-mode: minimal-ui)').matches) return true;
    if (window.matchMedia('(display-mode: fullscreen)').matches) return true;
    if (window.matchMedia('(display-mode: window-controls-overlay)').matches) return true;
    // 2) iOS Safari standalone
    if (window.navigator.standalone === true) return true;
    // 3) Android TWA / app shortcut: referrer começa com android-app://
    if (document.referrer && document.referrer.startsWith('android-app://')) return true;
    // 4) start_url no URL atual (?source=pwa) indica abertura via shortcut do PWA
    if (window.location.search.indexOf('source=pwa') >= 0) return true;
    // 5) Flag persistente
    try {
        if (localStorage.getItem('gamma-installed') === '1') return true;
        if (localStorage.getItem('install-banner-dismissed') === '1') return true;
    } catch(e) {}
    return false;
}

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

// ===== 4. BANNER DE INSTALAÇÃO (com detecção robusta) =====
async function setupInstallBanner() {
    const banner = document.getElementById('install-banner');
    if (!banner) return;

    // Sempre começa escondido — só revela depois de confirmar que NÃO está instalado
    banner.hidden = true;

    // 1) Já está rodando como app instalado (standalone)?
    if (isAppInstalled()) {
        markAsInstalled();
        return;
    }

    // 2) API moderna: getInstalledRelatedApps detecta PWA já instalado
    //    mesmo quando o user abre pelo browser
    if (navigator.getInstalledRelatedApps) {
        try {
            const related = await navigator.getInstalledRelatedApps();
            if (related && related.length > 0) {
                banner.hidden = true;
                markAsInstalled();
                return;
            }
        } catch(e) { /* ignora se API não suportada */ }
    }

    // 3) Flag manual de "já dispensado por 1 ano"
    let dismissed = false;
    try {
        const until = parseInt(localStorage.getItem('install-dismissed-until') || '0', 10);
        if (until && Date.now() < until) dismissed = true;
    } catch(e) {}

    if (dismissed) {
        banner.hidden = true;
        return;
    }

    // 4) Só mostra o banner se houver prompt nativo disponível (Chrome/Edge)
    //    OU se for iOS (que precisa do tutorial manual). Evita banner inútil.
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isAndroid = /Android/.test(ua);
    const isMobile = isIOS || isAndroid;

    if (!deferredInstallPrompt && !isIOS) {
        // Sem prompt nativo e não é iOS → não há como instalar agora,
        // espera o evento beforeinstallprompt disparar (revelação tardia)
        // OU o user pode clicar no link "Como instalar" no rodapé.
        // Aguarda 3s antes de revelar como fallback.
        setTimeout(() => {
            if (!deferredInstallPrompt && !isAppInstalled() && !isMobile) {
                // Desktop sem prompt → app provavelmente já está instalado
                markAsInstalled();
                banner.hidden = true;
            }
        }, 3000);
    }

    const sub = document.getElementById('install-banner-sub');

    // Botão fechar (X) — dispensa manual definitiva
    const closeBtn = document.getElementById('install-banner-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            try { localStorage.setItem('install-banner-dismissed', '1'); } catch(e) {}
            banner.hidden = true;
        });
    }

    banner.addEventListener('click', async (ev) => {
        ev.preventDefault();

        if (deferredInstallPrompt) {
            try {
                deferredInstallPrompt.prompt();
                const choice = await deferredInstallPrompt.userChoice;
                deferredInstallPrompt = null;
                if (choice && choice.outcome === 'accepted') {
                    markAsInstalled();
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

// ===== 5. INTERCEPTAÇÃO DE LINKS (não perder o app no desktop) =====
function setupLinkInterception() {
    const standalone = isAppInstalled();
    if (!standalone) return; // No browser comum, deixa comportamento default

    document.addEventListener('click', (ev) => {
        const link = ev.target.closest('a[href]');
        if (!link) return;

        const href = link.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

        const target = link.getAttribute('target');
        if (target !== '_blank') return; // só intercepta target=_blank

        // Em PWA standalone, window.open mantém foco no contexto do app
        // e evita que o link abra em outro monitor
        ev.preventDefault();
        try {
            const w = window.open(href, '_blank', 'noopener,noreferrer');
            if (w) w.focus();
        } catch(e) {
            // Fallback: navega no contexto atual
            window.location.href = href;
        }
    });
}

// ===== 6. VERSÃO + NOTIFICAÇÃO DE ATUALIZAÇÃO =====
async function checkVersion() {
    try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const { version, date, build } = await res.json();

        const footerEl = document.getElementById('footer-version');
        if (footerEl) footerEl.textContent = `v${version}`;

        let lastSeen = null;
        try { lastSeen = localStorage.getItem('last-seen-build'); } catch(e) {}

        if (!lastSeen) {
            try { localStorage.setItem('last-seen-build', build); } catch(e) {}
            return;
        }

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
    setupLinkInterception();
    checkVersion();

    setInterval(loadProtocol, 5 * 60 * 1000);
    setInterval(checkVersion, 5 * 60 * 1000);
});

// Re-checa banner quando display-mode muda (ex: user instala em outra aba)
window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
    if (e.matches) {
        markAsInstalled();
        hideInstallBanner();
    }
});
