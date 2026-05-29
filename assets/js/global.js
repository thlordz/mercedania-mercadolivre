function formatCurrency(value) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('pt-BR');
}

function formatPercent(value) {
  let number = Number(value || 0);
  if (Math.abs(number) > 0 && Math.abs(number) <= 1) number *= 100;
  return `${number.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
}

function setActiveMenu(page) {
  document.querySelectorAll('.menu-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });
  const brand = document.querySelector('.brand');
  if (brand && !brand.querySelector('img')) {
    brand.innerHTML = '<img src="../img/mercado-livre.png" alt="Mercado Livre"><span>Gestão de Vendas</span>';
  }
}

function badgeClass(status) {
  const value = String(status || '').toLowerCase();
  if (value.includes('ativ') || value.includes('entregue') || value.includes('aprovado')) return 'text-bg-success-light';
  if (value.includes('program') || value.includes('expira') || value.includes('enviado') || value.includes('trânsito') || value.includes('caminho')) return 'text-bg-primary-light';
  if (value.includes('expir') || value.includes('cancel') || value.includes('inativo')) return 'text-bg-danger-light';
  return 'text-bg-secondary-light';
}

function getApi() {
  if (!window.mercadoApp) {
    throw new Error('API do Electron indisponível. Abra o projeto com npm start.');
  }
  return window.mercadoApp;
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}

function cleanCode(value) {
  const text = String(value || '').trim();
  return text ? `#${text.replace(/^#+/, '')}` : '-';
}

function truncateText(value, max = 18) {
  const text = String(value || '-');
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function productImage(url, label = 'Peça') {
  if (url) return url;
  return `https://placehold.co/56x56/fff7bf/25314f?text=${encodeURIComponent(label.slice(0, 2).toUpperCase())}`;
}

function toInputDate(value) {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function numberFromInput(value) {
  const text = String(value ?? '').trim();
  if (!text) return 0;
  const cleaned = text.replace(/[^\d,.-]/g, '');
  if (cleaned.includes(',')) {
    return Number(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
  }
  return Number(cleaned) || 0;
}

function getQuery() {
  return Object.fromEntries(new URLSearchParams(window.location.search));
}

function paginate(items, page, pageSize) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    page: safePage,
    totalPages,
    total: items.length,
    start,
    end: Math.min(start + pageSize, items.length),
    items: items.slice(start, start + pageSize),
  };
}

function renderPagination(container, state, onChange) {
  container.innerHTML = '';

  const size = document.createElement('select');
  size.className = 'page-size';
  [8, 10, 20, 50, 100].forEach(value => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = `${value} por página`;
    option.selected = value === state.pageSize;
    size.appendChild(option);
  });
  size.addEventListener('change', () => onChange({ page: 1, pageSize: Number(size.value) }));
  container.appendChild(size);

  const previous = document.createElement('button');
  previous.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
  previous.disabled = state.page <= 1;
  previous.addEventListener('click', () => onChange({ page: state.page - 1 }));
  container.appendChild(previous);

  const first = Math.max(1, state.page - 2);
  const last = Math.min(state.totalPages, state.page + 2);
  for (let page = first; page <= last; page += 1) {
    const button = document.createElement('button');
    button.textContent = page;
    button.classList.toggle('active', page === state.page);
    button.addEventListener('click', () => onChange({ page }));
    container.appendChild(button);
  }

  const next = document.createElement('button');
  next.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
  next.disabled = state.page >= state.totalPages;
  next.addEventListener('click', () => onChange({ page: state.page + 1 }));
  container.appendChild(next);
}

function debounce(fn, delay = 180) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
