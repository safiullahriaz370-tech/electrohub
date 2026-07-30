// ===== SUPABASE CONFIG =====
var SUPABASE_URL = 'https://iguhpaqocjxwtfkpbgbg.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlndWhwYXFvY2p4d3Rma3BiZ2JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyNTEyMjQsImV4cCI6MjEwMDgyNzIyNH0.BrJb1CuFopsT4cQQtb4hf9jGznXxjcPnA-DsJ9vwmsc';

// ===== SUPABASE HELPERS =====
async function sbGet(table, params) {
    try {
        var url = SUPABASE_URL + '/rest/v1/' + table;
        if (params) url += '?' + params;
        var r = await fetch(url, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
        });
        if (!r.ok) { console.error('GET error:', await r.text()); return []; }
        return await r.json();
    } catch (e) { console.error('Fetch error:', e); return []; }
}

async function sbPost(table, data) {
    try {
        var r = await fetch(SUPABASE_URL + '/rest/v1/' + table, {
            method: 'POST',
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
            body: JSON.stringify(data)
        });
        if (!r.ok) { console.error('POST error:', await r.text()); return null; }
        return await r.json();
    } catch (e) { console.error('Post error:', e); return null; }
}

async function sbPatch(table, filter, data) {
    try {
        var r = await fetch(SUPABASE_URL + '/rest/v1/' + table + '?' + filter, {
            method: 'PATCH',
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
            body: JSON.stringify(data)
        });
        if (!r.ok) { console.error('PATCH error:', await r.text()); return null; }
        return await r.json();
    } catch (e) { console.error('Patch error:', e); return null; }
}

// ===== CONSTANTS =====
var CI = {
    chargers: 'fas fa-charging-station', cables: 'fas fa-plug',
    earphones: 'fas fa-headphones-alt', powerbanks: 'fas fa-battery-full',
    holders: 'fas fa-mobile-alt', watches: 'fas fa-clock',
    protectors: 'fas fa-shield-alt', covers: 'fas fa-tablet-alt',
    speakers: 'fas fa-volume-up', adapters: 'fas fa-exchange-alt',
    lights: 'fas fa-lightbulb', stands: 'fas fa-laptop',
    keyboards: 'fas fa-keyboard', storage: 'fas fa-hdd',
    cameras: 'fas fa-camera', other: 'fas fa-box'
};

var CN = {
    chargers: 'Chargers', cables: 'Cables', earphones: 'Earphones',
    powerbanks: 'Power Banks', holders: 'Phone Holders', watches: 'Smart Watches',
    protectors: 'Screen Protectors', covers: 'Mobile Covers',
    speakers: 'Bluetooth Speakers', adapters: 'Adapters',
    lights: 'Ring Lights / LED', stands: 'Laptop Stands',
    keyboards: 'Keyboards / Mouse', storage: 'USB / Storage',
    cameras: 'Camera Accessories', other: 'Other'
};

var CPN = {
    all: 'All Devices', iphone: 'iPhone', samsung: 'Samsung',
    typec: 'Type-C', microusb: 'Micro USB', laptop: 'Laptop'
};

// ===== STATE =====
var products = [];
var cart = JSON.parse(localStorage.getItem('cart')) || [];
var loggedUser = JSON.parse(localStorage.getItem('loggedUser')) || null;
var currentSlide = 0;
var slideInterval;
var currentShipping = 'pakistan';

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async function () {
    showLoading(true);
    await loadProducts();
    showLoading(false);
    renderAll();
    updateCartBadge();
    startSlider();
    startCountdown();
    buildFilters();
    updateUserUI();
    // Set initial shipping indicator
    var indicator = document.getElementById('activeShipping');
    if (indicator) indicator.className = 'active-shipping pak-active';
    var indicatorText = document.getElementById('shippingIndicator');
    if (indicatorText) indicatorText.textContent = '🇵🇰 Showing Pakistan Shipped Products • 2-5 Days Delivery';
    window.addEventListener('scroll', handleScroll);
});

function showLoading(show) {
    var el = document.getElementById('loadingOverlay');
    if (show) {
        if (!el) {
            var d = document.createElement('div');
            d.id = 'loadingOverlay';
            d.style.cssText = 'position:fixed;inset:0;background:rgba(255,255,255,0.95);display:flex;align-items:center;justify-content:center;z-index:99999;flex-direction:column;gap:15px;';
            d.innerHTML = '<i class="fas fa-bolt" style="font-size:50px;color:#FF7A00;animation:pulse 1s infinite;"></i><p style="font-weight:700;color:#FF7A00;font-size:18px;">Loading ElectroHub...</p>';
            document.body.appendChild(d);
        }
    } else {
        if (el) el.remove();
    }
}

// ===== LOAD PRODUCTS =====
async function loadProducts() {
    console.log('Loading products...');
    var data = await sbGet('products', 'select=*&order=id.asc');
    if (data && data.length > 0) {
        products = data.map(function (p) {
            return {
                id: p.id, name: p.name, category: p.category,
                price: p.price, oldPrice: p.old_price, image: p.image || '',
                description: p.description || '', brand: p.brand || 'Generic',
                compat: p.compat || 'all', stock: p.stock || 0,
                rating: parseFloat(p.rating) || 4.0, reviews: p.reviews || 0,
                isNew: p.is_new, isHot: p.is_hot, isSale: p.is_sale,
                isFlash: p.is_flash, shipFrom: p.ship_from || 'pakistan'
            };
        });
        console.log('✅ Products loaded:', products.length);
    } else {
        products = [];
        console.log('⚠️ No products in database');
    }
}

// ===== SHIPPING SWITCH =====
function switchShipping(type, btn) {
    currentShipping = type;
    document.querySelectorAll('.ship-tab').forEach(function (t) { t.classList.remove('active'); });
    btn.classList.add('active');
    var indicator = document.getElementById('activeShipping');
    var indicatorText = document.getElementById('shippingIndicator');
    if (type === 'pakistan') {
        indicator.className = 'active-shipping pak-active';
        indicatorText.textContent = '🇵🇰 Showing Pakistan Shipped Products • 2-5 Days Delivery';
    } else {
        indicator.className = 'active-shipping china-active';
        indicatorText.textContent = '🇨🇳 Showing China Shipped Products • 15-25 Days Delivery';
    }
    renderAll();
    var flashSale = document.getElementById('flash-sale');
    if (flashSale) flashSale.scrollIntoView({ behavior: 'smooth' });
}

// ===== AUTH =====
function openAuth(r) {
    if (r) sessionStorage.setItem('authRedirect', r);
    document.getElementById('authModal').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeAuth() {
    document.getElementById('authModal').classList.remove('open');
    document.body.style.overflow = '';
}

function switchAuth(t) {
    document.querySelectorAll('.auth-tab').forEach(function (x) { x.classList.remove('active'); });
    document.getElementById(t + 'Tab').classList.add('active');
}

async function registerCustomer(e) {
    e.preventDefault();
    var btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Wait...';
    var phone = document.getElementById('regPhone').value.trim();
    var existing = await sbGet('customers', 'phone=eq.' + phone);
    if (existing && existing.length > 0) {
        document.getElementById('regError').textContent = 'Phone already registered!';
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-user-plus"></i> Register';
        return;
    }
    var c = {
        id: 'C' + Date.now(),
        name: document.getElementById('regName').value.trim(),
        phone: phone,
        email: document.getElementById('regEmail').value.trim(),
        city: document.getElementById('regCity').value,
        address: document.getElementById('regAddress').value.trim(),
        password: document.getElementById('regPass').value
    };
    var result = await sbPost('customers', c);
    if (result) {
        loggedUser = c;
        localStorage.setItem('loggedUser', JSON.stringify(c));
        closeAuth();
        updateUserUI();
        showNotif('Welcome ' + c.name + '!');
        var r = sessionStorage.getItem('authRedirect');
        if (r === 'checkout') openCheckout();
        sessionStorage.removeItem('authRedirect');
    } else {
        document.getElementById('regError').textContent = 'Error. Try again.';
    }
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-user-plus"></i> Register';
}

async function loginCustomer(e) {
    e.preventDefault();
    var btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Wait...';
    var phone = document.getElementById('loginPhone').value.trim();
    var pass = document.getElementById('loginPass').value;
    var result = await sbGet('customers', 'phone=eq.' + phone + '&password=eq.' + pass);
    if (result && result.length > 0) {
        loggedUser = result[0];
        localStorage.setItem('loggedUser', JSON.stringify(loggedUser));
        closeAuth();
        updateUserUI();
        showNotif('Welcome ' + loggedUser.name + '!');
        var r = sessionStorage.getItem('authRedirect');
        if (r === 'checkout') openCheckout();
        sessionStorage.removeItem('authRedirect');
    } else {
        document.getElementById('loginError').textContent = 'Wrong phone or password.';
    }
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
}

function logoutUser() {
    loggedUser = null;
    localStorage.removeItem('loggedUser');
    updateUserUI();
    showNotif('Logged out');
}

function handleUserClick() {
    if (loggedUser) {
        if (confirm('Logout?')) logoutUser();
    } else {
        openAuth();
    }
}

function updateUserUI() {
    var t = document.getElementById('userTopBar');
    var h = document.getElementById('headerUserText');
    if (loggedUser) {
        t.innerHTML = '<a href="#" onclick="logoutUser()" style="color:var(--primary);font-weight:600;"><i class="fas fa-user-check"></i> ' + loggedUser.name.split(' ')[0] + ' | Logout</a>';
        h.textContent = loggedUser.name.split(' ')[0];
    } else {
        t.innerHTML = '<a href="#" onclick="openAuth()"><i class="fas fa-user"></i> Login</a>';
        h.textContent = 'Login';
    }
}

function showNotif(t, c) {
    var n = document.getElementById('cartNotification');
    n.style.background = c || 'var(--success)';
    document.getElementById('cartNotifText').textContent = t;
    n.classList.remove('show');
    void n.offsetWidth;
    n.classList.add('show');
    setTimeout(function () { n.classList.remove('show'); }, 2500);
}

// ===== RENDER =====
function renderAll() {
    var filtered = products.filter(function (p) {
        return (p.shipFrom || 'pakistan') === currentShipping;
    });

    var flash = filtered.filter(function (p) {
        return p.isFlash || (p.isSale && p.oldPrice);
    }).sort(function (a, b) {
        return ((b.oldPrice - b.price) / b.oldPrice) - ((a.oldPrice - a.price) / a.oldPrice);
    }).slice(0, 4);

    rG('flashSaleProducts', flash);
    rG('featuredProducts', filtered.filter(function (p) { return p.isHot; }).slice(0, 8));
    rG('newArrivals', filtered.filter(function (p) { return p.isNew; }).slice(0, 8));
    rG('bestSellers', filtered.slice().sort(function (a, b) { return b.reviews - a.reviews; }).slice(0, 8));

    // Update section colors
    var sections = document.querySelectorAll('.section');
    sections.forEach(function (s) {
        s.classList.remove('pak-section', 'china-section');
        s.classList.add(currentShipping === 'pakistan' ? 'pak-section' : 'china-section');
    });

    var flashEl = document.getElementById('flash-sale');
    if (flashEl) {
        flashEl.classList.remove('pak-flash', 'china-flash');
        flashEl.classList.add(currentShipping === 'pakistan' ? 'pak-flash' : 'china-flash');
    }

    renderShop();
}

function rG(id, l) {
    var e = document.getElementById(id);
    if (e) e.innerHTML = l.length ? l.map(pCard).join('') : '<p style="text-align:center;color:#999;padding:30px;grid-column:1/-1">No products found</p>';
}

function pCard(p) {
    var d = p.oldPrice ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100) : 0;
    var bd = '', st = '', oos = p.stock <= 0;
    if (d > 0) bd += '<span class="product-badge sale">-' + d + '%</span>';
    if (p.isNew) bd += '<span class="product-badge new">NEW</span>';
    if (p.isHot) bd += '<span class="product-badge hot">HOT</span>';
    for (var i = 1; i <= 5; i++) st += i <= Math.floor(p.rating) ? '<i class="fas fa-star"></i>' : i - p.rating < 1 ? '<i class="fas fa-star-half-alt"></i>' : '<i class="far fa-star"></i>';
    var img = p.image ? '<img src="' + p.image + '">' : '<i class="' + (CI[p.category] || 'fas fa-box') + ' placeholder-icon"></i>';

    var shipType = p.shipFrom || 'pakistan';
    var shipBadge = '<span class="ship-from-badge ' + (shipType === 'pakistan' ? 'pak' : 'china') + '">' + (shipType === 'pakistan' ? '🇵🇰 PK' : '🇨🇳 CN') + '</span>';
    var cardClass = shipType === 'pakistan' ? 'pak-product' : 'china-product';

    return '<div class="product-card ' + cardClass + '"><div class="product-image">' + img + '<div class="product-badges">' + bd + '</div>' + shipBadge + '<div class="product-actions-overlay"><button class="action-btn" onclick="event.stopPropagation();openQuickView(' + p.id + ')"><i class="fas fa-eye"></i></button>' + (!oos ? '<button class="action-btn" onclick="event.stopPropagation();addToCart(' + p.id + ')"><i class="fas fa-cart-plus"></i></button>' : '') + '</div></div><div class="product-info"><span class="product-category">' + (CN[p.category] || p.category) + '</span><h3 class="product-name">' + p.name + '</h3><div class="product-rating">' + st + '<span>(' + p.reviews + ')</span></div><div class="product-price"><span class="current">Rs.' + p.price.toLocaleString() + '</span>' + (p.oldPrice ? '<span class="old">Rs.' + p.oldPrice.toLocaleString() + '</span>' : '') + (d ? '<span class="discount">-' + d + '%</span>' : '') + '</div><div class="product-btns">' + (!oos ? '<button class="btn-add-to-cart" onclick="event.stopPropagation();addToCart(' + p.id + ')"><i class="fas fa-cart-plus"></i> Cart</button><button class="btn-buy-small" onclick="event.stopPropagation();quickBuy(' + p.id + ')"><i class="fas fa-bolt"></i> Buy</button>' : '<button class="btn-add-to-cart" disabled style="opacity:0.5;width:100%"><i class="fas fa-times-circle"></i> Out</button>') + '</div></div></div>';
}

// ===== SHOP =====
function renderShop(f) {
    var p = f || products.filter(function (prod) {
        return (prod.shipFrom || 'pakistan') === currentShipping;
    });
    document.getElementById('productCount').textContent = p.length;
    rG('shopProducts', p);
}

function buildFilters() {
    // No sidebar filters
}

function applyFilters() {
    renderShop();
}

function clearFilters() {
    renderShop();
}

function sortProducts() {
    var f = products.filter(function (p) {
        return (p.shipFrom || 'pakistan') === currentShipping;
    });
    var s = document.getElementById('sortSelect').value;
    if (s === 'price-low') f.sort(function (a, b) { return a.price - b.price; });
    else if (s === 'price-high') f.sort(function (a, b) { return b.price - a.price; });
    else if (s === 'newest') f.sort(function (a, b) { return b.id - a.id; });
    renderShop(f);
}

function filterByCategory(c) {
    showPage('shop');
    document.getElementById('shopBreadcrumb').textContent = CN[c] || c;
    renderShop(products.filter(function (p) {
        return p.category === c && (p.shipFrom || 'pakistan') === currentShipping;
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleSearch(e) { if (e.key === 'Enter') searchProducts(); }

function searchProducts() {
    var q = document.getElementById('searchInput').value.toLowerCase();
    var cat = document.getElementById('searchCategory').value;
    var r = products.filter(function (p) {
        var mq = !q || p.name.toLowerCase().includes(q) || (p.brand && p.brand.toLowerCase().includes(q));
        var mc = cat === 'all' || p.category === cat;
        var ms = (p.shipFrom || 'pakistan') === currentShipping;
        return mq && mc && ms;
    });
    showPage('shop');
    document.getElementById('shopBreadcrumb').textContent = q ? '"' + q + '"' : 'All';
    renderShop(r);
}

// ===== QUICK VIEW =====
function openQuickView(id) {
    var p = products.find(function (x) { return x.id === id; });
    if (!p) return;
    document.getElementById('modalImageContainer').innerHTML = p.image ? '<img src="' + p.image + '">' : '<i class="' + (CI[p.category] || 'fas fa-box') + '" style="font-size:70px;color:#E5E5E5"></i>';
    document.getElementById('modalCategory').textContent = CN[p.category] || '';
    document.getElementById('modalName').textContent = p.name;
    document.getElementById('modalPrice').textContent = 'Rs.' + p.price.toLocaleString();
    document.getElementById('modalOldPrice').textContent = p.oldPrice ? 'Rs.' + p.oldPrice.toLocaleString() : '';
    var d = p.oldPrice ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100) : 0;
    document.getElementById('modalDiscount').textContent = d ? '-' + d + '%' : '';
    document.getElementById('modalDescription').textContent = p.description;
    var st = '';
    for (var i = 1; i <= 5; i++) st += i <= Math.floor(p.rating) ? '<i class="fas fa-star"></i>' : i - p.rating < 1 ? '<i class="fas fa-star-half-alt"></i>' : '<i class="far fa-star"></i>';
    document.getElementById('modalStars').innerHTML = st;
    document.getElementById('modalReviews').textContent = '(' + p.reviews + ')';
    document.getElementById('modalStock').textContent = p.stock > 0 ? 'In Stock (' + p.stock + ')' : 'Out of Stock';
    document.getElementById('modalBrand').textContent = p.brand;
    document.getElementById('modalCompat').textContent = CPN[p.compat] || p.compat;

    // Delivery info based on shipping
    var deliveryEl = document.getElementById('modalDelivery');
    if (deliveryEl) {
        var ship = p.shipFrom || 'pakistan';
        if (ship === 'pakistan') {
            deliveryEl.innerHTML = '<i class="fas fa-truck" style="color:#4CAF50"></i> 🇵🇰 2-5 Days Delivery';
            deliveryEl.style.color = '#2E7D32';
        } else {
            deliveryEl.innerHTML = '<i class="fas fa-ship" style="color:#FF7A00"></i> 🇨🇳 15-25 Days Delivery';
            deliveryEl.style.color = '#E65100';
        }
    }

    document.getElementById('modalQty').value = 1;
    document.getElementById('quickViewModal').dataset.pid = id;
    document.getElementById('quickViewModal').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeQuickView() {
    document.getElementById('quickViewModal').classList.remove('open');
    document.body.style.overflow = '';
}

function changeQty(a) {
    var i = document.getElementById('modalQty');
    var v = parseInt(i.value) + a;
    if (v >= 1 && v <= 10) i.value = v;
}

function addToCartFromModal() {
    addToCart(parseInt(document.getElementById('quickViewModal').dataset.pid), parseInt(document.getElementById('modalQty').value));
    closeQuickView();
}

function buyNowFromModal() {
    addToCart(parseInt(document.getElementById('quickViewModal').dataset.pid), parseInt(document.getElementById('modalQty').value));
    closeQuickView();
    proceedToCheckout();
}

function quickBuy(id) {
    addToCart(id, 1);
    proceedToCheckout();
}

// ===== CART =====
function addToCart(id, qty) {
    qty = qty || 1;
    var p = products.find(function (x) { return x.id === id; });
    if (!p || p.stock <= 0) return alert('Out of stock!');
    var e = cart.find(function (i) { return i.id === id; });
    if (e) {
        if (e.qty + qty > p.stock) return alert('Only ' + p.stock + ' left');
        e.qty += qty;
    } else {
        cart.push({ id: id, qty: qty });
    }
    saveCart();
    updateCartBadge();
    showNotif('Added to cart!');
}

function removeFromCart(id) {
    cart = cart.filter(function (i) { return i.id !== id; });
    saveCart();
    updateCartBadge();
    renderCartItems();
}

function updateCartQty(id, a) {
    var i = cart.find(function (x) { return x.id === id; });
    if (i) {
        i.qty += a;
        if (i.qty <= 0) { removeFromCart(id); return; }
    }
    saveCart();
    updateCartBadge();
    renderCartItems();
}

function clearCart() {
    cart = [];
    saveCart();
    updateCartBadge();
    renderCartItems();
}

function saveCart() { localStorage.setItem('cart', JSON.stringify(cart)); }

function updateCartBadge() {
    var t = cart.reduce(function (s, i) { return s + i.qty; }, 0);
    document.getElementById('cartBadge').textContent = t;
    document.getElementById('cartHeaderCount').textContent = t;
}

function getCartTotal() {
    return cart.reduce(function (s, i) {
        var p = products.find(function (x) { return x.id === i.id; });
        return s + (p ? p.price * i.qty : 0);
    }, 0);
}

function openCart() {
    renderCartItems();
    document.getElementById('cartOverlay').classList.add('open');
    document.getElementById('cartSidebar').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeCart() {
    document.getElementById('cartOverlay').classList.remove('open');
    document.getElementById('cartSidebar').classList.remove('open');
    document.body.style.overflow = '';
}

function renderCartItems() {
    var c = document.getElementById('cartItems');
    var f = document.getElementById('cartFooter');
    if (!cart.length) {
        c.innerHTML = '<div class="cart-empty"><i class="fas fa-shopping-cart"></i><p>Cart empty</p><button onclick="closeCart()" class="btn-shop-now">Shop</button></div>';
        f.style.display = 'none';
        return;
    }
    var html = '';
    for (var idx = 0; idx < cart.length; idx++) {
        var item = cart[idx];
        var p = products.find(function (x) { return x.id === item.id; });
        if (!p) continue;
        var img = p.image ? '<img src="' + p.image + '">' : '<i class="' + (CI[p.category] || 'fas fa-box') + '"></i>';
        var shipIcon = (p.shipFrom || 'pakistan') === 'pakistan' ? '🇵🇰' : '🇨🇳';
        html += '<div class="cart-item"><div class="cart-item-image">' + img + '</div><div class="cart-item-info"><div class="cart-item-name">' + shipIcon + ' ' + p.name + '</div><div class="cart-item-price">Rs.' + p.price.toLocaleString() + '</div><div class="cart-item-qty"><button onclick="updateCartQty(' + item.id + ',-1)">-</button><span>' + item.qty + '</span><button onclick="updateCartQty(' + item.id + ',1)">+</button></div></div><button class="cart-item-remove" onclick="removeFromCart(' + item.id + ')"><i class="fas fa-trash-alt"></i></button></div>';
    }
    c.innerHTML = html;
    f.style.display = 'block';
    document.getElementById('cartTotal').textContent = 'Rs.' + getCartTotal().toLocaleString();
}

// ===== CHECKOUT =====
function proceedToCheckout() {
    if (!cart.length) return alert('Cart empty!');
    closeCart();
    if (!loggedUser) return openAuth('checkout');
    openCheckout();
}

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

    var itemsHtml = '';
    for (var idx = 0; idx < cart.length; idx++) {
        var item = cart[idx];
        var p = products.find(function (x) { return x.id === item.id; });
        if (!p) continue;
        var shipIcon = (p.shipFrom || 'pakistan') === 'pakistan' ? '🇵🇰' : '🇨🇳';
        itemsHtml += '<div class="checkout-summary-item"><div class="checkout-item-placeholder"><i class="' + (CI[p.category] || 'fas fa-box') + '"></i></div><div class="checkout-item-info"><h5>' + shipIcon + ' ' + p.name + '</h5><span>Qty: ' + item.qty + '</span></div><div class="checkout-item-price">Rs.' + (p.price * item.qty).toLocaleString() + '</div></div>';
    }
    document.getElementById('checkoutItems').innerHTML = itemsHtml;

    var sub = getCartTotal();
    var del = sub >= 2000 ? 0 : 150;
    document.getElementById('summarySubtotal').textContent = 'Rs.' + sub.toLocaleString();
    document.getElementById('summaryDelivery').textContent = del ? 'Rs.' + del : 'FREE';
    document.getElementById('summaryTotal').textContent = 'Rs.' + (sub + del).toLocaleString();
    document.getElementById('summaryDiscountRow').style.display = 'none';
    document.getElementById('checkoutModal').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeCheckout() {
    document.getElementById('checkoutModal').classList.remove('open');
    document.body.style.overflow = '';
}

function applyPromo() {
    var code = document.getElementById('promoInput').value.trim().toUpperCase();
    var sub = getCartTotal();

    if (!code) {
        showPromoHint();
        return;
    }

    if (code === 'ELECTRO10') {
        var disc = Math.round(sub * 0.1);
        var del = sub >= 2000 ? 0 : 150;
        document.getElementById('summaryDiscountRow').style.display = 'flex';
        document.getElementById('summaryDiscount').textContent = '-Rs.' + disc.toLocaleString();
        document.getElementById('summaryTotal').textContent = 'Rs.' + (sub - disc + del).toLocaleString();
        showNotif('🎉 10% off! Saved Rs.' + disc.toLocaleString());
    } else if (code === 'FREESHIP') {
        document.getElementById('summaryDelivery').textContent = 'FREE';
        document.getElementById('summaryTotal').textContent = 'Rs.' + sub.toLocaleString();
        showNotif('🚚 Free shipping!');
    } else if (code === 'WELCOME20') {
        var disc2 = Math.round(sub * 0.20);
        var del2 = sub >= 2000 ? 0 : 150;
        document.getElementById('summaryDiscountRow').style.display = 'flex';
        document.getElementById('summaryDiscount').textContent = '-Rs.' + disc2.toLocaleString();
        document.getElementById('summaryTotal').textContent = 'Rs.' + (sub - disc2 + del2).toLocaleString();
        showNotif('🎉 20% off! Saved Rs.' + disc2.toLocaleString());
    } else if (code === 'FLAT200') {
        var del3 = sub >= 2000 ? 0 : 150;
        document.getElementById('summaryDiscountRow').style.display = 'flex';
        document.getElementById('summaryDiscount').textContent = '-Rs.200';
        document.getElementById('summaryTotal').textContent = 'Rs.' + (sub - 200 + del3).toLocaleString();
        showNotif('🎉 Rs.200 OFF!');
    } else {
        showNotif('❌ Invalid code!', 'var(--danger)');
        showPromoHint();
    }
}

function showPromoHint() {
    var hintDiv = document.getElementById('promoHint');
    if (!hintDiv) {
        hintDiv = document.createElement('div');
        hintDiv.id = 'promoHint';
        hintDiv.style.cssText = 'margin-top:10px;padding:12px;background:#FFF3E6;border-radius:8px;font-size:11px;border:1px solid #FF7A00;animation:fadeIn 0.3s;';
        hintDiv.innerHTML = '<strong style="color:#FF7A00;display:block;margin-bottom:6px;">💡 Try these codes:</strong>' +
            '<div style="display:flex;flex-direction:column;gap:4px;">' +
            '<span onclick="document.getElementById(\'promoInput\').value=\'ELECTRO10\';applyPromo();" style="cursor:pointer;padding:4px 8px;background:white;border-radius:4px;border:1px solid #E5E5E5;"><strong>ELECTRO10</strong> → 10% Off</span>' +
            '<span onclick="document.getElementById(\'promoInput\').value=\'FREESHIP\';applyPromo();" style="cursor:pointer;padding:4px 8px;background:white;border-radius:4px;border:1px solid #E5E5E5;"><strong>FREESHIP</strong> → Free Delivery</span>' +
            '<span onclick="document.getElementById(\'promoInput\').value=\'WELCOME20\';applyPromo();" style="cursor:pointer;padding:4px 8px;background:white;border-radius:4px;border:1px solid #E5E5E5;"><strong>WELCOME20</strong> → 20% Off</span>' +
            '<span onclick="document.getElementById(\'promoInput\').value=\'FLAT200\';applyPromo();" style="cursor:pointer;padding:4px 8px;background:white;border-radius:4px;border:1px solid #E5E5E5;"><strong>FLAT200</strong> → Rs.200 Off</span>' +
            '</div>';
        document.querySelector('.promo-code').appendChild(hintDiv);
    }
}

// ===== PLACE ORDER =====
async function placeOrder(e) {
    e.preventDefault();
    var btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Placing...';

    var sub = getCartTotal();
    var del = sub >= 2000 ? 0 : 150;
    var total = sub + del;
    var dr = document.getElementById('summaryDiscountRow');
    if (dr && dr.style.display !== 'none') {
        total -= parseInt(document.getElementById('summaryDiscount').textContent.replace(/[^0-9]/g, ''));
    }

    try {
        var existing = await sbGet('orders', 'select=id');
        var count = existing ? existing.length : 0;
        var orderId = 'EH-' + String(count + 1).padStart(5, '0');
        var now = new Date();

        var orderItems = [];
        for (var idx = 0; idx < cart.length; idx++) {
            var item = cart[idx];
            var p = products.find(function (x) { return x.id === item.id; });
            orderItems.push({
                id: item.id,
                name: p ? p.name : 'Unknown',
                price: p ? p.price : 0,
                qty: item.qty,
                category: p ? p.category : '',
                ship_from: p ? (p.shipFrom || 'pakistan') : 'pakistan'
            });
        }

        var orderData = {
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

        console.log('📦 Saving order:', orderId);
        var result = await sbPost('orders', orderData);

        if (result) {
            console.log('✅ ORDER SAVED:', orderId);
            for (var idx2 = 0; idx2 < cart.length; idx2++) {
                var item2 = cart[idx2];
                var p2 = products.find(function (x) { return x.id === item2.id; });
                if (p2) {
                    var newStock = Math.max(0, p2.stock - item2.qty);
                    await sbPatch('products', 'id=eq.' + p2.id, { stock: newStock });
                    p2.stock = newStock;
                }
            }
            cart = [];
            saveCart();
            updateCartBadge();
            closeCheckout();
            document.getElementById('checkoutForm').reset();
            document.getElementById('successOrderId').textContent = '#' + orderId;
            document.getElementById('successTotal').textContent = 'Rs.' + total.toLocaleString();
            document.getElementById('orderSuccessModal').classList.add('open');
        } else {
            alert('Order failed! Check console.');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-lock"></i> Place Order';
        }
    } catch (err) {
        console.error('Order error:', err);
        alert('Connection error.');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-lock"></i> Place Order';
    }
}

function continueShopping() {
    document.getElementById('orderSuccessModal').classList.remove('open');
    document.body.style.overflow = '';
    showPage('home');
    loadProducts().then(function () { renderAll(); });
}

function openTrackingFromSuccess() {
    var oid = document.getElementById('successOrderId').textContent.replace('#', '');
    document.getElementById('orderSuccessModal').classList.remove('open');
    openTrackingModal();
    document.getElementById('trackOrderInput').value = oid;
    trackOrder();
}

// ===== TRACKING =====
function openTrackingModal() {
    document.getElementById('trackingModal').classList.add('open');
    document.body.style.overflow = 'hidden';
    document.getElementById('trackingResult').innerHTML = '';
    showMyOrders();
}

function closeTracking() {
    document.getElementById('trackingModal').classList.remove('open');
    document.body.style.overflow = '';
}

async function showMyOrders() {
    var c = document.getElementById('myOrdersList');
    if (!loggedUser) { c.innerHTML = ''; return; }
    var orders = await sbGet('orders', 'customer_phone=eq.' + loggedUser.phone + '&order=created_at.desc');
    if (!orders || !orders.length) { c.innerHTML = ''; return; }
    var html = '<div class="my-orders-section"><h4><i class="fas fa-list"></i> My Orders</h4>';
    for (var i = 0; i < orders.length; i++) {
        var o = orders[i];
        html += '<div class="my-order-item" onclick="document.getElementById(\'trackOrderInput\').value=\'' + o.id + '\';trackOrder();"><span style="font-weight:700;color:var(--primary);">' + o.id + '</span><span class="status-badge status-' + o.status + '" style="font-size:10px;padding:3px 8px;">' + o.status + '</span><strong>Rs.' + o.total.toLocaleString() + '</strong></div>';
    }
    html += '</div>';
    c.innerHTML = html;
}

async function trackOrder() {
    var id = document.getElementById('trackOrderInput').value.trim().toUpperCase();
    if (!id.startsWith('EH-')) id = 'EH-' + id.replace(/[^0-9]/g, '').padStart(5, '0');
    var c = document.getElementById('trackingResult');
    c.innerHTML = '<p style="text-align:center;padding:20px;"><i class="fas fa-spinner fa-spin" style="color:var(--primary);font-size:25px;"></i></p>';

    var orders = await sbGet('orders', 'id=eq.' + id);
    if (!orders || !orders.length) {
        c.innerHTML = '<div style="text-align:center;padding:25px;color:var(--danger);"><i class="fas fa-exclamation-circle" style="font-size:35px;display:block;margin-bottom:8px;"></i><h4>Not Found</h4></div>';
        return;
    }

    var o = orders[0];
    var sh = o.status_history || [];
    var items = o.items || [];
    var sts = ['Pending', 'Confirmed', 'Shipped', 'Delivered'];
    var icons = ['fas fa-clock', 'fas fa-check', 'fas fa-shipping-fast', 'fas fa-box-open'];
    var descs = ['Processing', 'Packed', 'On the way', 'Delivered!'];
    var ci = o.status === 'Cancelled' ? -1 : sts.indexOf(o.status);

    var tl = '';
    if (o.status !== 'Cancelled') {
        tl = '<div class="tracking-timeline">';
        for (var i = 0; i < sts.length; i++) {
            var dc = i < ci ? 'active' : i === ci ? 'current' : '';
            var sc = i < ci ? 'completed' : '';
            var h = null;
            for (var j = 0; j < sh.length; j++) { if (sh[j].status === sts[i]) h = sh[j]; }
            var t = h ? new Date(h.time).toLocaleString('en-PK', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
            tl += '<div class="timeline-step ' + sc + '"><div class="timeline-dot ' + dc + '"><i class="' + icons[i] + '"></i></div><div class="timeline-info"><h5>' + sts[i] + '</h5><p>' + descs[i] + '</p>' + (t ? '<span class="ttime">' + t + '</span>' : '') + '</div></div>';
        }
        tl += '</div>';
    } else {
        tl = '<div style="text-align:center;padding:15px;color:var(--danger);"><i class="fas fa-times-circle" style="font-size:30px;"></i><p style="font-weight:600;margin-top:5px;">Cancelled</p></div>';
    }

    var itemsHtml = '';
    for (var k = 0; k < items.length; k++) {
        var shipIcon = items[k].ship_from === 'china' ? '🇨🇳' : '🇵🇰';
        itemsHtml += shipIcon + ' ' + items[k].name + ' x ' + items[k].qty + ' = Rs.' + (items[k].price * items[k].qty).toLocaleString() + '<br>';
    }

    c.innerHTML = '<div class="tracking-detail"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;"><h4 style="color:var(--primary);">' + o.id + '</h4><span class="status-badge status-' + o.status + '">' + o.status + '</span></div><div class="tracking-detail-grid"><div class="di"><span>Customer</span><strong>' + o.customer_name + '</strong></div><div class="di"><span>Phone</span><strong>' + o.customer_phone + '</strong></div><div class="di"><span>City</span><strong>' + o.customer_city + '</strong></div><div class="di"><span>Payment</span><strong>COD</strong></div><div class="di"><span>Date</span><strong>' + new Date(o.created_at).toLocaleDateString() + '</strong></div><div class="di"><span>Est. Delivery</span><strong>' + (o.estimated_delivery ? new Date(o.estimated_delivery).toLocaleDateString() : '3-5 days') + '</strong></div></div><div class="tracking-detail-grid" style="grid-template-columns:1fr;"><div class="di"><span>Address</span><strong>' + o.customer_address + ', ' + o.customer_city + '</strong></div></div><div style="background:var(--white);padding:10px;border-radius:8px;margin-bottom:12px;font-size:12px;"><strong>Items:</strong><br>' + itemsHtml + '<div style="border-top:2px solid #222;margin-top:6px;padding-top:6px;font-weight:700;color:var(--primary);">Total: Rs.' + o.total.toLocaleString() + '</div></div>' + tl + '</div>';
}

// ===== SLIDER =====
function startSlider() { slideInterval = setInterval(nextSlide, 5000); }
function goToSlide(i) {
    document.querySelectorAll('.hero-slide').forEach(function (s) { s.classList.remove('active'); });
    document.querySelectorAll('.dot').forEach(function (d) { d.classList.remove('active'); });
    currentSlide = i;
    document.querySelectorAll('.hero-slide')[currentSlide].classList.add('active');
    document.querySelectorAll('.dot')[currentSlide].classList.add('active');
    clearInterval(slideInterval);
    startSlider();
}
function nextSlide() { goToSlide((currentSlide + 1) % document.querySelectorAll('.hero-slide').length); }
function prevSlide() { var l = document.querySelectorAll('.hero-slide').length; goToSlide((currentSlide - 1 + l) % l); }

function startCountdown() {
    var e = new Date();
    e.setHours(e.getHours() + 8);
    setInterval(function () {
        var d = e - new Date();
        if (d <= 0) { e = new Date(); e.setHours(e.getHours() + 24); }
        document.getElementById('hours').textContent = String(Math.floor(d / 3600000)).padStart(2, '0');
        document.getElementById('minutes').textContent = String(Math.floor((d % 3600000) / 60000)).padStart(2, '0');
        document.getElementById('seconds').textContent = String(Math.floor((d % 60000) / 1000)).padStart(2, '0');
    }, 1000);
}

// ===== NAVIGATION =====
function showPage(p) {
    document.querySelectorAll('.page').forEach(function (x) { x.classList.remove('active'); });
    var m = { home: 'homePage', shop: 'shopPage', about: 'aboutPage', contact: 'contactPage' };
    var e = document.getElementById(m[p]);
    if (e) e.classList.add('active');
    if (p === 'shop') clearFilters();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleScroll() {
    document.getElementById('header').classList.toggle('scrolled', window.scrollY > 100);
    document.getElementById('scrollTop').classList.toggle('visible', window.scrollY > 500);
}

function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }
function scrollToSection(id) { var e = document.getElementById(id); if (e) e.scrollIntoView({ behavior: 'smooth' }); }
function toggleMobileMenu() { document.getElementById('catNavItems').classList.toggle('open'); }
