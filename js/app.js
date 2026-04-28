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

// ===== 4. INSTALAÇÃO DO APP =====
let deferredPrompt = null;
const installBanner = document.getElementById('install-banner');
const installModal = document.getElementById('install-modal');
const installModalClose = document.getElementById('install-modal-close');
const installModalTitle = document.getElementById('install-modal-title');
const installModalPlatform = document.getElementById('install-modal-platform');
const installStepsContainer = document.getElementById('install-steps-container');
const installBannerText = installBanner?.querySelector('.install-banner-text');

const ua = navigator.userAgent;
const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
const isAndroid = /android/i.test(ua);
const isMacSafari = /Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Edg/.test(ua);
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

// Detecta navegadores internos de apps (WhatsApp, Instagram, Facebook, etc.)
const isInAppBrowser =
    /WhatsApp/i.test(ua) ||
    /Instagram/i.test(ua) ||
    /FBAN|FBAV/i.test(ua) ||  // Facebook
    /Line/i.test(ua) ||
    /MicroMessenger/i.test(ua) ||  // WeChat
    (/iPhone|iPad/i.test(ua) && !/Safari/i.test(ua)) ||
    (/iPhone|iPad/i.test(ua) && /CriOS|FxiOS|EdgiOS/i.test(ua));  // Chrome/Firefox/Edge no iOS também não suportam install

// Captura prompt nativo Android/Desktop (Chrome, Edge)
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
});

// Detecta se o app foi instalado
window.addEventListener('appinstalled', () => {
    if (installBanner) installBanner.hidden = true;
    if (installModal) installModal.hidden = true;
    deferredPrompt = null;
    document.body.style.overflow = '';
});

function closeInstallModal() {
    installModal.hidden = true;
    document.body.style.overflow = '';
}

function openInstallModal(html, title, platform) {
    installModalTitle.textContent = title;
    installModalPlatform.textContent = platform;
    installStepsContainer.innerHTML = html;
    installModal.hidden = false;
    document.body.style.overflow = 'hidden';

    // Re-vincular cliques dos botões de instalação dentro do modal
    const nativeBtn = installStepsContainer.querySelector('[data-action="native-install"]');
    if (nativeBtn) nativeBtn.addEventListener('click', triggerNativeInstall);

    const copyBtn = installStepsContainer.querySelector('[data-action="copy-url"]');
    if (copyBtn) copyBtn.addEventListener('click', copyAppUrl);
}

async function copyAppUrl() {
    try {
        await navigator.clipboard.writeText('https://app.gammaquant.com.br');
        const btn = document.querySelector('[data-action="copy-url"]');
        if (btn) {
            const original = btn.innerHTML;
            btn.innerHTML = '<span>✓ Link copiado!</span>';
            setTimeout(() => { btn.innerHTML = original; }, 2000);
        }
    } catch (e) {
        prompt('Copie o link:', 'https://app.gammaquant.com.br');
    }
}

async function triggerNativeInstall() {
    if (!deferredPrompt) {
        // Sem prompt nativo disponível — abrir modal com instruções manuais
        showManualAndroidInstructions();
        return;
    }
    closeInstallModal();
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted' && installBanner) {
        installBanner.hidden = true;
    }
    deferredPrompt = null;
}

function showManualAndroidInstructions() {
    openInstallModal(`
        <div class="install-step">
            <span class="install-step-num">1</span>
            <span>Toque no menu <strong>⋮</strong> (3 pontinhos) no canto superior direito do Chrome</span>
        </div>
        <div class="install-step">
            <span class="install-step-num">2</span>
            <span>Toque em <strong>"Instalar app"</strong> ou <strong>"Adicionar à tela inicial"</strong></span>
        </div>
        <div class="install-step">
            <span class="install-step-num">3</span>
            <span>Confirme tocando em <strong>"Instalar"</strong></span>
        </div>
    `, 'Instalar no Android', 'Chrome / Edge');
}

function showIOSInstructions() {
    openInstallModal(`
        <div class="install-step">
            <span class="install-step-num">1</span>
            <span>Toque no botão <strong>Compartilhar</strong> ⬆ na barra inferior</span>
        </div>
        <div class="install-step">
            <span class="install-step-num">2</span>
            <span>Role e toque em <strong>"Adicionar à Tela de Início"</strong> ➕</span>
        </div>
        <div class="install-step">
            <span class="install-step-num">3</span>
            <span>Toque em <strong>"Adicionar"</strong> no canto superior direito</span>
        </div>
    `, 'Instalar no iPhone', 'Safari');
}

function showInAppBrowserWarning() {
    const browserName = /WhatsApp/i.test(ua) ? 'WhatsApp' :
                        /Instagram/i.test(ua) ? 'Instagram' :
                        /FBAN|FBAV/i.test(ua) ? 'Facebook' :
                        'navegador interno';

    const safariOpenHtml = isIOS ? `
        <a href="x-safari-https://app.gammaquant.com.br" class="btn btn-primary" style="margin-bottom: 10px;">
            <span class="btn-icon">🧭</span>
            <span>Abrir no Safari</span>
        </a>
    ` : `
        <button class="btn btn-primary" data-action="copy-url" style="margin-bottom: 10px;">
            <span class="btn-icon">📋</span>
            <span>Copiar Link do App</span>
        </button>
    `;

    const manualSteps = isIOS ? `
        <div class="install-step">
            <span class="install-step-num">1</span>
            <span>Toque nos <strong>3 pontos</strong> ⋯ no canto superior direito</span>
        </div>
        <div class="install-step">
            <span class="install-step-num">2</span>
            <span>Toque em <strong>"Abrir no navegador"</strong> ou <strong>"Abrir no Safari"</strong></span>
        </div>
        <div class="install-step">
            <span class="install-step-num">3</span>
            <span>No Safari, toque no botão <strong>Compartilhar</strong> ⬆ → <strong>"Adicionar à Tela de Início"</strong></span>
        </div>
    ` : `
        <div class="install-step">
            <span class="install-step-num">1</span>
            <span>Toque nos <strong>3 pontos</strong> ⋮ no canto superior direito</span>
        </div>
        <div class="install-step">
            <span class="install-step-num">2</span>
            <span>Toque em <strong>"Abrir no navegador"</strong> (Chrome)</span>
        </div>
        <div class="install-step">
            <span class="install-step-num">3</span>
            <span>No Chrome, toque na faixa <strong>"Instalar app"</strong></span>
        </div>
    `;

    openInstallModal(`
        <div class="install-warning">
            ⚠️ Você abriu pelo <strong>${browserName}</strong>.<br>
            Para instalar, é preciso abrir no navegador.
        </div>
        ${safariOpenHtml}
        ${manualSteps}
    `, 'Abra no navegador', `Você está no ${browserName}`);
}

// ===== Lógica do banner por plataforma =====
function handleBannerClick() {
    if (isInAppBrowser) {
        showInAppBrowserWarning();
        return;
    }

    if (isAndroid) {
        // Android Chrome — tenta instalação nativa direto
        if (deferredPrompt) {
            triggerNativeInstall();
        } else {
            showManualAndroidInstructions();
        }
        return;
    }

    if (isIOS) {
        // iOS Safari — só dá pra instalar manualmente
        showIOSInstructions();
        return;
    }

    // Desktop — tenta instalação nativa direto
    if (deferredPrompt) {
        triggerNativeInstall();
    } else {
        openInstallModal(`
            <div class="install-step">
                <span class="install-step-num">1</span>
                <span>Clique no ícone <strong>⊕</strong> na barra de endereço (canto direito)</span>
            </div>
            <div class="install-step">
                <span class="install-step-num">2</span>
                <span>Ou clique no menu <strong>⋮</strong> → <strong>"Instalar Gamma Quant..."</strong></span>
            </div>
            <div class="install-step">
                <span class="install-step-num">3</span>
                <span>Confirme clicando em <strong>"Instalar"</strong></span>
            </div>
        `, 'Instalar no Computador', 'Chrome / Edge');
    }
}

// Mostra banner se não estiver instalado
if (!isStandalone) {
    installBanner.hidden = false;

    // Texto do banner muda se for navegador interno de app
    if (isInAppBrowser && installBannerText) {
        installBannerText.innerHTML = `
            <strong>Abra no navegador para instalar</strong>
            <span>Toque aqui para ver como</span>
        `;
    }
}

installBanner?.addEventListener('click', handleBannerClick);
installModalClose?.addEventListener('click', closeInstallModal);
installModal?.addEventListener('click', (e) => {
    if (e.target === installModal) closeInstallModal();
});

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
