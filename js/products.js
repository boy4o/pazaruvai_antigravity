/**
 * Pazaruvai.info — Products Engine
 * Adapted for real data format: data/{store}/{category-slug}.json
 */

/* ── Product Image Mapping ─────────────────────────── */
const PRODUCT_IMAGES = {};
const IMG_CACHE = {};

/**
 * Get a product image URL. Uses a free image proxy based on product name.
 * Falls back to category emoji placeholder.
 */
function getProductImageUrl(productName, category) {
    const key = productName.toLowerCase().trim();
    if (IMG_CACHE[key]) return IMG_CACHE[key];

    // Build a search-friendly query for the product
    const searchTerm = encodeURIComponent(productName + ' продукт');
    // Use DummyImage as reliable fallback with product initials
    const initials = productName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

    // Use a placeholder service that generates nice product-style images
    // We'll use placehold.co with dynamic text
    const url = `https://placehold.co/300x200/f5f7fa/1a1a2e?font=roboto&text=${encodeURIComponent(productName.substring(0, 20))}`;
    IMG_CACHE[key] = url;
    return url;
}

/* Category-specific fallback images using emoji */
function getCategoryFallbackEmoji(category) {
    const cat = getCategoryById(category);
    return cat ? cat.icon : '📦';
}

/* ── Fetch Products for a Category ──────────────────── */
async function fetchCategoryProducts(categoryId) {
    const base = getBasePath();
    const promises = STORE_IDS.map(store =>
        fetch(`${base}data/${store}/${categoryId}.json`)
            .then(r => r.ok ? r.json() : [])
            .then(products => products.map(p => normalizeProduct(p, store, categoryId)))
            .catch(() => [])
    );
    const results = await Promise.all(promises);
    return results.flat();
}

/* ── Fetch ALL Products (for search) ────────────────── */
async function fetchAllProducts() {
    const base = getBasePath();
    const promises = [];
    for (const cat of CATEGORIES) {
        for (const store of STORE_IDS) {
            promises.push(
                fetch(`${base}data/${store}/${cat.id}.json`)
                    .then(r => r.ok ? r.json() : [])
                    .then(products => products.map(p => normalizeProduct(p, store, cat.id)))
                    .catch(() => [])
            );
        }
    }
    const results = await Promise.all(promises);
    return results.flat();
}

/* ── Fetch Top Deals (products with biggest discounts) ── */
async function fetchTopDeals() {
    const base = getBasePath();
    const promises = [];
    for (const cat of CATEGORIES) {
        for (const store of STORE_IDS) {
            promises.push(
                fetch(`${base}data/${store}/${cat.id}.json`)
                    .then(r => r.ok ? r.json() : [])
                    .then(products => products.map(p => normalizeProduct(p, store, cat.id)))
                    .catch(() => [])
            );
        }
    }
    const results = await Promise.all(promises);
    const all = results.flat();
    return all.filter(p => p.discountPct && p.discountPct > 0)
              .sort((a, b) => b.discountPct - a.discountPct)
              .slice(0, 16);
}

/* ── Normalize product from real JSON format ────────── */
function normalizeProduct(raw, store, categoryId) {
    const parsed = parseDescription(raw.description || '');
    return {
        id: `${store}-${categoryId}-${raw.productId}`,
        name: raw.productName || '',
        brand: parsed.brand || '',
        store: store,
        category: categoryId,
        description: raw.description || '',
        matchKey: (raw.productName || '').toLowerCase().trim(),
        priceEUR: raw.promoPrice,
        oldPriceEUR: raw.regularPrice || null,
        discountPct: raw.discountPercentage || null,
        quantity: parsed.quantity || 1,
        unit: parsed.unit || 'pcs',
        loyaltyCard: raw.loyaltyCard ? STORES[store]?.loyaltyCard : null,
        validFrom: raw.validFrom || '',
        validTo: raw.validTo || '',
        notes: raw.notes || '',
        image: ''
    };
}

/* ── Parse description to extract brand, quantity, unit ── */
function parseDescription(desc) {
    if (!desc) return {};
    const result = {};

    const qtyMatch = desc.match(/(\d+(?:[.,]\d+)?)\s*(кг|г|гр|л|мл|бр|x\s*\d+)/i);
    if (qtyMatch) {
        result.quantity = parseFloat(qtyMatch[1].replace(',', '.'));
        const rawUnit = qtyMatch[2].toLowerCase();
        if (rawUnit === 'кг') result.unit = 'kg';
        else if (rawUnit === 'г' || rawUnit === 'гр') result.unit = 'g';
        else if (rawUnit === 'л') result.unit = 'l';
        else if (rawUnit === 'мл') result.unit = 'ml';
        else if (rawUnit === 'бр') result.unit = 'pcs';
        else result.unit = 'pcs';
    }

    const parts = desc.split(',').map(s => s.trim());
    if (parts.length > 1) {
        if (parts[0].match(/^\d/)) {
            result.brand = parts.length > 1 ? parts[1] : '';
        } else {
            result.brand = parts[0];
        }
    }

    return result;
}

/* ── Compute normalized price per kg/L/pc ───────────── */
function computeNormalizedPrice(price, quantity, unit) {
    if (!price || !quantity) return price;
    switch (unit) {
        case 'g': return (price / quantity) * 1000;
        case 'ml': return (price / quantity) * 1000;
        case 'kg': case 'l': return price / quantity;
        default: return price;
    }
}

function unitLabel(unit) {
    if (unit === 'g' || unit === 'kg') return '/кг';
    if (unit === 'ml' || unit === 'l') return '/л';
    if (unit === 'pcs') return '/бр.';
    return '';
}

/* ── Group Products by matchKey ─────────────────────── */
function groupProducts(products) {
    const groups = {};
    products.forEach(p => {
        const key = p.matchKey;
        if (!groups[key]) {
            groups[key] = {
                matchKey: key,
                name: p.name,
                brand: p.brand,
                image: p.image || '',
                quantity: p.quantity,
                unit: p.unit,
                category: p.category,
                description: p.description,
                offers: []
            };
        }
        const normPrice = computeNormalizedPrice(p.priceEUR, p.quantity, p.unit);
        groups[key].offers.push({
            store: p.store,
            priceEUR: p.priceEUR,
            oldPriceEUR: p.oldPriceEUR,
            discountPct: p.discountPct,
            loyaltyCard: p.loyaltyCard,
            normalizedPriceEUR: normPrice,
            validFrom: p.validFrom,
            validTo: p.validTo,
            description: p.description,
            notes: p.notes,
            image: p.image
        });
    });

    Object.values(groups).forEach(g => {
        const prices = g.offers.map(o => o.priceEUR).filter(p => p != null);
        g.bestPrice = prices.length ? Math.min(...prices) : 0;
        g.worstPrice = prices.length ? Math.max(...prices) : 0;
        g.bestStore = g.offers.find(o => o.priceEUR === g.bestPrice)?.store;
        g.maxDiscount = Math.max(...g.offers.map(o => o.discountPct || 0));
        const normPrices = g.offers.map(o => o.normalizedPriceEUR).filter(p => p != null && !isNaN(p));
        g.normalizedBestPrice = normPrices.length ? Math.min(...normPrices) : g.bestPrice;
        g.offers.forEach(o => { o.isBest = o.priceEUR === g.bestPrice && g.offers.length > 1; });
        g.offers.sort((a, b) => (a.priceEUR || 0) - (b.priceEUR || 0));
    });

    return Object.values(groups);
}

/* ── Filter Groups ──────────────────────────────────── */
function filterGroups(groups, { store = 'all', search = '' } = {}) {
    return groups.filter(g => {
        const matchStore = store === 'all' || g.offers.some(o => o.store === store);
        const matchSearch = !search || g.name.toLowerCase().includes(search.toLowerCase()) ||
            g.description.toLowerCase().includes(search.toLowerCase());
        return matchStore && matchSearch;
    }).map(g => {
        if (store !== 'all') {
            return { ...g, offers: g.offers.filter(o => o.store === store) };
        }
        return g;
    });
}

/* ── Sort Groups ────────────────────────────────────── */
function sortGroups(groups, sortBy = 'price_asc') {
    const sorted = [...groups];
    switch (sortBy) {
        case 'price_asc': sorted.sort((a, b) => a.bestPrice - b.bestPrice); break;
        case 'price_desc': sorted.sort((a, b) => b.bestPrice - a.bestPrice); break;
        case 'discount_desc': sorted.sort((a, b) => b.maxDiscount - a.maxDiscount); break;
        case 'name_asc': sorted.sort((a, b) => a.name.localeCompare(b.name, 'bg')); break;
    }
    return sorted;
}

/* ── Render Product Card ────────────────────────────── */
function renderProductCard(group, currency) {
    const cat = getCategoryById(group.category);
    const catIcon = cat ? cat.icon : '📦';
    const discountBadge = group.maxDiscount > 0
        ? `<div class="badge-discount">-${group.maxDiscount}%</div>` : '';
    const bestBadge = group.offers.length > 1
        ? `<div class="badge-best">⭐ Топ цена</div>` : '';

    // Product image — use placehold.co with product name
    const imgUrl = getProductImageUrl(group.name, group.category);
    const imgHtml = `<img src="${imgUrl}" alt="${group.name}" loading="lazy" onerror="this.outerHTML='<div class=\\'placeholder-img\\'>${catIcon}</div>'">`;

    // Offers rows
    const offersHtml = group.offers.map(o => {
        const st = STORES[o.store] || {};
        const isBest = o.isBest ? ' best-offer' : '';
        const priceStr = formatPrice(o.priceEUR, currency);
        const oldStr = o.oldPriceEUR ? `<span class="offer-old-price">${formatPrice(o.oldPriceEUR, currency)}</span>` : '';
        const discStr = o.discountPct ? `<span class="offer-disc-badge">-${o.discountPct}%</span>` : '';
        const loyaltyHtml = o.loyaltyCard
            ? `<span class="loyalty-badge">${o.loyaltyCard}</span>` : '';
        return `
        <div class="offer-row${isBest}">
          <div class="offer-store">
            <span class="store-dot" style="background:${st.color || '#999'}"></span>
            <span class="store-name-label">${st.name || o.store}</span>
          </div>
          <div class="offer-prices">
            <div style="display:flex;align-items:center;gap:6px">
              ${oldStr} <span class="offer-price">${priceStr}</span> ${discStr}
            </div>
            ${loyaltyHtml}
          </div>
        </div>`;
    }).join('');

    // Normalized price
    const normLabel = unitLabel(group.unit);
    const normPrice = group.normalizedBestPrice && !isNaN(group.normalizedBestPrice)
        ? formatPrice(group.normalizedBestPrice, currency) : '';

    // Compare button (only if multiple offers)
    const compareBtn = group.offers.length > 1
        ? `<button class="btn-compare" onclick='openCompare(${JSON.stringify(group.matchKey).replace(/'/g, "\\'")})'> 📊 Сравни</button>`
        : '';

    // Details
    const uid = 'det-' + Math.random().toString(36).substr(2, 9);
    const validityHtml = group.offers.map(o => {
        if (!o.validFrom) return '';
        const st = STORES[o.store] || {};
        const noteStr = o.notes ? ` <em style="color:var(--c-text-muted)">(${o.notes})</em>` : '';
        return `<p class="validity">📅 ${st.name}: ${o.validFrom} — ${o.validTo}${noteStr}</p>`;
    }).filter(Boolean).join('');

    return `
    <article class="product-card">
      ${discountBadge}${bestBadge}
      <div class="product-img">${imgHtml}</div>
      <div class="product-info">
        <div class="product-name">${group.name}</div>
        <div class="product-brand">${group.brand || group.description}</div>
      </div>
      <div class="offers-list">${offersHtml}</div>
      <div class="product-footer">
        <div class="normalized-price">${normPrice ? `Норм: <strong>${normPrice}${normLabel}</strong>` : ''}</div>
        <div style="display:flex;gap:6px;align-items:center">
          ${compareBtn}
          <button class="details-toggle" onclick="toggleDetails('${uid}', this)">
            Детайли <span class="arrow">▼</span>
          </button>
        </div>
      </div>
      <div class="details-content" id="${uid}">
        <div class="details-inner">
          <p><strong>Описание:</strong> ${group.description}</p>
          <p><strong>Оферти от:</strong> ${group.offers.length} магазин${group.offers.length > 1 ? 'а' : ''}</p>
          ${validityHtml}
        </div>
      </div>
    </article>`;
}

function toggleDetails(id, btn) {
    const el = document.getElementById(id);
    if (el) { el.classList.toggle('open'); btn.classList.toggle('open'); }
}

/* ═══════════════════════════════════════════════════════
   COMPARISON MODAL
   ═══════════════════════════════════════════════════════ */

// Store all rendered groups globally for comparison access
let _allRenderedGroups = [];

function openCompare(matchKey) {
    const group = _allRenderedGroups.find(g => g.matchKey === matchKey);
    if (!group || group.offers.length < 2) return;

    const currency = (typeof currentCurrency !== 'undefined') ? currentCurrency : 'EUR';
    const bestPrice = group.bestPrice;
    const worstPrice = group.worstPrice;
    const savings = worstPrice - bestPrice;

    const rows = group.offers.map(o => {
        const st = STORES[o.store] || {};
        const isBest = o.priceEUR === bestPrice ? ' class="best-row"' : '';
        const priceStr = formatPrice(o.priceEUR, currency);
        const oldStr = o.oldPriceEUR ? `<span class="old-price">${formatPrice(o.oldPriceEUR, currency)}</span>` : '';
        const discStr = o.discountPct ? `<span class="discount-badge">-${o.discountPct}%</span>` : '';
        const normPrice = o.normalizedPriceEUR && !isNaN(o.normalizedPriceEUR)
            ? formatPrice(o.normalizedPriceEUR, currency) : '—';
        const loyaltyStr = o.loyaltyCard ? `<br><span class="loyalty-badge">${o.loyaltyCard}</span>` : '';
        const validStr = o.validFrom ? `${o.validFrom} — ${o.validTo}` : '—';
        const diff = o.priceEUR - bestPrice;
        const diffStr = diff > 0 ? `+${formatPrice(diff, currency)}` : (o.isBest ? '✅ Най-ниска' : '—');

        return `<tr${isBest}>
            <td><div class="store-cell"><span class="store-dot" style="background:${st.color}"></span>${st.name}</div></td>
            <td class="price-cell">${oldStr}${priceStr}${discStr}${loyaltyStr}</td>
            <td>${normPrice}${unitLabel(group.unit)}</td>
            <td>${diffStr}</td>
            <td style="font-size:.78rem;color:var(--c-text-muted)">${validStr}</td>
        </tr>`;
    }).join('');

    const savingsHtml = savings > 0 ? `
        <div class="compare-savings">
            💰 Спестяваш до <strong>${formatPrice(savings, currency)}</strong> 
            (${((savings / worstPrice) * 100).toFixed(0)}%) като купуваш от 
            <strong>${STORES[group.bestStore]?.name || group.bestStore}</strong> 
            вместо от най-скъпата оферта.
        </div>` : '';

    const modal = document.createElement('div');
    modal.className = 'compare-overlay';
    modal.id = 'compareModal';
    modal.innerHTML = `
        <div class="compare-modal">
            <div class="compare-header">
                <h3>📊 Сравнение на цени</h3>
                <button class="compare-close" onclick="closeCompare()">✕</button>
            </div>
            <div class="compare-body">
                <div class="compare-product-title">${group.name}</div>
                <div class="compare-product-desc">${group.description}</div>
                <table class="compare-table">
                    <thead>
                        <tr>
                            <th>Магазин</th>
                            <th>Цена</th>
                            <th>Норм. цена</th>
                            <th>Разлика</th>
                            <th>Валидност</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
                ${savingsHtml}
            </div>
        </div>`;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // Close on overlay click
    modal.addEventListener('click', e => {
        if (e.target === modal) closeCompare();
    });
    // Close on Escape
    document.addEventListener('keydown', function handler(e) {
        if (e.key === 'Escape') { closeCompare(); document.removeEventListener('keydown', handler); }
    });
}

function closeCompare() {
    const modal = document.getElementById('compareModal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
    }
}

/* ── Render Products Grid ───────────────────────────── */
function renderProductsGrid(container, groups, currency, view) {
    // Store groups globally for comparison access
    _allRenderedGroups = groups;

    if (!groups || groups.length === 0) {
        container.innerHTML = `
        <div class="empty-state">
          <div class="icon">🔍</div>
          <p>Няма намерени продукти по избраните критерии.</p>
        </div>`;
        return;
    }
    container.className = 'products-grid' + (view === 'list' ? ' list-view' : '');
    container.innerHTML = groups.map(g => renderProductCard(g, currency)).join('');
}

function showLoading(container) {
    container.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Зареждане на продукти...</p>
    </div>`;
}

/* ── Count all products for stats ───────────────────── */
async function countAllProducts() {
    const base = getBasePath();
    const byCat = {};
    const byStore = {};
    const promises = [];

    for (const cat of CATEGORIES) {
        for (const store of STORE_IDS) {
            promises.push(
                fetch(`${base}data/${store}/${cat.id}.json`)
                    .then(r => r.ok ? r.json() : [])
                    .then(products => ({ catId: cat.id, store, count: products.length }))
                    .catch(() => ({ catId: cat.id, store, count: 0 }))
            );
        }
    }
    const results = await Promise.all(promises);
    let total = 0;
    results.forEach(r => {
        total += r.count;
        byCat[r.catId] = (byCat[r.catId] || 0) + r.count;
        byStore[r.store] = (byStore[r.store] || 0) + r.count;
    });
    return { total, byCat, byStore };
}
