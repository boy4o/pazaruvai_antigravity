/**
 * Pazaruvai.info — Products Engine
 * Adapted for real data format: data/{store}/{category-slug}.json
 * Fields: productId, productName, description, promoPrice, regularPrice,
 *         discountPercentage, validFrom, validTo, loyaltyCard (bool), notes
 */

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
    const allProducts = [];
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
    // Return products with discounts, sorted by biggest discount
    return all.filter(p => p.discountPct && p.discountPct > 0)
              .sort((a, b) => b.discountPct - a.discountPct)
              .slice(0, 16);
}

/* ── Normalize product from real JSON format ────────── */
function normalizeProduct(raw, store, categoryId) {
    // Parse quantity and unit from description
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

    // Try to extract quantity patterns like "1 кг", "500 г", "1 л", "250 мл", etc.
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

    // Try to extract brand (first part of description before comma)
    const parts = desc.split(',').map(s => s.trim());
    if (parts.length > 1) {
        // The brand may be the second part if first is quantity
        // or first part if it's a name
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

    // Calculate aggregates per group
    Object.values(groups).forEach(g => {
        const prices = g.offers.map(o => o.priceEUR).filter(p => p != null);
        g.bestPrice = prices.length ? Math.min(...prices) : 0;
        g.bestStore = g.offers.find(o => o.priceEUR === g.bestPrice)?.store;
        g.maxDiscount = Math.max(...g.offers.map(o => o.discountPct || 0));
        const normPrices = g.offers.map(o => o.normalizedPriceEUR).filter(p => p != null && !isNaN(p));
        g.normalizedBestPrice = normPrices.length ? Math.min(...normPrices) : g.bestPrice;
        // Mark best offer
        g.offers.forEach(o => { o.isBest = o.priceEUR === g.bestPrice && g.offers.length > 1; });
        // Sort offers by price
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

    const imgHtml = `<div class="placeholder-img">${catIcon}</div>`;

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
        <button class="details-toggle" onclick="toggleDetails('${uid}', this)">
          Детайли <span class="arrow">▼</span>
        </button>
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

/* ── Render Products Grid ───────────────────────────── */
function renderProductsGrid(container, groups, currency, view) {
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
    let total = 0;
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
    results.forEach(r => {
        total += r.count;
        byCat[r.catId] = (byCat[r.catId] || 0) + r.count;
        byStore[r.store] = (byStore[r.store] || 0) + r.count;
    });
    return { total, byCat, byStore };
}
