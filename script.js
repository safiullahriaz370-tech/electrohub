// ===== SUPABASE CONFIG =====
const SUPABASE_URL = 'https://iguhpaqocjxwtfkpbgbg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlndWhwYXFvY2p4d3Rma3BiZ2JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyNTEyMjQsImV4cCI6MjEwMDgyNzIyNH0.BrJb1CuFopsT4cQQtb4hf9jGznXxjcPnA-DsJ9vwmsc';

// ===== SUPABASE HELPER =====
async function sbGet(table, params = '') {
    try {
        let url = SUPABASE_URL + '/rest/v1/' + table;
        if (params) url += '?' + params;
        let r = await fetch(url, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': 'Bearer ' + SUPABASE_KEY
            }
        });
        if (!r.ok) { console.error('GET error:', await r.text()); return []; }
        return await r.json();
    } catch (e) { console.error('Fetch error:', e); return []; }
}

async function sbPost(table, data) {
    try {
        let r = await fetch(SUPABASE_URL + '/rest/v1/' + table, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': 'Bearer ' + SUPABASE_KEY,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(data)
        });
        if (!r.ok) { let e = await r.text(); console.error('POST error:', e); return null; }
        return await r.json();
    } catch (e) { console.error('Post error:', e); return null; }
}

async function sbPatch(table, filter, data) {
    try {
        let r = await fetch(SUPABASE_URL + '/rest/v1/' + table + '?' + filter, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': 'Bearer ' + SUPABASE_KEY,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(data)
        });
        if (!r.ok) { console.error('PATCH error:', await r.text()); return null; }
        return await r.json();
    } catch (e) { console.error('Patch error:', e); return null; }
}

// ===== CONSTANTS =====
const CI = {
    chargers: 'fas fa-charging-station',
    cables: 'fas fa-plug',
    earphones: 'fas fa-headphones-alt',
    powerbanks: 'fas fa-battery-full',
    holders: 'fas fa-mobile-alt',
    watches: 'fas fa-clock',
    protectors: 'fas fa-shield-alt',
    covers: 'fas fa-tablet-alt',
    speakers: 'fas fa-volume-up',
    adapters: 'fas fa-exchange-alt',
    lights: 'fas fa-lightbulb',
    stands: 'fas fa-laptop',
    keyboards: 'fas fa-keyboard',
    storage: 'fas fa-hdd',
    cameras: 'fas fa-camera',
    other: 'fas fa-box'
};
const CN = {
    chargers: 'Chargers',
    cables: 'Cables',
    earphones: 'Earphones',
    powerbanks: 'Power Banks',
    holders: 'Phone Holders',
    watches: 'Smart Watches',
    protectors: 'Screen Protectors',
    covers: 'Mobile Covers',
    speakers: 'Bluetooth Speakers',
    adapters: 'Adapters',
    lights: 'Ring Lights / LED',
    stands: 'Laptop Stands',
    keyboards: 'Keyboards / Mouse',
    storage: 'USB / Storage',
    cameras: 'Camera Accessories',
    other: 'Other'
};
const CPN = { all: 'All Devices', iphone: 'iPhone', samsung: 'Samsung', typec: 'Type-C', microusb: 'Micro USB', laptop: 'Laptop' };

// ===== STATE =====
// ===== STATE =====
let products = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let loggedUser = JSON.parse(localStorage.getItem('loggedUser')) || null;
let currentSlide = 0, slideInterval;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
    showLoading(true);
    await loadProducts();
    showLoading(false);
    renderAll();
    updateCartBadge();
    startSlider();
    startCountdown();
    buildFilters();
    updateUserUI();
    window.addEventListener('scroll', handleScroll);
});

function showLoading(show) {
    let el = document.getElementById('loadingOverlay');
    if (show) {
        if (!el) {
            let d = document.createElement('div');
            d.id = 'loadingOverlay';
            d.style.cssText = 'position:fixed;inset:0;background:rgba(255,255,255,0.95);display:flex;align-items:center;justify-content:center;z-index:99999;flex-direction:column;gap:15px;';
            d.innerHTML = '<i class="fas fa-bolt" style="font-size:50px;color:#FF7A00;animation:pulse 1s infinite;"></i><p style="font-weight:700;color:#FF7A00;font-size:18px;">Loading ElectroHub...</p>';
            document.body.appendChild(d);
        }
    } else {
        if (el) el.remove();
    }
}

// ===== LOAD PRODUCTS FROM SUPABASE =====
async function loadProducts() {
    console.log('Loading products from Supabase...');
    var data = await sbGet('products', 'select=*&order=id.asc');
    
    if (data && data.length > 0) {
        products = data.map(function(p) {
            return {
                id: p.id, name: p.name, category: p.category,
                price: p.price, oldPrice: p.old_price, image: p.image || '',
                images: p.images || [],
                description: p.description || '', brand: p.brand || 'Generic',
                compat: p.compat || 'all', stock: p.stock || 0,
                rating: parseFloat(p.rating) || 4.0, reviews: p.reviews || 0,
                isNew: p.is_new, isHot: p.is_hot, isSale: p.is_sale,
                isFlash: p.is_flash
            };
        });
        console.log('✅ Products loaded:', products.length);
    } else {
        // NO DEFAULT PRODUCTS - Empty array
        products = [];
        console.log('⚠️ No products in database');
    }
}


// ===== AUTH =====
function openAuth(r) { if (r) sessionStorage.setItem('authRedirect', r); document.getElementById('authModal').classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeAuth() { document.getElementById('authModal').classList.remove('open'); document.body.style.overflow = ''; }
function switchAuth(t) { document.querySelectorAll('.auth-tab').forEach(x => x.classList.remove('active')); document.getElementById(t + 'Tab').classList.add('active'); }

async function registerCustomer(e) {
    e.preventDefault();
    let btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Wait...';

    let phone = document.getElementById('regPhone').value.trim();
    let existing = await sbGet('customers', 'phone=eq.' + phone);
    if (existing && existing.length > 0) {
        document.getElementById('regError').textContent = 'Phone already registered!';
        btn.disabled = false; btn.innerHTML = '<i class="fas fa-user-plus"></i> Register'; return;
    }

    let c = {
        id: 'C' + Date.now(),
        name: document.getElementById('regName').value.trim(),
        phone: phone,
        email: document.getElementById('regEmail').value.trim(),
        city: document.getElementById('regCity').value,
        address: document.getElementById('regAddress').value.trim(),
        password: document.getElementById('regPass').value
    };

    let result = await sbPost('customers', c);
    if (result) {
        loggedUser = c;
        localStorage.setItem('loggedUser', JSON.stringify(c));
        closeAuth(); updateUserUI();
        showNotif('Welcome ' + c.name + '!');
        let r = sessionStorage.getItem('authRedirect');
        if (r === 'checkout') openCheckout();
        sessionStorage.removeItem('authRedirect');
    } else {
        document.getElementById('regError').textContent = 'Error. Try again.';
    }
    btn.disabled = false; btn.innerHTML = '<i class="fas fa-user-plus"></i> Register';
}

async function loginCustomer(e) {
    e.preventDefault();
    let btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Wait...';

    let phone = document.getElementById('loginPhone').value.trim();
    let pass = document.getElementById('loginPass').value;
    let result = await sbGet('customers', 'phone=eq.' + phone + '&password=eq.' + pass);

    if (result && result.length > 0) {
        loggedUser = result[0];
        localStorage.setItem('loggedUser', JSON.stringify(loggedUser));
        closeAuth(); updateUserUI();
        showNotif('Welcome ' + loggedUser.name + '!');
        let r = sessionStorage.getItem('authRedirect');
        if (r === 'checkout') openCheckout();
        sessionStorage.removeItem('authRedirect');
    } else {
        document.getElementById('loginError').textContent = 'Wrong phone or password.';
    }
    btn.disabled = false; btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
}

function logoutUser() { loggedUser = null; localStorage.removeItem('loggedUser'); updateUserUI(); showNotif('Logged out'); }
function handleUserClick() { loggedUser ? confirm('Logout?') && logoutUser() : openAuth(); }
function updateUserUI() {
    let t = document.getElementById('userTopBar'), h = document.getElementById('headerUserText');
    if (loggedUser) { t.innerHTML = '<a href="#" onclick="logoutUser()" style="color:var(--primary);font-weight:600;"><i class="fas fa-user-check"></i> ' + loggedUser.name.split(' ')[0] + ' | Logout</a>'; h.textContent = loggedUser.name.split(' ')[0]; }
    else { t.innerHTML = '<a href="#" onclick="openAuth()"><i class="fas fa-user"></i> Login</a>'; h.textContent = 'Login'; }
}
function showNotif(t, c) { let n = document.getElementById('cartNotification'); n.style.background = c || 'var(--success)'; document.getElementById('cartNotifText').textContent = t; n.classList.remove('show'); void n.offsetWidth; n.classList.add('show'); setTimeout(() => n.classList.remove('show'), 2500); }

// ===== RENDER =====
function renderAll() {
    let flash = products.filter(p => p.isSale && p.oldPrice).sort((a, b) => ((b.oldPrice - b.price) / b.oldPrice) - ((a.oldPrice - a.price) / a.oldPrice)).slice(0, 4);
    rG('flashSaleProducts', flash);
    rG('featuredProducts', products.filter(p => p.isHot).slice(0, 8));
    rG('newArrivals', products.filter(p => p.isNew).slice(0, 8));
    rG('bestSellers', [...products].sort((a, b) => b.reviews - a.reviews).slice(0, 8));
    renderShop();
}

function rG(id, l) { let e = document.getElementById(id); if (e) e.innerHTML = l.length ? l.map(pCard).join('') : '<p style="text-align:center;color:#999;padding:30px;grid-column:1/-1">No products</p>'; }

function pCard(p) {
    let d = p.oldPrice ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100) : 0;
    let bd = '', st = '', oos = p.stock <= 0;
    if (d > 0) bd += '<span class="product-badge sale">-' + d + '%</span>';
    if (p.isNew) bd += '<span class="product-badge new">NEW</span>';
    if (p.isHot) bd += '<span class="product-badge hot">HOT</span>';
    for (let i = 1; i <= 5; i++) st += i <= Math.floor(p.rating) ? '<i class="fas fa-star"></i>' : i - p.rating < 1 ? '<i class="fas fa-star-half-alt"></i>' : '<i class="far fa-star"></i>';
    let img = p.image ? '<img src="' + p.image + '">' : '<i class="' + (CI[p.category] || 'fas fa-box') + ' placeholder-icon"></i>';
    return '<div class="product-card"><div class="product-image">' + img + '<div class="product-badges">' + bd + '</div><div class="product-actions-overlay"><button class="action-btn" onclick="event.stopPropagation();openQuickView(' + p.id + ')"><i class="fas fa-eye"></i></button>' + (!oos ? '<button class="action-btn" onclick="event.stopPropagation();addToCart(' + p.id + ')"><i class="fas fa-cart-plus"></i></button>' : '') + '</div></div><div class="product-info"><span class="product-category">' + (CN[p.category] || p.category) + '</span><h3 class="product-name">' + p.name + '</h3><div class="product-rating">' + st + '<span>(' + p.reviews + ')</span></div><div class="product-price"><span class="current">Rs.' + p.price.toLocaleString() + '</span>' + (p.oldPrice ? '<span class="old">Rs.' + p.oldPrice.toLocaleString() + '</span>' : '') + (d ? '<span class="discount">-' + d + '%</span>' : '') + '</div><div class="product-btns">' + (!oos ? '<button class="btn-add-to-cart" onclick="event.stopPropagation();addToCart(' + p.id + ')"><i class="fas fa-cart-plus"></i> Cart</button><button class="btn-buy-small" onclick="event.stopPropagation();quickBuy(' + p.id + ')"><i class="fas fa-bolt"></i> Buy</button>' : '<button class="btn-add-to-cart" disabled style="opacity:0.5;width:100%"><i class="fas fa-times-circle"></i> Out</button>') + '</div></div></div>';
}

// ===== SHOP =====
function renderShop(f) { let p = f || products; document.getElementById('productCount').textContent = p.length; rG('shopProducts', p); }
function buildFilters() {
    let cats = [...new Set(products.map(p => p.category))];
    document.getElementById('categoryFilters').innerHTML = cats.map(c => '<label><input type="checkbox" value="' + c + '" onchange="applyFilters()"> ' + (CN[c] || c) + '</label>').join('');
    document.getElementById('brandFilters').innerHTML = [...new Set(products.map(p => p.brand))].sort().map(b => '<label><input type="checkbox" value="' + b + '" onchange="applyFilters()"> ' + b + '</label>').join('');
}
function applyFilters() {
    let f = [...products];
    let c = [...document.querySelectorAll('#categoryFilters input:checked')].map(i => i.value); if (c.length) f = f.filter(p => c.includes(p.category));
    let b = [...document.querySelectorAll('#brandFilters input:checked')].map(i => i.value); if (b.length) f = f.filter(p => b.includes(p.brand));
    let mn = parseFloat(document.getElementById('minPrice').value) || 0, mx = parseFloat(document.getElementById('maxPrice').value) || Infinity;
    f = f.filter(p => p.price >= mn && p.price <= mx); renderShop(f);
}
function clearFilters() { document.querySelectorAll('.filter-section input[type=checkbox]').forEach(i => i.checked = false); document.getElementById('minPrice').value = ''; document.getElementById('maxPrice').value = ''; renderShop(); }
function sortProducts() { let f = [...products], s = document.getElementById('sortSelect').value; let c = [...document.querySelectorAll('#categoryFilters input:checked')].map(i => i.value); if (c.length) f = f.filter(p => c.includes(p.category)); if (s === 'price-low') f.sort((a, b) => a.price - b.price); else if (s === 'price-high') f.sort((a, b) => b.price - a.price); else if (s === 'newest') f.sort((a, b) => b.id - a.id); renderShop(f); }
function filterByCategory(c) { showPage('shop'); document.querySelectorAll('#categoryFilters input').forEach(i => i.checked = i.value === c); document.getElementById('shopBreadcrumb').textContent = CN[c] || c; renderShop(products.filter(p => p.category === c)); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function handleSearch(e) { if (e.key === 'Enter') searchProducts(); }
function searchProducts() { let q = document.getElementById('searchInput').value.toLowerCase(), c = document.getElementById('searchCategory').value; let r = products.filter(p => { let mq = !q || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q); return mq && (c === 'all' || p.category === c); }); showPage('shop'); document.getElementById('shopBreadcrumb').textContent = q ? '"' + q + '"' : 'All'; renderShop(r); }

// ===== QUICK VIEW =====
function openQuickView(id) {
    let p = products.find(x => x.id === id); if (!p) return;
    document.getElementById('modalImageContainer').innerHTML = p.image ? '<img src="' + p.image + '">' : '<i class="' + (CI[p.category] || 'fas fa-box') + '" style="font-size:70px;color:#E5E5E5"></i>';
    document.getElementById('modalCategory').textContent = CN[p.category] || '';
    document.getElementById('modalName').textContent = p.name;
    document.getElementById('modalPrice').textContent = 'Rs.' + p.price.toLocaleString();
    document.getElementById('modalOldPrice').textContent = p.oldPrice ? 'Rs.' + p.oldPrice.toLocaleString() : '';
    let d = p.oldPrice ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100) : 0;
    document.getElementById('modalDiscount').textContent = d ? '-' + d + '%' : '';
    document.getElementById('modalDescription').textContent = p.description;
    let st = ''; for (let i = 1; i <= 5; i++) st += i <= Math.floor(p.rating) ? '<i class="fas fa-star"></i>' : i - p.rating < 1 ? '<i class="fas fa-star-half-alt"></i>' : '<i class="far fa-star"></i>';
    document.getElementById('modalStars').innerHTML = st;
    document.getElementById('modalReviews').textContent = '(' + p.reviews + ')';
    document.getElementById('modalStock').textContent = p.stock > 0 ? 'In Stock (' + p.stock + ')' : 'Out of Stock';
    document.getElementById('modalBrand').textContent = p.brand;
    document.getElementById('modalCompat').textContent = CPN[p.compat] || p.compat;
    document.getElementById('modalQty').value = 1;
    document.getElementById('quickViewModal').dataset.pid = id;
    document.getElementById('quickViewModal').classList.add('open'); document.body.style.overflow = 'hidden';
}
function closeQuickView() { document.getElementById('quickViewModal').classList.remove('open'); document.body.style.overflow = ''; }
function changeQty(a) { let i = document.getElementById('modalQty'), v = parseInt(i.value) + a; if (v >= 1 && v <= 10) i.value = v; }
function addToCartFromModal() { addToCart(parseInt(document.getElementById('quickViewModal').dataset.pid), parseInt(document.getElementById('modalQty').value)); closeQuickView(); }
function buyNowFromModal() { addToCart(parseInt(document.getElementById('quickViewModal').dataset.pid), parseInt(document.getElementById('modalQty').value)); closeQuickView(); proceedToCheckout(); }
function quickBuy(id) { addToCart(id, 1); proceedToCheckout(); }

// ===== CART =====
function addToCart(id, qty) { qty = qty || 1; let p = products.find(x => x.id === id); if (!p || p.stock <= 0) return alert('Out of stock!'); let e = cart.find(i => i.id === id); if (e) { if (e.qty + qty > p.stock) return alert('Only ' + p.stock + ' left'); e.qty += qty; } else cart.push({ id: id, qty: qty }); saveCart(); updateCartBadge(); showNotif('Added to cart!'); }
function removeFromCart(id) { cart = cart.filter(i => i.id !== id); saveCart(); updateCartBadge(); renderCartItems(); }
function updateCartQty(id, a) { let i = cart.find(x => x.id === id); if (i) { i.qty += a; if (i.qty <= 0) { removeFromCart(id); return; } } saveCart(); updateCartBadge(); renderCartItems(); }
function clearCart() { cart = []; saveCart(); updateCartBadge(); renderCartItems(); }
function saveCart() { localStorage.setItem('cart', JSON.stringify(cart)); }
function updateCartBadge() { let t = cart.reduce(function(s, i) { return s + i.qty; }, 0); document.getElementById('cartBadge').textContent = t; document.getElementById('cartHeaderCount').textContent = t; }
function getCartTotal() { return cart.reduce(function(s, i) { let p = products.find(x => x.id === i.id); return s + (p ? p.price * i.qty : 0); }, 0); }
function openCart() { renderCartItems(); document.getElementById('cartOverlay').classList.add('open'); document.getElementById('cartSidebar').classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeCart() { document.getElementById('cartOverlay').classList.remove('open'); document.getElementById('cartSidebar').classList.remove('open'); document.body.style.overflow = ''; }

function renderCartItems() {
    let c = document.getElementById('cartItems'), f = document.getElementById('cartFooter');
    if (!cart.length) {
        c.innerHTML = '<div class="cart-empty"><i class="fas fa-shopping-cart"></i><p>Cart empty</p><button onclick="closeCart()" class="btn-shop-now">Shop</button></div>';
        f.style.display = 'none'; return;
    }
    let html = '';
    for (let idx = 0; idx < cart.length; idx++) {
        let item = cart[idx];
        let p = products.find(x => x.id === item.id);
        if (!p) continue;
        let img = p.image ? '<img src="' + p.image + '">' : '<i class="' + (CI[p.category] || 'fas fa-box') + '"></i>';
        html += '<div class="cart-item"><div class="cart-item-image">' + img + '</div><div class="cart-item-info"><div class="cart-item-name">' + p.name + '</div><div class="cart-item-price">Rs.' + p.price.toLocaleString() + '</div><div class="cart-item-qty"><button onclick="updateCartQty(' + item.id + ',-1)">-</button><span>' + item.qty + '</span><button onclick="updateCartQty(' + item.id + ',1)">+</button></div></div><button class="cart-item-remove" onclick="removeFromCart(' + item.id + ')"><i class="fas fa-trash-alt"></i></button></div>';
    }
    c.innerHTML = html;
    f.style.display = 'block';
    document.getElementById('cartTotal').textContent = 'Rs.' + getCartTotal().toLocaleString();
}

// ===== CHECKOUT =====
function proceedToCheckout() { if (!cart.length) return alert('Cart empty!'); closeCart(); if (!loggedUser) return openAuth('checkout'); openCheckout(); }

function openCheckout() {
    if (!cart.length) return;
    if (loggedUser) {
        document.getElementById('loggedUserInfo').innerHTML = '<i class="fas fa-user-check"></i><div><strong>' + loggedUser.name + '</strong><br><small>' + loggedUser.phone + ' | ' + loggedUser.city + '</small></div>';
        document.getElementById('loggedUserInfo').style.display = 'flex';
        document.getElementById('custName').value = loggedUser.name;
        document.getElementById('custPhone').value = loggedUser.phone;
        document.getElementById('custEmail').value = loggedUser.email || '';
        document.getElementById('custCity').value = loggedUser.city || '';
        document.getElementById('custAddress').value = loggedUser.address || '';
    } else {
        document.getElementById('loggedUserInfo').style.display = 'none';
    }

    let itemsHtml = '';
    for (let idx = 0; idx < cart.length; idx++) {
        let item = cart[idx];
        let p = products.find(x => x.id === item.id);
        if (!p) continue;
        itemsHtml += '<div class="checkout-summary-item"><div class="checkout-item-placeholder"><i class="' + (CI[p.category] || 'fas fa-box') + '"></i></div><div class="checkout-item-info"><h5>' + p.name + '</h5><span>Qty: ' + item.qty + '</span></div><div class="checkout-item-price">Rs.' + (p.price * item.qty).toLocaleString() + '</div></div>';
    }
    document.getElementById('checkoutItems').innerHTML = itemsHtml;

    let sub = getCartTotal(), del = sub >= 2000 ? 0 : 150;
    document.getElementById('summarySubtotal').textContent = 'Rs.' + sub.toLocaleString();
    document.getElementById('summaryDelivery').textContent = del ? 'Rs.' + del : 'FREE';
    document.getElementById('summaryTotal').textContent = 'Rs.' + (sub + del).toLocaleString();
    document.getElementById('summaryDiscountRow').style.display = 'none';
    document.getElementById('checkoutModal').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeCheckout() { document.getElementById('checkoutModal').classList.remove('open'); document.body.style.overflow = ''; }

function applyPromo() {
    let c = document.getElementById('promoInput').value.trim().toUpperCase(), s = getCartTotal();
    if (c === 'ELECTRO10') {
        let d = Math.round(s * 0.1), dl = s >= 2000 ? 0 : 150;
        document.getElementById('summaryDiscountRow').style.display = 'flex';
        document.getElementById('summaryDiscount').textContent = '-Rs.' + d.toLocaleString();
        document.getElementById('summaryTotal').textContent = 'Rs.' + (s - d + dl).toLocaleString();
        showNotif('10% off!');
    } else if (c === 'FREESHIP') {
        document.getElementById('summaryDelivery').textContent = 'FREE';
        document.getElementById('summaryTotal').textContent = 'Rs.' + s.toLocaleString();
        showNotif('Free shipping!');
    } else { alert('Try ELECTRO10 or FREESHIP'); }
}

// ===== PLACE ORDER - SUPABASE =====
async function placeOrder(e) {
    e.preventDefault();
    let btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Placing...';

    let sub = getCartTotal(), del = sub >= 2000 ? 0 : 150, total = sub + del;
    let dr = document.getElementById('summaryDiscountRow');
    if (dr && dr.style.display !== 'none') {
        total -= parseInt(document.getElementById('summaryDiscount').textContent.replace(/[^0-9]/g, ''));
    }

    try {
        // Get order count
        let existing = await sbGet('orders', 'select=id');
        let count = existing ? existing.length : 0;
        let orderId = 'EH-' + String(count + 1).padStart(5, '0');
        let now = new Date();

        // Build items array
        let orderItems = [];
        for (let idx = 0; idx < cart.length; idx++) {
            let item = cart[idx];
            let p = products.find(x => x.id === item.id);
            orderItems.push({
                id: item.id,
                name: p ? p.name : 'Unknown',
                price: p ? p.price : 0,
                qty: item.qty,
                category: p ? p.category : ''
            });
        }

        let orderData = {
            id: orderId,
            customer_id: loggedUser ? loggedUser.id : 'guest',
            customer_name: document.getElementById('custName').value,
            customer_phone: document.getElementById('custPhone').value,
            customer_email: document.getElementById('custEmail').value || '',
            customer_city: document.getElementById('custCity').value,
            customer_postal: document.getElementById('custPostal').value || '',
            customer_address: document.getElementById('custAddress').value,
            items: orderItems,
            subtotal: sub,
            delivery: del,
            total: total,
            status: 'Pending',
            status_history: [{ status: 'Pending', time: now.toISOString(), note: 'Order placed' }],
            payment: 'COD',
            notes: document.getElementById('custNotes').value || '',
            estimated_delivery: new Date(now.getTime() + 5 * 86400000).toISOString()
        };

        console.log('📦 Saving order to Supabase:', orderId);
        let result = await sbPost('orders', orderData);

        if (result) {
            console.log('✅ ORDER SAVED:', orderId);

            // Update stock
            for (let idx = 0; idx < cart.length; idx++) {
                let item = cart[idx];
                let p = products.find(x => x.id === item.id);
                if (p) {
                    let newStock = Math.max(0, p.stock - item.qty);
                    await sbPatch('products', 'id=eq.' + p.id, { stock: newStock });
                    p.stock = newStock;
                }
            }

            cart = []; saveCart(); updateCartBadge(); closeCheckout();
            document.getElementById('checkoutForm').reset();
            document.getElementById('successOrderId').textContent = '#' + orderId;
            document.getElementById('successTotal').textContent = 'Rs.' + total.toLocaleString();
            document.getElementById('orderSuccessModal').classList.add('open');
        } else {
            alert('Order failed! Check console.');
            btn.disabled = false; btn.innerHTML = '<i class="fas fa-lock"></i> Place Order';
        }
    } catch (err) {
        console.error('Order error:', err);
        alert('Connection error. Check internet.');
        btn.disabled = false; btn.innerHTML = '<i class="fas fa-lock"></i> Place Order';
    }
}

function continueShopping() {
    document.getElementById('orderSuccessModal').classList.remove('open');
    document.body.style.overflow = '';
    showPage('home');
    loadProducts().then(function() { renderAll(); });
}

function openTrackingFromSuccess() {
    let oid = document.getElementById('successOrderId').textContent.replace('#', '');
    document.getElementById('orderSuccessModal').classList.remove('open');
    openTrackingModal();
    document.getElementById('trackOrderInput').value = oid;
    trackOrder();
}

// ===== TRACKING =====
function openTrackingModal() { document.getElementById('trackingModal').classList.add('open'); document.body.style.overflow = 'hidden'; document.getElementById('trackingResult').innerHTML = ''; showMyOrders(); }
function closeTracking() { document.getElementById('trackingModal').classList.remove('open'); document.body.style.overflow = ''; }

async function showMyOrders() {
    let c = document.getElementById('myOrdersList');
    if (!loggedUser) { c.innerHTML = ''; return; }
    let orders = await sbGet('orders', 'customer_phone=eq.' + loggedUser.phone + '&order=created_at.desc');
    if (!orders || !orders.length) { c.innerHTML = ''; return; }
    let html = '<div class="my-orders-section"><h4><i class="fas fa-list"></i> My Orders</h4>';
    for (let i = 0; i < orders.length; i++) {
        let o = orders[i];
        html += '<div class="my-order-item" onclick="document.getElementById(\'trackOrderInput\').value=\'' + o.id + '\';trackOrder();"><span style="font-weight:700;color:var(--primary);">' + o.id + '</span><span class="status-badge status-' + o.status + '" style="font-size:10px;padding:3px 8px;">' + o.status + '</span><strong>Rs.' + o.total.toLocaleString() + '</strong></div>';
    }
    html += '</div>';
    c.innerHTML = html;
}

async function trackOrder() {
    let id = document.getElementById('trackOrderInput').value.trim().toUpperCase();
    if (!id.startsWith('EH-')) id = 'EH-' + id.replace(/[^0-9]/g, '').padStart(5, '0');
    let c = document.getElementById('trackingResult');
    c.innerHTML = '<p style="text-align:center;padding:20px;"><i class="fas fa-spinner fa-spin" style="color:var(--primary);font-size:25px;"></i></p>';

    let orders = await sbGet('orders', 'id=eq.' + id);
    if (!orders || !orders.length) {
        c.innerHTML = '<div style="text-align:center;padding:25px;color:var(--danger);"><i class="fas fa-exclamation-circle" style="font-size:35px;display:block;margin-bottom:8px;"></i><h4>Not Found</h4></div>';
        return;
    }

    let o = orders[0];
    let sh = o.status_history || [];
    let items = o.items || [];
    let sts = ['Pending', 'Confirmed', 'Shipped', 'Delivered'];
    let icons = ['fas fa-clock', 'fas fa-check', 'fas fa-shipping-fast', 'fas fa-box-open'];
    let descs = ['Processing', 'Packed', 'On the way', 'Delivered!'];
    let ci = o.status === 'Cancelled' ? -1 : sts.indexOf(o.status);

    let tl = '';
    if (o.status !== 'Cancelled') {
        tl = '<div class="tracking-timeline">';
        for (let i = 0; i < sts.length; i++) {
            let dc = i < ci ? 'active' : i === ci ? 'current' : '';
            let sc = i < ci ? 'completed' : '';
            let h = null;
            for (let j = 0; j < sh.length; j++) { if (sh[j].status === sts[i]) h = sh[j]; }
            let t = h ? new Date(h.time).toLocaleString('en-PK', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
            tl += '<div class="timeline-step ' + sc + '"><div class="timeline-dot ' + dc + '"><i class="' + icons[i] + '"></i></div><div class="timeline-info"><h5>' + sts[i] + '</h5><p>' + descs[i] + '</p>' + (t ? '<span class="ttime">' + t + '</span>' : '') + '</div></div>';
        }
        tl += '</div>';
    } else {
        tl = '<div style="text-align:center;padding:15px;color:var(--danger);"><i class="fas fa-times-circle" style="font-size:30px;"></i><p style="font-weight:600;margin-top:5px;">Cancelled</p></div>';
    }

    let itemsHtml = '';
    for (let i = 0; i < items.length; i++) {
        itemsHtml += items[i].name + ' x ' + items[i].qty + ' = Rs.' + (items[i].price * items[i].qty).toLocaleString() + '<br>';
    }

    c.innerHTML = '<div class="tracking-detail"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;"><h4 style="color:var(--primary);">' + o.id + '</h4><span class="status-badge status-' + o.status + '">' + o.status + '</span></div><div class="tracking-detail-grid"><div class="di"><span>Customer</span><strong>' + o.customer_name + '</strong></div><div class="di"><span>Phone</span><strong>' + o.customer_phone + '</strong></div><div class="di"><span>City</span><strong>' + o.customer_city + '</strong></div><div class="di"><span>Payment</span><strong>COD</strong></div><div class="di"><span>Date</span><strong>' + new Date(o.created_at).toLocaleDateString() + '</strong></div><div class="di"><span>Est. Delivery</span><strong>' + (o.estimated_delivery ? new Date(o.estimated_delivery).toLocaleDateString() : '3-5 days') + '</strong></div></div><div class="tracking-detail-grid" style="grid-template-columns:1fr;"><div class="di"><span>Address</span><strong>' + o.customer_address + ', ' + o.customer_city + '</strong></div></div><div style="background:var(--white);padding:10px;border-radius:8px;margin-bottom:12px;font-size:12px;"><strong>Items:</strong><br>' + itemsHtml + '<div style="border-top:2px solid #222;margin-top:6px;padding-top:6px;font-weight:700;color:var(--primary);">Total: Rs.' + o.total.toLocaleString() + '</div></div>' + tl + '</div>';
}

// ===== SLIDER =====
function startSlider() { slideInterval = setInterval(nextSlide, 5000); }
function goToSlide(i) { document.querySelectorAll('.hero-slide').forEach(function(s) { s.classList.remove('active'); }); document.querySelectorAll('.dot').forEach(function(d) { d.classList.remove('active'); }); currentSlide = i; document.querySelectorAll('.hero-slide')[currentSlide].classList.add('active'); document.querySelectorAll('.dot')[currentSlide].classList.add('active'); clearInterval(slideInterval); startSlider(); }
function nextSlide() { goToSlide((currentSlide + 1) % document.querySelectorAll('.hero-slide').length); }
function prevSlide() { let l = document.querySelectorAll('.hero-slide').length; goToSlide((currentSlide - 1 + l) % l); }
function startCountdown() { let e = new Date(); e.setHours(e.getHours() + 8); setInterval(function() { let d = e - new Date(); if (d <= 0) { e = new Date(); e.setHours(e.getHours() + 24); } document.getElementById('hours').textContent = String(Math.floor(d / 3600000)).padStart(2, '0'); document.getElementById('minutes').textContent = String(Math.floor((d % 3600000) / 60000)).padStart(2, '0'); document.getElementById('seconds').textContent = String(Math.floor((d % 60000) / 1000)).padStart(2, '0'); }, 1000); }

// ===== NAVIGATION =====
function showPage(p) { document.querySelectorAll('.page').forEach(function(x) { x.classList.remove('active'); }); var m = { home: 'homePage', shop: 'shopPage', about: 'aboutPage', contact: 'contactPage' }; var e = document.getElementById(m[p]); if (e) e.classList.add('active'); if (p === 'shop') clearFilters(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function handleScroll() { document.getElementById('header').classList.toggle('scrolled', window.scrollY > 100); document.getElementById('scrollTop').classList.toggle('visible', window.scrollY > 500); }
function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }
function scrollToSection(id) { var e = document.getElementById(id); if (e) e.scrollIntoView({ behavior: 'smooth' }); }
function toggleMobileMenu() { document.getElementById('catNavItems').classList.toggle('open'); }
