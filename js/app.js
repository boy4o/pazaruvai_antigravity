/**
 * Pazaruvai.info — App Shell
 * Shared header, footer, navigation, search
 */

let currentCurrency = 'EUR';
let currentView = 'grid';
let metaData = null;

/* ── Initialization ─────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
    const base = getBasePath();
    await loadMeta(base);
    renderHeader(base);
    renderFooter(base);
    document.getElementById('currentYear').textContent = new Date().getFullYear();
    if (typeof onPageReady === 'function') onPageReady();
});

async function loadMeta(base) {
    try {
        const r = await fetch(base + 'data/meta.json');
        if (r.ok) metaData = await r.json();
    } catch (e) { console.warn('meta.json not loaded', e); }
}

/* ── Header ─────────────────────────────────────────── */
function renderHeader(base) {
    const el = document.getElementById('site-header');
    if (!el) return;
    const catLinks = CATEGORIES.map(c =>
        `<a href="${base}pages/category.html?cat=${c.id}" class="cat-link" data-cat="${c.id}">
            <span class="cat-icon">${c.icon}</span>${c.name}
        </a>`
    ).join('');

    el.innerHTML = `
    <header class="site-header">
      <div class="container">
        <div class="header-top">
          <a href="${base}index.html" class="logo" aria-label="Начало">
            <img src="${base}images/logo.svg" alt="Pazaruvai.info" width="180" height="36">
          </a>
          <div class="search-box">
            <input type="text" id="globalSearch" placeholder="Търси продукт… (напр. &quot;Прясно мляко&quot;)" aria-label="Търсене на продукт">
            <button id="searchBtn" aria-label="Търсене">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <button class="btn-currency" id="currencyToggle" aria-label="Смяна на валута">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>
              <span class="curr-val" id="currDisplay">EUR</span>
            </button>
          </div>
        </div>
        <nav class="cat-nav" aria-label="Категории">${catLinks}</nav>
      </div>
    </header>`;

    // Highlight active category
    const params = new URLSearchParams(window.location.search);
    const activeCat = params.get('cat');
    if (activeCat) {
        el.querySelectorAll('.cat-link').forEach(a => {
            if (a.dataset.cat === activeCat) a.classList.add('active');
        });
    }

    // Search handler
    const searchInput = document.getElementById('globalSearch');
    const searchBtn = document.getElementById('searchBtn');
    function doSearch() {
        const q = searchInput.value.trim();
        if (q) window.location.href = base + 'pages/search.html?q=' + encodeURIComponent(q);
    }
    searchBtn.addEventListener('click', doSearch);
    searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });

    // Currency toggle
    document.getElementById('currencyToggle').addEventListener('click', () => {
        currentCurrency = currentCurrency === 'EUR' ? 'BGN' : 'EUR';
        document.getElementById('currDisplay').textContent = currentCurrency;
        if (typeof onCurrencyChange === 'function') onCurrencyChange(currentCurrency);
    });
}

/* ── Footer ─────────────────────────────────────────── */
function renderFooter(base) {
    const el = document.getElementById('site-footer');
    if (!el) return;
    const lastUpdate = metaData?.lastUpdated
        ? new Date(metaData.lastUpdated).toLocaleDateString('bg-BG')
        : new Date().toLocaleDateString('bg-BG');

    el.innerHTML = `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            <div class="footer-logo">
              <img src="${base}images/logo.svg" alt="Pazaruvai.info" width="160" style="filter:brightness(0) invert(1);opacity:.7">
            </div>
            <p>Данните се събират от публично достъпните брошури и уебсайтове на Lidl, Kaufland, Billa и Фантастико. Pazaruvai.info не носи отговорност за неточности в посочените цени.</p>
          </div>
          <div class="footer-col">
            <h4>Информация</h4>
            <a href="${base}pages/terms.html">Общи условия</a>
            <a href="${base}pages/privacy.html">Поверителност</a>
            <a href="${base}pages/gdpr.html">GDPR</a>
            <a href="${base}pages/cookies.html">Бисквитки</a>
            <a href="${base}pages/disclaimer.html">Отказ от отговорност</a>
          </div>
          <div class="footer-col">
            <h4>Контакт</h4>
            <a href="${base}pages/contact.html">Форма за контакт</a>
            <a href="mailto:contact@pazaruvai.info">contact@pazaruvai.info</a>
          </div>
        </div>
        <div class="footer-bottom">
          <span>&copy; <span id="currentYear"></span> Pazaruvai.info. Всички права запазени.</span>
          <div class="footer-update">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            Последна актуализация: <strong>${lastUpdate}</strong>
          </div>
        </div>
      </div>
    </footer>`;
    const yr = el.querySelector('#currentYear');
    if (yr) yr.textContent = new Date().getFullYear();
}
