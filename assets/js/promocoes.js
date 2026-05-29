setActiveMenu('promocoes');

let promocoes = [];
let filtered = [];
let state = { page: 1, pageSize: 10 };

const query = getQuery();
const searchInput = document.querySelector('.filter-panel .search-box input');
const statusSelect = document.querySelector('.filter-panel .filter-control:nth-of-type(1) select');
const periodSelect = document.querySelector('.filter-panel .filter-control:nth-of-type(2) select');
const startInput = document.querySelectorAll('.date-control input')[0];
const endInput = document.querySelectorAll('.date-control input')[1];

function normalizeStatus(status) {
  return String(status || '').toLowerCase();
}

function matchesStatus(item, status) {
  if (!status || status === 'Todos') return true;
  if (status === 'Expirado') return normalizeStatus(item.status).includes('expir');
  return item.status === status;
}

function matchesPeriod(item, period) {
  if (!period || period === 'Todos') return true;
  const target = item.data_fim || item.data_inicio;
  if (!target) return false;
  const date = new Date(`${target}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((date - today) / 86400000);
  if (period === 'Hoje') return diff === 0;
  if (period === '7 dias') return diff >= 0 && diff <= 7;
  if (period === '30 dias') return diff >= 0 && diff <= 30;
  return true;
}

function applyFilters() {
  const search = searchInput.value.trim().toLowerCase();
  const status = statusSelect.value;
  const period = periodSelect.value;
  const start = startInput.value ? new Date(`${startInput.value}T00:00:00`) : null;
  const end = endInput.value ? new Date(`${endInput.value}T00:00:00`) : null;

  filtered = promocoes.filter((item) => {
    const haystack = `${item.codigo_produto} ${item.sku} ${item.nome_anuncio}`.toLowerCase();
    const itemStart = item.data_inicio ? new Date(`${item.data_inicio}T00:00:00`) : null;
    const itemEnd = item.data_fim ? new Date(`${item.data_fim}T00:00:00`) : null;
    return (!search || haystack.includes(search))
      && matchesStatus(item, status)
      && matchesPeriod(item, period)
      && (!start || (itemStart && itemStart >= start))
      && (!end || (itemEnd && itemEnd <= end));
  });
  state.page = 1;
  render();
}

function renderPromocoes(lista) {
  const tbody = document.querySelector('.promo-table tbody');
  tbody.innerHTML = lista.map(promocao => `
    <tr>
      <td><span class="badge ${badgeClass(promocao.status)}">${promocao.status || '-'}</span></td>
      <td>${cleanCode(promocao.codigo_produto)}</td>
      <td><span class="sku-text" title="${promocao.sku || '-'}">${truncateText(promocao.sku, 16)}</span></td>
      <td class="product-name">
        <div class="product-cell">
          <img class="product-thumb" src="${productImage(promocao.foto_url, promocao.nome_anuncio || 'ML')}" alt="Produto">
          <span class="product-title">${promocao.nome_anuncio || '-'}</span>
        </div>
      </td>
      <td><input class="inline-date" type="date" value="${toInputDate(promocao.data_inicio)}" data-id="${promocao.id}" data-field="data_inicio"></td>
      <td><input class="inline-date" type="date" value="${toInputDate(promocao.data_fim)}" data-id="${promocao.id}" data-field="data_fim"></td>
      <td>${formatCurrency(promocao.preco)}</td>
      <td>${promocao.desconto ? formatPercent(promocao.desconto) : '-'}</td>
      <td class="green fw-bold">${formatCurrency(promocao.preco_final || promocao.preco)}</td>
      <td class="text-center"><button class="action-btn" title="Salvar datas" data-save-promo="${promocao.id}"><i class="fa-solid fa-floppy-disk"></i></button></td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-save-promo]').forEach((button) => {
    button.addEventListener('click', async () => {
      const id = Number(button.dataset.savePromo);
      const rowInputs = tbody.querySelectorAll(`.inline-date[data-id="${id}"]`);
      const payload = { id };
      rowInputs.forEach(input => { payload[input.dataset.field] = input.value || null; });
      await getApi().atualizarPromocao(payload);
      await carregarPromocoes(false);
    });
  });
}

function render() {
  const page = paginate(filtered, state.page, state.pageSize);
  state.page = page.page;
  renderPromocoes(page.items);
  setText('.table-footer > span', `Mostrando ${page.total ? page.start + 1 : 0} a ${page.end} de ${page.total} promoções`);
  renderPagination(document.querySelector('.table-footer .pagination-wrap'), { ...state, totalPages: page.totalPages }, (next) => {
    state = { ...state, ...next };
    render();
  });
}

async function carregarPromocoes(resetFilters = true) {
  try {
    const [stats, lista] = await Promise.all([
      getApi().stats(),
      getApi().promocoes({ limit: 1000 }),
    ]);
    promocoes = lista;
    const totais = Object.fromEntries((stats.promocoes || []).map(item => [item.status, item.total]));
    const expiradasOuVencendo = (totais.Expirado || 0) + (totais['Expira hoje'] || 0);
    const cards = document.querySelectorAll('.promo-status-grid strong');
    if (cards[0]) cards[0].textContent = formatNumber(expiradasOuVencendo);
    if (cards[1]) cards[1].textContent = formatNumber(totais.Programado || 0);
    if (cards[2]) cards[2].textContent = formatNumber(totais.Ativado || 0);
    if (cards[3]) cards[3].textContent = formatNumber(totais['Sem Promoção'] || 0);
    const badge = document.querySelector('.btn-reactivate span');
    if (badge) badge.textContent = formatNumber(expiradasOuVencendo);

    if (resetFilters && query.status) statusSelect.value = query.status;
    applyFilters();
  } catch (error) {
    console.error('Falha ao carregar promoções:', error);
  }
}

document.querySelectorAll('.promo-status-grid .status-card').forEach((card) => {
  card.addEventListener('click', () => {
    statusSelect.value = card.querySelector('p').textContent.trim();
    applyFilters();
  });
});

searchInput.addEventListener('input', debounce(applyFilters));
statusSelect.addEventListener('change', applyFilters);
periodSelect.addEventListener('change', applyFilters);
startInput.type = 'date';
endInput.type = 'date';
startInput.addEventListener('change', applyFilters);
endInput.addEventListener('change', applyFilters);
document.querySelector('.filter-panel .btn-clear').addEventListener('click', () => {
  searchInput.value = '';
  statusSelect.value = 'Todos';
  periodSelect.value = 'Todos';
  startInput.value = '';
  endInput.value = '';
  applyFilters();
});

carregarPromocoes();
