/**
 * Pazaruvaj.info - Main Application Logic
 * 
 * Features:
 * - Currency toggling (EUR/BGN)
 * - Grid/List View switcher
 * - Dynamic data fetching from JSON files
 * - Product grouping (finding best prices)
 * - Filtering and sorting logic
 */

// Context variables
const RATE_EUR_BGN = 1.95583;
let currentCurrency = 'EUR'; // Base currency is EUR
let currentView = 'grid'; // 'grid' or 'list'
let rawProducts = []; // Unfiltered
let displayedProducts = []; // Filtered & Sorted

// Store Configuration
const storeConfig = {
    lidl: { name: 'Lidl', color: 'text-blue-600', bg: 'bg-blue-100', icon: 'shopping-cart' },
    billa: { name: 'Billa', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: 'shopping-bag' },
    kaufland: { name: 'Kaufland', color: 'text-red-600', bg: 'bg-red-100', icon: 'shopping-basket' },
    fantastico: { name: 'Fantastico', color: 'text-orange-600', bg: 'bg-orange-100', icon: 'store' }
};

// Categories Definitions
const categories = [
    { id: 'fruits', name: 'Плодове и Зел.', icon: 'apple' },
    { id: 'dairy', name: 'Млечни', icon: 'milk' },
    { id: 'meat', name: 'Месо', icon: 'beef' },
    { id: 'bread', name: 'Хляб', icon: 'croissant' },
    { id: 'drinks', name: 'Напитки', icon: 'cup-soda' },
    { id: 'sweets', name: 'Сладкиши', icon: 'cookie' },
    { id: 'frozen', name: 'Замразени', icon: 'snowflake' },
    { id: 'cleaning', name: 'Битова химия', icon: 'spray-can' },
    { id: 'home', name: 'За дома', icon: 'home' },
    { id: 'bio', name: 'Био & Здраве', icon: 'leaf' },
    { id: 'cosmetics', name: 'Козметика', icon: 'sparkles' },
    { id: 'other', name: 'Други', icon: 'package' }
];

// DOM Elements
const categoryNav = document.getElementById('categoryNav');
const productsContainer = document.getElementById('productsContainer');
const currencyToggle = document.getElementById('currencyToggle');
const currentCurrencySpan = document.getElementById('currentCurrency');
const viewGridBtn = document.getElementById('viewGrid');
const viewListBtn = document.getElementById('viewList');
const searchInput = document.getElementById('searchInput');
const sectionTitle = document.getElementById('sectionTitle');

// Filter & Sort DOM
const filtersSection = document.getElementById('filtersSection');
const storeFilter = document.getElementById('storeFilter');
const sortSelect = document.getElementById('sortSelect');
const shownProductsCount = document.getElementById('shownProductsCount');

// Update general ui
document.getElementById('currentYear').textContent = new Date().getFullYear();
document.getElementById('lastUpdatedDate').textContent = new Date().toLocaleDateString('bg-BG');

// Initialize Application
function init() {
    renderCategoryNav();
    setupEventListeners();
    // Load default top deals or initial category
    loadMockData(); // Initially loading mock data representing 'Top Deals'
}

// Event Listeners
function setupEventListeners() {
    // Currency Toggle
    currencyToggle.addEventListener('click', () => {
        currentCurrency = currentCurrency === 'EUR' ? 'BGN' : 'EUR';
        currentCurrencySpan.textContent = currentCurrency;
        renderProducts(); // Re-render to update prices
    });

    // View Toggles
    viewGridBtn.addEventListener('click', () => setView('grid'));
    viewListBtn.addEventListener('click', () => setView('list'));

    // Search
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        filterProducts(term, storeFilter.value);
    });

    // Filters
    storeFilter.addEventListener('change', (e) => {
        filterProducts(searchInput.value.toLowerCase(), e.target.value);
    });

    // Sorter
    sortSelect.addEventListener('change', () => {
        sortProducts();
        renderProducts();
    });
}

function setView(mode) {
    currentView = mode;
    
    // Update active button state
    if (mode === 'grid') {
        viewGridBtn.className = 'p-1.5 rounded bg-white shadow-sm text-primary';
        viewListBtn.className = 'p-1.5 rounded text-gray-500 hover:text-primary';
        productsContainer.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6';
    } else {
        viewListBtn.className = 'p-1.5 rounded bg-white shadow-sm text-primary';
        viewGridBtn.className = 'p-1.5 rounded text-gray-500 hover:text-primary';
        productsContainer.className = 'grid grid-cols-1 gap-4';
    }
    
    renderProducts();
}

// Format Price based on current currency
function formatPrice(priceEUR) {
    if (currentCurrency === 'BGN') {
        return (priceEUR * RATE_EUR_BGN).toFixed(2) + ' лв.';
    }
    return '€' + priceEUR.toFixed(2);
}

// Calculate normal unit price (per kg/L)
function calculateUnitPrice(price, quantity, unit) {
    // Placeholder logic for normalization. Example: quantity=500, unit='g' -> relative to 1000g (1kg)
    if (unit === 'g') return (price / quantity) * 1000;
    if (unit === 'ml') return (price / quantity) * 1000;
    return price; // Assume already per kg/L/pc
}

// Render the Category Navigation Buttons
function renderCategoryNav() {
    categoryNav.innerHTML = categories.map(cat => `
        <button onclick="fetchCategoryData('${cat.id}', '${cat.name}')" 
                class="flex items-center gap-2 whitespace-nowrap bg-white border border-gray-200 px-4 py-2 rounded-xl text-sm font-medium hover:border-primary hover:text-primary transition shadow-sm">
            <i data-lucide="${cat.icon}" class="w-4 h-4"></i>
            ${cat.name}
        </button>
    `).join('');
    // Need to re-initialize lucide icons for dynamic content
    if (window.lucide) window.lucide.createIcons();
}

/**
 * Simulates fetching JSON data from the 4 stores.
 * In production: fetching from e.g. /data/fruits_lidl.json, /data/fruits_billa.json...
 */
async function fetchCategoryData(categoryId, categoryName) {
    // Show Loading state
    productsContainer.innerHTML = `
        <div class="col-span-full py-12 text-center text-gray-500">
            <i data-lucide="loader" class="w-8 h-8 mx-auto animate-spin mb-2"></i>
            Зареждане на оферти за ${categoryName}...
        </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    
    sectionTitle.textContent = categoryName;
    document.getElementById('filtersSection').classList.remove('hidden');

    try {
        // PRODUCTION LOGIC (Commented out):
        // const stores = ['lidl', 'kaufland', 'billa', 'fantastico'];
        // const fetchPromises = stores.map(store => fetch(\`data/\${categoryId}_\${store}.json\`).then(res => res.ok ? res.json() : []));
        // const results = await Promise.all(fetchPromises);
        // rawProducts = results.flat();
        
        // MOCK LOGIC (For visual presentation)
        await new Promise(r => setTimeout(r, 600)); // fake network
        rawProducts = generateMockData(categoryId); 
        
        // Group and normalize identical products
        rawProducts = processProductGrouping(rawProducts);
        
        filterProducts('', 'all'); // Initialize showing all
    } catch(err) {
        console.error("Error loading JSONs:", err);
        productsContainer.innerHTML = `<div class="col-span-full py-12 text-center text-red-500">Грешка при зареждане на данните.</div>`;
    }
}

/**
 * Group Identical Products and Find Best Price
 */
function processProductGrouping(products) {
    // We group by a normalized name string
    const grouped = {};
    
    products.forEach(p => {
        const key = p.name.toLowerCase().trim();
        if (!grouped[key]) {
            grouped[key] = [];
        }
        
        // Ensure unit price is calculated
        if (!p.unitPriceEUR) {
            p.unitPriceEUR = calculateUnitPrice(p.priceEUR, p.quantity, p.unit);
        }
        grouped[key].push(p);
    });

    const finalProducts = [];
    
    // For each group, we pick all products, but we flag the one with the lowest price.
    // Realistically, we might want to display one "Master Product" and show all stores that sell it.
    // For simplicity of this UI, we show the products as standard cards, but flag the cheapest.
    for (const key in grouped) {
        const items = grouped[key];
        // find min
        let minPrice = Math.min(...items.map(i => i.priceEUR));
        items.forEach(i => {
            i.isBestPrice = (i.priceEUR === minPrice && items.length > 1);
            finalProducts.push(i);
        });
    }

    return finalProducts;
}

// Filter and Sort trigger
function filterProducts(searchTerm, storeParam) {
    displayedProducts = rawProducts.filter(p => {
        const matchesTerm = p.name.toLowerCase().includes(searchTerm);
        const matchesStore = storeParam === 'all' || p.store === storeParam;
        return matchesTerm && matchesStore;
    });

    sortProducts();
    renderProducts();
}

function sortProducts() {
    const sortBy = sortSelect.value;
    displayedProducts.sort((a, b) => {
        if (sortBy === 'price_asc') return a.priceEUR - b.priceEUR;
        if (sortBy === 'price_desc') return b.priceEUR - a.priceEUR;
        if (sortBy === 'discount_desc') return (b.discountPct || 0) - (a.discountPct || 0);
        return 0;
    });
}

// Product Tile Renderer
function renderProducts() {
    shownProductsCount.textContent = displayedProducts.length;

    if (displayedProducts.length === 0) {
        productsContainer.innerHTML = `
            <div class="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl shadow-sm border border-gray-100">
                <i data-lucide="search-x" class="w-12 h-12 mx-auto mb-4 text-gray-300"></i>
                <p>Няма намерени продукти по избраните критерии.</p>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    const html = displayedProducts.map(p => {
        const storeInfo = storeConfig[p.store];
        const priceStr = formatPrice(p.priceEUR);
        const oldPriceStr = p.oldPriceEUR ? formatPrice(p.oldPriceEUR) : null;
        const discountBadge = p.discountPct ? `<div class="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">-${p.discountPct}%</div>` : '';
        const bestPriceBadge = p.isBestPrice ? `<div class="absolute -top-3 -right-3 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md flex items-center gap-1"><i data-lucide="award" class="w-3 h-3"></i> Топ Цена!</div>` : '';
        const loyaltyBadge = p.loyaltyCard ? `<span class="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full border border-blue-200">${p.loyaltyCard} Цена</span>` : '';
        
        // Unit price normal
        let unitText = formatPrice(p.unitPriceEUR);
        let unitSuffix = p.unit === 'g' || p.unit === 'kg' ? '/кг' : '/л';

        if(currentView === 'grid') {
            // GRID VIEW ITEM
            return `
                <article class="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-shadow border border-gray-100 overflow-visible relative flex flex-col group">
                    ${bestPriceBadge}
                    
                    <div class="relative pt-4 px-4 h-48 flex items-center justify-center">
                        ${discountBadge}
                        <img src="${p.image}" alt="${p.name}" class="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300">
                    </div>
                    
                    <div class="p-4 flex-grow flex flex-col border-t border-gray-50 mt-2">
                        <!-- Store Badge -->
                        <div class="flex justify-between items-start mb-2">
                            <span class="${storeInfo.bg} ${storeInfo.color} text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded flex items-center gap-1">
                                <i data-lucide="${storeInfo.icon}" class="w-3 h-3"></i> ${storeInfo.name}
                            </span>
                            ${loyaltyBadge}
                        </div>
                        
                        <h3 class="font-semibold text-gray-800 leading-tight mb-1 flex-grow text-sm md:text-base">${p.name}</h3>
                        <p class="text-xs text-gray-500 mb-3">${p.quantity}${p.unit}</p>
                        
                        <div class="mt-auto">
                            <div class="flex items-end gap-2 mb-1">
                                <span class="text-2xl font-bold text-gray-900">${priceStr}</span>
                                ${oldPriceStr ? `<span class="text-sm text-gray-400 line-through mb-1">${oldPriceStr}</span>` : ''}
                            </div>
                            <div class="text-xs text-gray-500">
                                нормализирано: ${unitText}${unitSuffix}
                            </div>
                        </div>
                    </div>
                </article>
            `;
        } else {
            // LIST VIEW ITEM
            return `
                <article class="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 p-4 flex flex-col sm:flex-row gap-4 items-center relative overflow-visible">
                     ${bestPriceBadge}
                     
                    <div class="w-24 h-24 shrink-0 relative bg-gray-50 rounded-lg flex items-center justify-center p-2">
                        ${discountBadge}
                        <img src="${p.image}" alt="${p.name}" class="max-h-full max-w-full object-contain">
                    </div>
                    
                    <div class="flex-grow min-w-0 md:flex flex-row justify-between w-full">
                        <div class="mb-2 md:mb-0">
                            <!-- Store Badge -->
                            <div class="flex items-center gap-2 mb-2">
                                <span class="${storeInfo.bg} ${storeInfo.color} text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded flex items-center gap-1">
                                    <i data-lucide="${storeInfo.icon}" class="w-3 h-3"></i> ${storeInfo.name}
                                </span>
                                ${loyaltyBadge}
                            </div>
                            
                            <h3 class="font-semibold text-lg text-gray-800 leading-tight truncate">${p.name}</h3>
                            <p class="text-sm text-gray-500">${p.quantity}${p.unit}</p>
                        </div>
                        
                        <div class="text-right sm:ml-4 flex flex-col sm:items-end md:justify-center">
                            <div class="flex items-end gap-2 sm:justify-end mb-1">
                                ${oldPriceStr ? `<span class="text-sm text-gray-400 line-through mb-1">${oldPriceStr}</span>` : ''}
                                <span class="text-2xl font-bold text-gray-900">${priceStr}</span>
                            </div>
                            <div class="text-xs text-gray-500">
                                ${unitText}${unitSuffix}
                            </div>
                        </div>
                    </div>
                </article>
            `;
        }
    }).join('');

    productsContainer.innerHTML = html;
    if (window.lucide) window.lucide.createIcons(); // Reactivate icons in new HTML
}


// --- MOCK DATA GENERATION --- //
function loadMockData() {
    // Initial data - top deals mixed
    fetchCategoryData('fruits', 'Симулатор (Плодове - Топ Оферти)');
}

function generateMockData(catId) {
    const images = {
        fruits: 'https://images.unsplash.com/photo-1590005354167-19812467660b?auto=format&fit=crop&w=150&q=80',
        dairy: 'https://plus.unsplash.com/premium_photo-1664302153001-9a7edaf3d548?auto=format&fit=crop&w=150&q=80',
        meat: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=150&q=80'
    };
    const defaultImg = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=150&q=80';
    const img = images[catId] || defaultImg;

    return [
        {
            id: '101', name: 'Прясно мляко Верея 3%',
            store: 'lidl', priceEUR: 1.45, oldPriceEUR: 1.80, discountPct: 19,
            quantity: 1, unit: 'l', loyaltyCard: null, image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=150&q=80'
        },
        {
            id: '102', name: 'Прясно мляко Верея 3%',
            store: 'billa', priceEUR: 1.65, oldPriceEUR: null, discountPct: null,
            quantity: 1, unit: 'l', loyaltyCard: 'Billa Card', image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=150&q=80'
        },
        {
            id: '103', name: 'Прясно мляко Верея 3%',
            store: 'kaufland', priceEUR: 1.60, oldPriceEUR: 1.85, discountPct: 13,
            quantity: 1, unit: 'l', loyaltyCard: null, image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=150&q=80'
        },
        {
            id: '201', name: 'Банани Еквадор',
            store: 'lidl', priceEUR: 1.20, oldPriceEUR: 1.50, discountPct: 20,
            quantity: 1, unit: 'kg', loyaltyCard: 'Lidl Plus', image: 'https://images.unsplash.com/photo-1603833665858-e61d17a86224?auto=format&fit=crop&w=150&q=80'
        },
        {
            id: '202', name: 'Банани Еквадор',
            store: 'fantastico', priceEUR: 1.35, oldPriceEUR: null, discountPct: null,
            quantity: 1, unit: 'kg', loyaltyCard: null, image: 'https://images.unsplash.com/photo-1603833665858-e61d17a86224?auto=format&fit=crop&w=150&q=80'
        },
        {
            id: '301', name: 'Краве сирене БДС',
            store: 'kaufland', priceEUR: 8.50, oldPriceEUR: null, discountPct: null,
            quantity: 800, unit: 'g', loyaltyCard: null, image: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=150&q=80'
        },
         {
            id: '302', name: 'Краве сирене БДС',
            store: 'billa', priceEUR: 9.10, oldPriceEUR: 10.50, discountPct: 13,
            quantity: 800, unit: 'g', loyaltyCard: null, image: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=150&q=80'
        }
    ];
}

// Start app
document.addEventListener('DOMContentLoaded', init);
