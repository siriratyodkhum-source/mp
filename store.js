(() => {
  const CART_KEY = 'anfCart';
  const USER_KEY = 'anfUser';
  const LIBRARY_KEY = 'anfLibrary';
  const LAST_CATEGORY_KEY = 'anfLastCategory';
  const CATEGORY_FALLBACK = 'Home.html';

  const pageName = () => decodeURIComponent(window.location.pathname.split('/').pop() || 'Home.html');
  const currentPage = pageName();
  const getUser = () => {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; }
  };
  const setUser = (user) => localStorage.setItem(USER_KEY, JSON.stringify(user));
  const getCart = () => {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch { return []; }
  };
  const setCart = (cart) => localStorage.setItem(CART_KEY, JSON.stringify(cart));
  const getLibrary = () => {
    try { return JSON.parse(localStorage.getItem(LIBRARY_KEY) || '[]'); } catch { return []; }
  };
  const setLibrary = (library) => localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
  const money = (value) => {
    const number = Number.parseFloat(String(value ?? '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(number) ? number : 0;
  };
  const formatMoney = (value) => `${money(value).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}฿`;
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
  const safeUrl = (value, fallback = CATEGORY_FALLBACK) => {
    const raw = String(value || '').trim();
    if (!raw || raw.startsWith('javascript:')) return fallback;
    return raw;
  };
  const getQuery = () => new URLSearchParams(window.location.search);
  const pageFromQuery = () => safeUrl(getQuery().get('from'), localStorage.getItem(LAST_CATEGORY_KEY) || CATEGORY_FALLBACK);
  const rememberCategory = (url) => {
    const safe = safeUrl(url);
    localStorage.setItem(LAST_CATEGORY_KEY, safe);
    return safe;
  };

  const cartCount = () => getCart().reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const updateCartBadges = () => document.querySelectorAll('[data-cart-count]').forEach((node) => { node.textContent = cartCount(); });

  function createUtilityNav() {
    const header = document.querySelector('header.navbar, header');
    if (!header || header.querySelector('.store-header-actions')) return;

    // เก็บเฉพาะโลโก้/ชื่อหน้าไว้ แล้วนำปุ่มนำทางเดิมออกจาก Header
    Array.from(header.children).forEach((child) => {
      const keep = child.classList.contains('logo') || child.classList.contains('brand') || child.classList.contains('nav-left') || child.classList.contains('nav-title');
      if (!keep) child.remove();
    });

    const user = getUser();
    const actions = document.createElement('div');
    actions.className = 'store-header-actions';
    actions.innerHTML = `
      <a class="header-action" href="Home.html"><i class="fa-solid fa-house"></i><span>หน้าหลัก</span></a>
      <a class="header-action header-cart" href="cart.html"><i class="fa-solid fa-cart-shopping"></i><span>ตะกร้า</span><b class="cart-badge" data-cart-count>0</b></a>
      ${user ? `<a class="header-action header-account" href="profile.html"><span class="mini-avatar">${user.avatar ? `<img src="${escapeHtml(user.avatar)}" alt="รูปโปรไฟล์">` : '<i class="fa-solid fa-user"></i>'}</span><span>${escapeHtml(user.name || 'บัญชีของฉัน')}</span></a>` : '<a class="header-action header-account" href="index.html"><i class="fa-solid fa-right-to-bracket"></i><span>เข้าสู่ระบบ</span></a>'}`;
    header.appendChild(actions);
  }

  function makeExistingLoginButtonAccountAware() {
    // ปุ่ม Login เดิมถูกแทนที่ด้วย .store-header-actions แล้ว
  }

  function cardGameData(card) {
    return {
      title: card.dataset.gameTitle || card.querySelector('.game-title, .card-title, h3, h2')?.textContent.trim() || 'เกมใหม่',
      price: card.dataset.gamePrice || card.querySelector('.game-price, .price')?.textContent.trim() || '0.00฿',
      image: card.dataset.gameImage || card.querySelector('img')?.getAttribute('src') || '',
      category: card.dataset.categoryName || document.querySelector('.nav-title')?.textContent.trim() || 'ร้านค้า',
      categoryUrl: safeUrl(card.dataset.categoryUrl || localStorage.getItem(LAST_CATEGORY_KEY) || (currentPage === 'Home.html' ? 'Home.html' : currentPage)),
    };
  }

  function detailUrl(game, action = '') {
    const params = new URLSearchParams({
      title: game.title,
      price: game.price,
      image: game.image,
      category: game.category,
      from: game.categoryUrl,
    });
    if (action) params.set('action', action);
    return `Game-detail.html?${params.toString()}`;
  }

  function bindGameCards() {
    const cards = document.querySelectorAll('.store-game-card');
    cards.forEach((card) => {
      const game = cardGameData(card);
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'link');
      const go = () => { rememberCategory(game.categoryUrl); window.location.href = detailUrl(game); };
      card.addEventListener('click', (event) => {
        if (event.target.closest('button, a, input, select')) return;
        go();
      });
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); go(); }
      });
      card.querySelectorAll('.buy-btn, .btn-buy, [data-buy-game]').forEach((button) => {
        button.removeAttribute('onclick');
        button.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); rememberCategory(game.categoryUrl); window.location.href = detailUrl(game, 'buy'); });
      });
    });
  }

  function readDetailGame() {
    const query = getQuery();
    return {
      title: query.get('title') || 'เกมที่เลือก',
      price: query.get('price') || '0.00฿',
      image: query.get('image') || '',
      category: query.get('category') || 'ร้านค้า',
      categoryUrl: pageFromQuery(),
    };
  }

  function initDetail() {
    if (currentPage !== 'Game-detail.html') return;
    const game = readDetailGame();
    rememberCategory(game.categoryUrl);
    const title = document.querySelector('[data-detail-title]');
    const price = document.querySelector('[data-detail-price]');
    const image = document.querySelector('[data-detail-image]');
    const category = document.querySelector('[data-detail-category]');
    if (title) title.textContent = game.title;
    if (price) price.textContent = money(game.price) === 0 && /ฟรี/i.test(game.price) ? 'ฟรี' : formatMoney(game.price);
    if (image) { image.src = game.image; image.alt = game.title; }
    if (category) category.textContent = game.category;
    document.querySelectorAll('[data-back-category]').forEach((link) => { link.href = game.categoryUrl; link.textContent = `← กลับไปหมวด${game.category}`; });
    const addButton = document.querySelector('[data-add-to-cart]');
    if (addButton) {
      addButton.textContent = money(game.price) === 0 && /ฟรี/i.test(game.price) ? 'รับเกมฟรี' : 'เพิ่มลงตะกร้า';
      addButton.onclick = () => addToCart(game, 'cart.html');
    }
    const buyButton = document.querySelector('[data-buy-now]');
    if (buyButton) buyButton.onclick = () => addToCart(game, 'checkout.html');
  }

  function addToCart(game, destination = 'cart.html') {
    const cart = getCart();
    const found = cart.find((item) => item.title === game.title && item.category === game.category);
    if (found) found.quantity = Number(found.quantity || 0) + 1;
    else cart.push({ ...game, quantity: 1 });
    setCart(cart);
    rememberCategory(game.categoryUrl);
    window.location.href = `${destination}?from=${encodeURIComponent(game.categoryUrl)}`;
  }

  function initCart() {
    if (currentPage !== 'cart.html') return;
    const from = pageFromQuery();
    rememberCategory(from);
    const container = document.querySelector('[data-cart-items]');
    const empty = document.querySelector('[data-cart-empty]');
    const summary = document.querySelector('[data-cart-summary]');
    const confirm = document.querySelector('[data-confirm-cart]');
    const continueLink = document.querySelector('[data-continue-shopping]');
    if (continueLink) continueLink.href = from;
    const render = () => {
      const cart = getCart();
      if (!container) return;
      if (!cart.length) {
        container.innerHTML = '';
        if (empty) empty.hidden = false;
        if (summary) summary.hidden = true;
        return;
      }
      if (empty) empty.hidden = true;
      if (summary) summary.hidden = false;
      container.innerHTML = cart.map((item, index) => `
        <article class="cart-item">
          <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}">
          <div class="cart-item-info"><span class="cart-category">${escapeHtml(item.category)}</span><h3>${escapeHtml(item.title)}</h3><p>${formatMoney(item.price)}</p></div>
          <div class="quantity-control"><button type="button" data-qty="minus" data-index="${index}">−</button><span>${item.quantity}</span><button type="button" data-qty="plus" data-index="${index}">+</button></div>
          <strong class="cart-line-total">${formatMoney(money(item.price) * item.quantity)}</strong>
          <button class="remove-item" type="button" data-remove-item="${index}" aria-label="ลบ ${escapeHtml(item.title)}"><i class="fa-solid fa-trash"></i></button>
        </article>`).join('');
      const total = cart.reduce((sum, item) => sum + money(item.price) * Number(item.quantity || 0), 0);
      document.querySelectorAll('[data-cart-total]').forEach((node) => { node.textContent = formatMoney(total); });
      container.querySelectorAll('[data-qty]').forEach((button) => button.addEventListener('click', () => {
        const next = getCart(); const item = next[Number(button.dataset.index)]; if (!item) return;
        item.quantity = Math.max(1, Number(item.quantity || 1) + (button.dataset.qty === 'plus' ? 1 : -1)); setCart(next); render(); updateCartBadges();
      }));
      container.querySelectorAll('[data-remove-item]').forEach((button) => button.addEventListener('click', () => {
        const next = getCart(); next.splice(Number(button.dataset.removeItem), 1); setCart(next); render(); updateCartBadges();
      }));
    };
    if (confirm) confirm.onclick = () => { if (getCart().length) window.location.href = `checkout.html?from=${encodeURIComponent(from)}`; };
    render();
  }

  function initCheckout() {
    if (currentPage !== 'checkout.html') return;
    const cart = getCart();
    const empty = document.querySelector('[data-checkout-empty]');
    const layout = document.querySelector('[data-checkout-layout]');
    const review = document.querySelector('[data-checkout-review]');
    const totalNode = document.querySelector('[data-checkout-total]');
    const backCart = document.querySelector('[data-back-cart]');
    if (backCart) backCart.href = `cart.html?from=${encodeURIComponent(pageFromQuery())}`;
    if (!cart.length) { if (empty) empty.hidden = false; if (layout) layout.hidden = true; return; }
    if (empty) empty.hidden = true;
    if (layout) layout.hidden = false;
    const total = cart.reduce((sum, item) => sum + money(item.price) * Number(item.quantity || 0), 0);
    if (review) review.innerHTML = cart.map((item) => `<div class="review-row"><span>${escapeHtml(item.title)} × ${item.quantity}</span><strong>${formatMoney(money(item.price) * item.quantity)}</strong></div>`).join('');
    if (totalNode) totalNode.textContent = formatMoney(total);
    const methodButtons = document.querySelectorAll('[data-payment-method]');
    const panels = document.querySelectorAll('[data-payment-panel]');
    const setMethod = (method) => { methodButtons.forEach((button) => button.classList.toggle('active', button.dataset.paymentMethod === method)); panels.forEach((panel) => panel.hidden = panel.dataset.paymentPanel !== method); const selected = document.querySelector('[name="paymentMethod"]'); if (selected) selected.value = method; };
    methodButtons.forEach((button) => button.addEventListener('click', () => setMethod(button.dataset.paymentMethod)));
    setMethod('bank');
    const form = document.querySelector('[data-checkout-form]');
    const success = document.querySelector('[data-checkout-success]');
    if (form) form.addEventListener('submit', (event) => {
      event.preventDefault();
      const method = document.querySelector('[name="paymentMethod"]')?.value || 'bank';
      if (method === 'card') {
        const cardNumber = document.querySelector('#cardNumber')?.value.replace(/\s/g, '');
        const expiry = document.querySelector('#expiry')?.value;
        const cvv = document.querySelector('#cvv')?.value;
        if (!cardNumber || cardNumber.length < 12 || !expiry || !cvv) { alert('กรุณากรอกข้อมูลบัตรเครดิตให้ครบถ้วน'); return; }
      } else if (!document.querySelector('#bankName')?.value) { alert('กรุณาเลือกธนาคารสำหรับการโอนเงิน'); return; }
      const user = getUser();
      const library = getLibrary();
      cart.forEach((item) => { if (!library.some((owned) => owned.title === item.title)) library.push({ ...item, purchasedAt: new Date().toISOString() }); });
      setLibrary(library);
      const order = { id: `ANF-${Date.now().toString().slice(-8)}`, total, method, items: cart, createdAt: new Date().toISOString(), user: user?.email || 'guest' };
      localStorage.setItem('anfLastOrder', JSON.stringify(order));
      localStorage.removeItem(CART_KEY);
      if (success) { success.hidden = false; const orderId = success.querySelector('[data-order-id]'); if (orderId) orderId.textContent = `หมายเลขคำสั่งซื้อ: ${order.id}`; }
      form.hidden = true;
      document.querySelectorAll('[data-checkout-nav]').forEach((node) => node.hidden = false);
      updateCartBadges();
    });
  }

  function initAuth() {
    const loginForm = document.querySelector('#loginForm');
    if (loginForm) loginForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const email = document.querySelector('#email')?.value.trim();
      const password = document.querySelector('#password')?.value;
      if (!email || !password) return;
      let prior = null; try { prior = JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch {}
      const user = { name: prior?.email === email ? prior.name : email.split('@')[0], email, id: prior?.email === email ? prior.id : `ANF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`, avatar: prior?.email === email ? prior.avatar || '' : '' };
      setUser(user); window.location.href = 'Home.html';
    });
    const registerForm = document.querySelector('#registerForm');
    if (registerForm) registerForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const name = document.querySelector('#name')?.value.trim();
      const email = document.querySelector('#email')?.value.trim();
      const password = document.querySelector('#password')?.value;
      if (!name || !email || !password) return;
      setUser({ name, email, id: `ANF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`, avatar: '' });
      window.location.href = 'Home.html';
    });
  }

  function initProfile() {
    if (currentPage !== 'profile.html') return;
    const user = getUser();
    const guest = document.querySelector('[data-profile-guest]');
    const content = document.querySelector('[data-profile-content]');
    if (!user) { if (guest) guest.hidden = false; if (content) content.hidden = true; return; }
    if (guest) guest.hidden = true;
    if (content) content.hidden = false;
    document.querySelectorAll('[data-user-name]').forEach((node) => node.textContent = user.name || 'ผู้ใช้');
    document.querySelectorAll('[data-user-email]').forEach((node) => node.textContent = user.email || '-');
    document.querySelectorAll('[data-user-id]').forEach((node) => node.textContent = user.id || '-');
    const avatar = document.querySelector('[data-profile-avatar]');
    if (avatar) { avatar.src = user.avatar || 'images/LOGO-removebg-preview.png'; avatar.alt = `รูปโปรไฟล์ของ ${user.name}`; }
    const library = getLibrary();
    const list = document.querySelector('[data-library-list]');
    const count = document.querySelector('[data-library-count]');
    if (count) count.textContent = library.length;
    if (list) list.innerHTML = library.length ? library.map((item) => `<article class="library-card"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}"><div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.category || 'เกมที่ซื้อแล้ว')}</p><span>พร้อมเล่นในคลังเกม</span></div></article>`).join('') : '<div class="profile-empty">ยังไม่มีเกมในคลัง ลองเลือกเกมจากหน้าหมวดหมู่</div>';
    const upload = document.querySelector('#avatarUpload');
    if (upload) upload.addEventListener('change', () => {
      const file = upload.files?.[0]; if (!file) return;
      const reader = new FileReader(); reader.onload = () => { const current = getUser() || user; current.avatar = String(reader.result); setUser(current); window.location.reload(); }; reader.readAsDataURL(file);
    });
    document.querySelector('[data-logout]')?.addEventListener('click', () => { localStorage.removeItem(USER_KEY); window.location.href = 'Home.html'; });
  }

  function init() {
    createUtilityNav();
    makeExistingLoginButtonAccountAware();
    updateCartBadges();
    bindGameCards();
    initDetail();
    initCart();
    initCheckout();
    initAuth();
    initProfile();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
