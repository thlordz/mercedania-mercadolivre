function renderCards() {
  document.querySelector("#heroCards").innerHTML = dashboardData.hero.map((item, index) => `
    <article class="hero-card" style="animation-delay:${index * .06}s">
      <div class="hero-icon"><i class="fa-solid ${item.icon}"></i></div>
      <div class="hero-info">
        <small>${item.label}</small>
        <h3 class="counter ${item.green ? "green" : ""}" data-value="${item.value}" data-type="${item.type}">0</h3>
        <p>${item.trend}</p>
      </div>
      ${sparkline()}
    </article>
  `).join("");

  document.querySelector("#smallCards").innerHTML = dashboardData.small.map(item => `
    <article class="small-card">
      <div class="small-icon"><i class="fa-solid ${item.icon}"></i></div>
      <div>
        <small>${item.label}</small>
        <h4 class="counter" data-value="${item.value}" data-type="${item.type}">0</h4>
        <p>${item.trend}</p>
      </div>
    </article>
  `).join("");

  document.querySelector("#promoGrid").innerHTML = dashboardData.promos.map(({ icon, label, value, cls }) => `
    <a class="promo-card" href="#" aria-label="Abrir promoções: ${label}">
      <span class="promo-icon ${cls}"><i class="fa-solid ${icon}"></i></span>
      <span class="promo-text">${label}</span>
      <strong class="counter" data-value="${value}" data-type="number">0</strong>
    </a>
  `).join("");

  document.querySelector("#citiesList").innerHTML = dashboardData.cities.map(([name, value, width], index) => `
    <div class="city-row"><span class="rank">${index + 1}</span><div><span>${name}</span><div class="progress"><i style="--w:${width}"></i></div></div><strong>${value}</strong></div>
  `).join("");

  document.querySelector("#latestSales").innerHTML = dashboardData.latestSales.map(([id, name, city, price, date, status, cls]) => `
    <div class="sale"><div class="sale-top"><div><strong>${id}</strong><p>${date}</p></div><strong>${price}</strong></div><p>${name}</p><p>${city}</p><span class="status ${cls}">${status}</span></div>
  `).join("");

  document.querySelector("#topProducts").innerHTML = dashboardData.topProducts.map(([name, sku, sales, revenue, icon], index) => `
    <article class="product-card" title="${name}">
      <div class="product-rank">#${index + 1}</div>
      <div class="product-head">
        <div class="product-icon"><i class="fa-solid ${icon}"></i></div>
        <div class="product-title-wrap">
          <strong class="product-title">${name}</strong>
          <span class="product-sku">SKU ${sku}</span>
        </div>
      </div>
      <div class="product-meta">
        <span><b>${sales}</b> vendas</span>
        <strong class="product-revenue">${revenue}</strong>
      </div>
    </article>
  `).join("");
}

function bindInteractions() {
  const searchInput = document.querySelector("#searchInput");
  window.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      searchInput.focus();
    }
  });

  document.querySelector("#syncBtn").addEventListener("click", event => {
    const button = event.currentTarget;
    button.classList.add("syncing");
    button.innerHTML = `<i class="fa-solid fa-rotate fa-spin"></i> Sincronizando...`;
    setTimeout(() => {
      document.querySelectorAll(".counter").forEach(counter => animateNumber(counter, Number(counter.dataset.value), counter.dataset.type));
      button.classList.remove("syncing");
      button.innerHTML = `<i class="fa-solid fa-check"></i> Dados sincronizados`;
      setTimeout(() => button.innerHTML = `<i class="fa-solid fa-rotate"></i> Sincronizar dados`, 1400);
    }, 800);
  });

  document.querySelectorAll(".menu-item").forEach(item => item.addEventListener("click", () => {
    document.querySelectorAll(".menu-item").forEach(menuItem => menuItem.classList.remove("active"));
    item.classList.add("active");
    closeMobileMenu();
  }));

  const menuBtn = document.querySelector("#mobileMenuBtn");
  const backdrop = document.querySelector("#mobileMenuBackdrop");
  menuBtn.addEventListener("click", toggleMobileMenu);
  backdrop.addEventListener("click", closeMobileMenu);
}

function toggleMobileMenu() {
  const sidebar = document.querySelector("#sidebar");
  const button = document.querySelector("#mobileMenuBtn");
  const backdrop = document.querySelector("#mobileMenuBackdrop");
  const open = !sidebar.classList.contains("open");
  sidebar.classList.toggle("open", open);
  button.classList.toggle("is-open", open);
  button.setAttribute("aria-expanded", String(open));
  backdrop.classList.toggle("show", open);
}

function closeMobileMenu() {
  document.querySelector("#sidebar").classList.remove("open");
  document.querySelector("#mobileMenuBtn").classList.remove("is-open");
  document.querySelector("#mobileMenuBtn").setAttribute("aria-expanded", "false");
  document.querySelector("#mobileMenuBackdrop").classList.remove("show");
}
