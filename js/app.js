/* ============================================
   GAMMA QUANT — APP DE ACESSO RÁPIDO (simples)
   ============================================ */

// ===== 1. SERVICE WORKER =====
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js?v=19').then(reg => {
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
    const wrap = document.getElementById('install-banner-wrap');
    if (wrap) wrap.hidden = true;
    const banner = document.getElementById('install-banner');
    if (banner) banner.hidden = true;
}

function showInstallBanner() {
    const wrap = document.getElementById('install-banner-wrap');
    if (wrap) wrap.hidden = false;
    const banner = document.getElementById('install-banner');
    if (banner) banner.hidden = false;
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
    // 5) Flag persistente de instalação confirmada
    try {
        if (localStorage.getItem('gamma-installed') === '1') return true;
    } catch(e) {}
    return false;
}

function shouldHideInstallBanner() {
    if (isAppInstalled()) return true;
    try {
        if (localStorage.getItem('install-banner-dismissed') === '1') return true;
        const until = parseInt(localStorage.getItem('install-dismissed-until') || '0', 10);
        if (until && Date.now() < until) return true;
    } catch(e) {}
    return false;
}

async function recheckInstalledState() {
    if (isAppInstalled()) {
        markAsInstalled();
        hideInstallBanner();
        return true;
    }
    if (navigator.getInstalledRelatedApps) {
        try {
            const related = await navigator.getInstalledRelatedApps();
            if (related && related.length > 0) {
                markAsInstalled();
                hideInstallBanner();
                return true;
            }
        } catch(e) {}
    }
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
        const weekdayRaw = dt.toLocaleDateString('pt-BR', { weekday: 'long' });
        const dayNum = dt.getDate();
        const monthRaw = dt.toLocaleDateString('pt-BR', { month: 'long' });
        const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
        dateEl.textContent = `${cap(weekdayRaw)}, ${dayNum} de ${cap(monthRaw)}`;

        liveBtn.href = data.videoUrl || '#';
        // Cache-busting com timestamp diário pra evitar PDF cacheado quando filename se repete
        const cacheBust = data.date ? data.date.replace(/-/g, '') : Date.now();
        pdfBtn.href = data.pdfFile
            ? `https://plataforma.gammaquant.com.br/${data.pdfFile}?t=${cacheBust}`
            : '#';
    } catch (err) {
        console.error('Erro ao carregar protocolo:', err);
        document.getElementById('protocol-date').textContent = 'Confira a live de hoje no canal';
    }
}

// ===== 3. FERIADOS NACIONAIS BR (fixos + móveis 2026-2028) =====
const HOLIDAYS_BR = new Set([
    // 2026
    '2026-01-01', // Confraternização Universal
    '2026-02-16', '2026-02-17', // Carnaval
    '2026-04-03', // Sexta-feira Santa
    '2026-04-21', // Tiradentes
    '2026-05-01', // Dia do Trabalho
    '2026-06-04', // Corpus Christi
    '2026-09-07', // Independência
    '2026-10-12', // N. Sra. Aparecida
    '2026-11-02', // Finados
    '2026-11-15', // Proclamação da República
    '2026-11-20', // Consciência Negra (federal)
    '2026-12-25', // Natal
    // 2027
    '2027-01-01',
    '2027-02-08', '2027-02-09', // Carnaval
    '2027-03-26', // Sexta-feira Santa
    '2027-04-21', '2027-05-01',
    '2027-05-27', // Corpus Christi
    '2027-09-07', '2027-10-12', '2027-11-02', '2027-11-15', '2027-11-20', '2027-12-25',
    // 2028
    '2028-01-01',
    '2028-02-28', '2028-02-29', // Carnaval
    '2028-04-14', // Sexta-feira Santa
    '2028-04-21', '2028-05-01',
    '2028-06-15', // Corpus Christi
    '2028-09-07', '2028-10-12', '2028-11-02', '2028-11-15', '2028-11-20', '2028-12-25'
]);

function ymd(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
}

function isBusinessDay(d) {
    const dow = d.getDay();
    if (dow === 0 || dow === 6) return false;
    if (HOLIDAYS_BR.has(ymd(d))) return false;
    return true;
}

// Próxima live (8h30 BRT em dia útil). Considera feriados.
function nextLiveDate(now) {
    const target = new Date(now);
    target.setHours(8, 30, 0, 0);
    // Se hoje já passou da hora ou não é dia útil, vai pro próximo
    while (target <= now || !isBusinessDay(target)) {
        target.setDate(target.getDate() + 1);
        target.setHours(8, 30, 0, 0);
    }
    return target;
}

function formatCountdown(ms) {
    if (ms <= 0) return '00:00:00';
    const totalSec = Math.floor(ms / 1000);
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    if (days > 0) {
        return `${days}d ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function nextLiveLabel(target, now) {
    const sameDay = target.getDate() === now.getDate() && target.getMonth() === now.getMonth() && target.getFullYear() === now.getFullYear();
    if (sameDay) return 'Próxima live em';
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (target.getDate() === tomorrow.getDate() && target.getMonth() === tomorrow.getMonth()) {
        return 'Próxima live amanhã em';
    }
    const diasSemana = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
    return `Próxima live ${diasSemana[target.getDay()]} em`;
}

function updateMarketStatus() {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();

    const statusEl = document.getElementById('market-status');
    const dotEl = statusEl.querySelector('.status-dot');
    const textEl = statusEl.querySelector('.status-text');

    const todayIsBusiness = isBusinessDay(now);
    const minutesNow = h * 60 + m;
    const marketOpen = 10 * 60;
    const marketClose = 17 * 60;

    if (todayIsBusiness && minutesNow >= marketOpen && minutesNow < marketClose) {
        dotEl.className = 'status-dot open';
        textEl.textContent = 'Pregão aberto';
    } else {
        dotEl.className = 'status-dot closed';
        if (HOLIDAYS_BR.has(ymd(now))) {
            textEl.textContent = 'Feriado nacional';
        } else if (now.getDay() === 0 || now.getDay() === 6) {
            textEl.textContent = 'Final de semana';
        } else {
            textEl.textContent = 'Pregão fechado';
        }
    }

    // Countdown SEMPRE visível: aponta pra próxima live útil (mesmo dia se ainda não foi, ou próximo dia útil)
    const countdownEl = document.getElementById('countdown');
    const countdownTime = document.getElementById('countdown-time');
    const countdownLabel = countdownEl ? countdownEl.querySelector('.countdown-label') : null;

    const target = nextLiveDate(now);
    const ms = target.getTime() - now.getTime();
    countdownTime.textContent = formatCountdown(ms);
    if (countdownLabel) countdownLabel.textContent = nextLiveLabel(target, now);
    countdownEl.hidden = false;
}

// ===== 4. BANNER DE INSTALAÇÃO (com detecção robusta) =====
async function setupInstallBanner() {
    const wrap = document.getElementById('install-banner-wrap');
    const banner = document.getElementById('install-banner');
    const closeBtn = document.getElementById('install-banner-close');
    if (!banner || !wrap) return;

    // Listener do X registrado SEMPRE — independente do estado do banner
    if (closeBtn && !closeBtn.dataset.bound) {
        closeBtn.dataset.bound = '1';
        closeBtn.addEventListener('click', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            ev.stopImmediatePropagation();
            try { localStorage.setItem('install-banner-dismissed', '1'); } catch(e) {}
            hideInstallBanner();
        });
    }

    // Sempre começa escondido — só revela depois de confirmar que NÃO está instalado
    hideInstallBanner();

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
    if (shouldHideInstallBanner()) {
        hideInstallBanner();
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

    showInstallBanner();
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

    setInterval(loadProtocol, 2 * 60 * 1000);
    setInterval(checkVersion, 2 * 60 * 1000);

    // Revalida quando o app volta ao foreground (user reabre PWA ou troca de aba)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            loadProtocol();
            checkVersion();
            recheckInstalledState();
        }
    });

    // Revalida também em focus (desktop, troca de janela)
    window.addEventListener('focus', () => {
        loadProtocol();
        checkVersion();
        recheckInstalledState();
    });

    // Polling de instalação por 60s após carregar (Chrome às vezes não dispara appinstalled)
    let pollCount = 0;
    const installPoll = setInterval(async () => {
        pollCount++;
        const installed = await recheckInstalledState();
        if (installed || pollCount >= 12) clearInterval(installPoll);
    }, 5000);
});

// Re-checa banner quando display-mode muda (ex: user instala em outra aba)
['standalone', 'minimal-ui', 'fullscreen', 'window-controls-overlay'].forEach(mode => {
    try {
        window.matchMedia(`(display-mode: ${mode})`).addEventListener('change', (e) => {
            if (e.matches) {
                markAsInstalled();
                hideInstallBanner();
            }
        });
    } catch(e) {}
});
