/**
 * Pazaruvai.info — Configuration
 */
const SITE = {
    domain: 'pazaruvai.info',
    name: 'Pazaruvai.info',
    slogan: 'Провери. Сравни. Пазарувай информирано.',
    email: 'contact@pazaruvai.info',
    baseUrl: 'https://pazaruvai.info'
};
const RATE_EUR_BGN = 1.95583;

const STORES = {
    lidl:       { name: 'Lidl',        color: '#0050AA', bg: '#E8F0FE', loyaltyCard: 'Lidl Plus',       cycle: 'пон–нед', icon: '🛒' },
    kaufland:   { name: 'Kaufland',    color: '#E30613', bg: '#FDE8E8', loyaltyCard: 'Kaufland Card',   cycle: 'пон–нед', icon: '🏪' },
    billa:      { name: 'Billa',       color: '#CD1719', bg: '#FFF3CD', loyaltyCard: 'Billa Card',      cycle: 'чет–сря', icon: '🛍️' },
    fantastico: { name: 'Фантастико',  color: '#FF6B00', bg: '#FFF4E6', loyaltyCard: 'Fantastico Card', cycle: 'чет–сря', icon: '🏬' }
};
const STORE_IDS = Object.keys(STORES);

/* Category slugs match the actual JSON filenames */
const CATEGORIES = [
    { id: 'osnovni-hrani',                      name: 'Основни храни',               icon: '🌾', desc: 'Брашно, сол, захар, ориз, леща, боб, масла, оцет' },
    { id: 'hlyab-pechiva-i-testeni',             name: 'Хляб, Печива и Тестени',      icon: '🍞', desc: 'Хляб, паста, юфка, кускус, кори, пърленки' },
    { id: 'mlechni-i-yaica',                     name: 'Млечни и Яйца',               icon: '🥛', desc: 'Мляко, сирена, кашкавали, масло, сметана, яйца' },
    { id: 'meso-i-riba',                         name: 'Месо и Риба',                  icon: '🥩', desc: 'Прясно месо, кайма, колбаси, риба и рибни консерви' },
    { id: 'plodove-i-zelenchuci',                name: 'Плодове и Зеленчуци',          icon: '🍎', desc: 'Пресни плодове и зеленчуци' },
    { id: 'konservi-soleni-kremove-i-sosove',     name: 'Консерви, Кремове и Сосове',   icon: '🥫', desc: 'Консерви, лютеница, майонеза, кетчуп, сосове' },
    { id: 'zamrazeni-hrani',                     name: 'Замразени храни',              icon: '❄️', desc: 'Замразени храни и продукти' },
    { id: 'kafe-i-chai',                         name: 'Кафе и Чай',                   icon: '☕', desc: 'Кафе, чай и топли напитки' },
    { id: 'bezalkoholni-napitki',                name: 'Безалкохолни напитки',         icon: '🥤', desc: 'Безалкохолни напитки, вода, сокове' },
    { id: 'sladkishi-i-deserti',                 name: 'Сладкиши и Десерти',           icon: '🍰', desc: 'Сладкиши, бисквити, шоколади, десерти' },
    { id: 'snaks',                               name: 'Снакс',                        icon: '🍿', desc: 'Чипс, крекери, солени снакс' },
    { id: 'alkoholni-napitki',                   name: 'Алкохолни напитки',            icon: '🍷', desc: 'Бира, вино, спиртни напитки' }
];

function getCategoryById(id) { return CATEGORIES.find(c => c.id === id) || null; }

function getBasePath() {
    return window.location.pathname.includes('/pages/') ? '../' : './';
}

function formatPrice(eur, currency) {
    if (eur === null || eur === undefined) return '—';
    return currency === 'BGN' ? (eur * RATE_EUR_BGN).toFixed(2) + ' лв.' : '€' + eur.toFixed(2);
}
