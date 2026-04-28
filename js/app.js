/* ============================================
   GAMMA QUANT — APP DE ACESSO RÁPIDO (simples)
   ============================================ */

// ===== 1. SERVICE WORKER (registra o mínimo para Chrome aceitar como PWA instalável) =====
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js?v=8').then(reg => {
            // Verifica atualização no carregamento
            reg.update();
        }).catch(err => console.warn('SW falhou:', err));
    });
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

// ===== 4. PROFILE TOGGLES =====
function setupProfileToggle(btnSelector, viewSelector, storageKey) {
    const buttons = document.querySelectorAll(btnSelector);
    const views = document.querySelectorAll(viewSelector);

    const dataAttr = btnSelector.includes('course') ? 'profileCourse' : 'profile';
    const viewAttr = btnSelector.includes('course') ? 'viewCourse' : 'view';

    let saved = null;
    try { saved = localStorage.getItem(storageKey); } catch(e) {}

    function activate(profile) {
        buttons.forEach(b => {
            const isActive = b.dataset[dataAttr] === profile;
            b.classList.toggle('active', isActive);
            b.setAttribute('aria-selected', isActive);
        });
        views.forEach(v => {
            v.hidden = v.dataset[viewAttr] !== profile;
        });
        try { localStorage.setItem(storageKey, profile); } catch(e) {}
    }

    buttons.forEach(b => {
        b.addEventListener('click', () => activate(b.dataset[dataAttr]));
    });

    if (saved) activate(saved);
}

// ===== 5. BANNER DE INSTALAÇÃO (mostra apenas se não está instalado) =====
function setupInstallBanner() {
    const banner = document.getElementById('install-banner');
    if (!banner) return;

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true;

    if (isStandalone) return; // Já instalado, não mostra

    let dismissed = false;
    try {
        const until = parseInt(localStorage.getItem('install-dismissed-until') || '0', 10);
        if (until && Date.now() < until) dismissed = true;
    } catch(e) {}

    if (!dismissed) banner.hidden = false;
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    loadProtocol();
    updateMarketStatus();
    setInterval(updateMarketStatus, 1000);

    setupProfileToggle('.profile-btn[data-profile]', '.profile-view', 'gamma-profile');
    setupProfileToggle('.profile-btn[data-profile-course]', '.profile-view-course', 'gamma-profile-course');
    setupInstallBanner();

    setInterval(loadProtocol, 5 * 60 * 1000);
});
