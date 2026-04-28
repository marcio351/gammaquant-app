/* ============================================
   GAMMA QUANT — APP DE ACESSO RÁPIDO
   ============================================ */

// ===== 1. FETCH PROTOCOLO DO DIA =====
async function loadProtocol() {
    try {
        const res = await fetch(`https://plataforma.gammaquant.com.br/protocolo.json?t=${Date.now()}`);
        if (!res.ok) throw new Error('Falha no fetch');
        const data = await res.json();

        const dateEl = document.getElementById('protocol-date');
        const liveBtn = document.getElementById('btn-live');
        const pdfBtn = document.getElementById('btn-pdf');

        // Formata data PT-BR (ex: "Terça-feira, 28 de Abril")
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

// ===== 2. STATUS DO PREGÃO + COUNTDOWN PARA LIVE =====
function updateMarketStatus() {
    const now = new Date();
    const brOffset = -3 * 60; // BRT = UTC-3
    const localOffset = now.getTimezoneOffset();
    const br = new Date(now.getTime() + (localOffset - (-brOffset * -1)) * 60000);
    // Simplificação: usar horário local do dispositivo (assume BRT)
    const h = now.getHours();
    const m = now.getMinutes();
    const dow = now.getDay(); // 0=dom, 6=sab

    const statusEl = document.getElementById('market-status');
    const dotEl = statusEl.querySelector('.status-dot');
    const textEl = statusEl.querySelector('.status-text');

    const isWeekday = dow >= 1 && dow <= 5;
    const minutesNow = h * 60 + m;
    const marketOpen = 10 * 60;   // 10:00
    const marketClose = 17 * 60;  // 17:00 (B3 simplificado)

    if (isWeekday && minutesNow >= marketOpen && minutesNow < marketClose) {
        dotEl.className = 'status-dot open';
        textEl.textContent = 'Pregão aberto';
    } else {
        dotEl.className = 'status-dot closed';
        textEl.textContent = isWeekday ? 'Pregão fechado' : 'Final de semana';
    }

    // Countdown para a live (8h30 dias úteis)
    const countdownEl = document.getElementById('countdown');
    const countdownTime = document.getElementById('countdown-time');
    if (isWeekday) {
        const liveTarget = 8 * 60 + 30; // 8:30
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

// ===== 3. PROFILE TOGGLES (Plataforma + Cursos) =====
function setupProfileToggle(btnSelector, viewSelector, storageKey) {
    const buttons = document.querySelectorAll(btnSelector);
    const views = document.querySelectorAll(viewSelector);

    const dataAttr = btnSelector.includes('course') ? 'profileCourse' : 'profile';
    const viewAttr = btnSelector.includes('course') ? 'viewCourse' : 'view';

    const saved = localStorage.getItem(storageKey);

    function activate(profile) {
        buttons.forEach(b => {
            const isActive = b.dataset[dataAttr] === profile;
            b.classList.toggle('active', isActive);
            b.setAttribute('aria-selected', isActive);
        });
        views.forEach(v => {
            v.hidden = v.dataset[viewAttr] !== profile;
        });
        localStorage.setItem(storageKey, profile);
    }

    buttons.forEach(b => {
        b.addEventListener('click', () => activate(b.dataset[dataAttr]));
    });

    if (saved) activate(saved);
}

// ===== 4. PWA INSTALL PROMPT =====
let deferredPrompt = null;
const installPrompt = document.getElementById('install-prompt');
const installBtn = document.getElementById('install-btn');
const installClose = document.getElementById('install-close');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (!localStorage.getItem('install-dismissed')) {
        installPrompt.hidden = false;
    }
});

installBtn?.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
        installPrompt.hidden = true;
    }
    deferredPrompt = null;
});

installClose?.addEventListener('click', () => {
    installPrompt.hidden = true;
    localStorage.setItem('install-dismissed', '1');
});

// iOS hint (sem beforeinstallprompt no Safari)
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
if (isIOS && !isStandalone && !localStorage.getItem('install-dismissed')) {
    installPrompt.querySelector('span').textContent = '📱 Toque em "Compartilhar" → "Adicionar à Tela de Início"';
    installBtn.hidden = true;
    installPrompt.hidden = false;
}

// ===== 5. SERVICE WORKER (offline) =====
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err =>
            console.warn('SW falhou:', err)
        );
    });
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    loadProtocol();
    updateMarketStatus();
    setInterval(updateMarketStatus, 1000);

    setupProfileToggle('.profile-btn[data-profile]', '.profile-view', 'gamma-profile');
    setupProfileToggle('.profile-btn[data-profile-course]', '.profile-view-course', 'gamma-profile-course');

    // Reabre protocolo a cada 5 min (caso usuário deixe app aberto)
    setInterval(loadProtocol, 5 * 60 * 1000);
});
