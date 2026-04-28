# Gamma Quant — App de Acesso Rápido (PWA)

Cartão digital instalável no celular com acesso a:

- **Protocolo Gamma** (live diária 8h30 + PDF do dia) — grátis
- **Plataforma Gamma** (assinante: entrar/renovar | visitante: assinar agora)
- **Cursos Gamma** (aluno: área de membros | lead: catálogo) — preparado, ativar depois
- **Utilitários** (calendário econômico, Nasdaq ao vivo, Ibovespa ao vivo)
- **Status do pregão** + **countdown para a live**

## Estrutura

```
app-gamma/
├── index.html          # Tela única
├── manifest.json       # PWA config
├── sw.js               # Service Worker (offline)
├── css/app.css         # Tema laranja + preto
├── js/app.js           # Lógica (fetch protocolo, toggles, install)
├── icons/
│   ├── favicon.svg
│   ├── logo-white.svg
│   ├── logo-symbol.png
│   ├── icon-192.png    # PWA icon (gerado)
│   └── icon-512.png    # PWA icon (gerado)
└── README.md
```

## Como rodar local

Qualquer servidor HTTP estático na raiz do projeto funciona:

```bash
# opção 1 — Python
cd "H:/Trabalho/Gamma Quant/app-gamma"
python -m http.server 8080

# opção 2 — Node
npx serve .
```

Abrir: http://localhost:8080

> PWA exige HTTPS em produção (service worker, install prompt).

## Deploy

### Opção A — Cloudflare Pages (recomendado)

Mesmo padrão do site institucional:

1. Criar repo no GitHub: `marcio351/gammaquant-app`
2. Conectar no Cloudflare Pages
3. Configurar custom domain: `app.gammaquant.com.br`
4. Deploy automático em cada push

### Opção B — Hostinger

1. FTP/Git deploy para subdomínio `app.gammaquant.com.br`
2. Garantir que pasta raiz aponta para `/app-gamma/`
3. Habilitar HTTPS no painel

## Customização rápida

| O que mudar | Onde |
|---|---|
| URL da plataforma | `index.html` (busca por `plataforma.gammaquant.com.br`) |
| URL de renovação | `index.html` → `href="https://plataforma.gammaquant.com.br/renovar"` |
| Página de oferta | `index.html` → `href="...#oferta"` |
| Ativar cursos | `index.html` → remover `disabled` e `badge-soon`, trocar URLs |
| Cores | `css/app.css` → variáveis `:root` |
| Horário da live | `js/app.js` → `liveTarget = 8 * 60 + 30` |

## Ativação dos Cursos (futuro)

No `index.html`, dentro de `<section class="card card-courses">`:

```html
<!-- Trocar este botão -->
<button class="btn btn-primary btn-disabled" disabled>
    <span class="btn-icon">📚</span>
    <span>Área do Aluno</span>
    <span class="badge-soon">em breve</span>
</button>

<!-- Por: -->
<a href="URL_DA_AREA_DE_MEMBROS" class="btn btn-primary" target="_blank" rel="noopener">
    <span class="btn-icon">📚</span>
    <span>Área do Aluno</span>
</a>
```

Repetir para o botão "Ver Cursos Disponíveis" → URL do catálogo de checkout.
