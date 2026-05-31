setActiveMenu('promocoes');

let promocoes = [];
let filtered = [];
let reactivationItems = [];
let reactivationIndex = 0;
let reactivationStarted = false;
let reactivationOpening = false;
let reactivationCurrentOpened = false;
let shouldRefreshAfterSession = false;
let state = { page: 1, pageSize: 8 };

const PROMO_FILTER_STORAGE_KEY = 'mercedania:promocoes:filtros';
const PROMO_URL = 'https://www.mercadolivre.com.br/anuncios/lista/promos?page=1&search=';

const query = getQuery();
const filterSelects = document.querySelectorAll('.filter-panel .filter-control select');
const searchInput = document.querySelector('.filter-panel .search-box input');
const statusSelect = filterSelects[0];
const periodSelect = filterSelects[1];
const adStatusSelect = filterSelects[2];
const startInput = document.querySelectorAll('.date-control input')[0];
const endInput = document.querySelectorAll('.date-control input')[1];
const reactivateModal = document.querySelector('#reactivateModal');

function normalizeStatus(status) {
  return String(status || '').toLowerCase();
}

function isActiveAd(item) {
  return String(item.anuncio_status || '').toLowerCase().startsWith('ativ');
}

function matchesStatus(item, status) {
  if (!status || status === 'Todos') return true;
  if (status === 'Expirado') return normalizeStatus(item.status).includes('expir');
  return item.status === status;
}

function parseBRDate(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length !== 8) return null;
  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatBRDateInput(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function toBRDate(value) {
  if (!value) return '';
  return formatDate(value);
}

function toISODateFromBR(value) {
  const date = parseBRDate(value);
  if (!date) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function daysInfo(item) {
  const target = item.data_fim || item.data_inicio;
  if (!target) return { text: 'Sem promoção ativa', tone: 'muted' };
  const date = new Date(`${target}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((date - today) / 86400000);
  if (diff < 0) return { text: `Expirou há ${Math.abs(diff)} dias`, tone: 'danger' };
  if (diff === 0) return { text: 'Expira hoje', tone: 'danger' };
  return { text: `${diff} dias restantes`, tone: normalizeStatus(item.status).includes('ativ') ? 'success' : 'info' };
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

function savePromoFilters() {
  localStorage.setItem(PROMO_FILTER_STORAGE_KEY, JSON.stringify({
    search: searchInput.value,
    status: statusSelect.value,
    period: periodSelect.value,
    adStatus: adStatusSelect.value,
    start: startInput.value,
    end: endInput.value,
  }));
}

function restorePromoFilters() {
  try {
    const filters = JSON.parse(localStorage.getItem(PROMO_FILTER_STORAGE_KEY) || '{}');
    searchInput.value = filters.search || '';
    statusSelect.value = query.status || filters.status || 'Todos';
    periodSelect.value = filters.period || 'Todos';
    adStatusSelect.value = filters.adStatus || 'Ativos';
    startInput.value = filters.start || '';
    endInput.value = filters.end || '';
  } catch (error) {
    localStorage.removeItem(PROMO_FILTER_STORAGE_KEY);
  }
}

function currentReactivationCandidates() {
  return promocoes.filter(item => isActiveAd(item) && normalizeStatus(item.status).includes('expir'));
}

function updateReactivationBadge() {
  reactivationItems = currentReactivationCandidates();
  const badge = document.querySelector('.btn-reactivate span');
  if (badge) badge.textContent = formatNumber(reactivationItems.length);
}

function updateStatusCards(lista) {
  const counts = lista.reduce((acc, item) => {
    const status = item.status || 'Sem Promoção';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  const cards = document.querySelectorAll('.promo-status-grid strong');
  if (cards[0]) cards[0].textContent = formatNumber((counts.Expirado || 0) + (counts['Expira hoje'] || 0));
  if (cards[1]) cards[1].textContent = formatNumber(counts.Programado || 0);
  if (cards[2]) cards[2].textContent = formatNumber(counts.Ativado || 0);
  if (cards[3]) cards[3].textContent = formatNumber(counts['Sem Promoção'] || 0);
}

function applyFilters() {
  const search = searchInput.value.trim().toLowerCase();
  const status = statusSelect.value;
  const period = periodSelect.value;
  const adStatus = adStatusSelect.value;
  const start = parseBRDate(startInput.value);
  const end = parseBRDate(endInput.value);

  const baseFiltered = promocoes.filter((item) => {
    const haystack = `${item.codigo_produto} ${item.sku} ${item.nome_anuncio}`.toLowerCase();
    const itemStart = item.data_inicio ? new Date(`${item.data_inicio}T00:00:00`) : null;
    const itemEnd = item.data_fim ? new Date(`${item.data_fim}T00:00:00`) : null;
    return (!search || haystack.includes(search))
      && matchesPeriod(item, period)
      && (adStatus === 'Todos' || (adStatus === 'Ativos' ? isActiveAd(item) : !isActiveAd(item)))
      && (!start || (itemStart && itemStart >= start))
      && (!end || (itemEnd && itemEnd <= end));
  });

  filtered = baseFiltered.filter(item => matchesStatus(item, status));
  updateStatusCards(baseFiltered);
  updateReactivationBadge();
  savePromoFilters();
  state.page = 1;
  render();
}

function statusPill(status) {
  const value = normalizeStatus(status);
  if (value.includes('expir')) return 'promo-status danger';
  if (value.includes('program')) return 'promo-status info';
  if (value.includes('ativ')) return 'promo-status success';
  return 'promo-status muted';
}

function renderDateCell(promocao, field) {
  const value = toBRDate(promocao[field]);
  return `<input class="inline-date" inputmode="numeric" maxlength="10" value="${value}" data-id="${promocao.id}" data-field="${field}" placeholder="dd/mm/aaaa">`;
}

function renderPromocoes(lista) {
  const tbody = document.querySelector('.promo-table tbody');
  tbody.innerHTML = lista.map(promocao => {
    const day = daysInfo(promocao);
    const hasPromo = promocao.data_inicio || promocao.data_fim;
    return `
      <tr>
        <td class="promo-product-cell">
          <img class="product-thumb" src="${productImage(promocao.foto_url, promocao.nome_anuncio || 'ML')}" alt="Produto">
          <div>
            <strong>${promocao.nome_anuncio || '-'}</strong>
            <span>SKU: ${promocao.sku || '-'}</span>
            <small>${cleanCode(promocao.codigo_produto)}</small>
          </div>
        </td>
        <td class="promo-period-cell">
          ${hasPromo ? `
            <div class="date-row"><i class="fa-regular fa-calendar"></i>${renderDateCell(promocao, 'data_inicio')}<span>→</span>${renderDateCell(promocao, 'data_fim')}</div>
            <small class="${day.tone}">${day.text}</small>
          ` : '<span class="no-date">—</span><small class="muted">Sem promoção ativa</small>'}
        </td>
        <td><span class="${statusPill(promocao.status)}"><i></i>${promocao.status || '-'}</span></td>
        <td class="fw-bold">${formatCurrency(promocao.preco)}</td>
        <td class="${normalizeStatus(promocao.status).includes('expir') ? 'promo-price-danger' : 'green'} fw-bold">${promocao.preco_final ? formatCurrency(promocao.preco_final) : '—'}</td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.inline-date').forEach(input => {
    input.addEventListener('input', () => { input.value = formatBRDateInput(input.value); });
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        input.blur();
      }
    });
    input.addEventListener('blur', saveInlineDate);
  });
}

async function saveInlineDate(event) {
  const input = event.currentTarget;
  const id = Number(input.dataset.id);
  const rowInputs = document.querySelectorAll(`.inline-date[data-id="${id}"]`);
  const payload = { id };
  let invalid = false;
  rowInputs.forEach(field => {
    const value = field.value.trim();
    const isoDate = value ? toISODateFromBR(value) : null;
    field.classList.toggle('is-invalid', Boolean(value && !isoDate));
    if (value && !isoDate) invalid = true;
    payload[field.dataset.field] = isoDate;
  });
  if (invalid) return;
  await getApi().atualizarPromocao(payload);
  await carregarPromocoes(false);
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
    const lista = await getApi().promocoes({ limit: 1000 });
    promocoes = lista;
    updateReactivationBadge();
    if (resetFilters) restorePromoFilters();
    applyFilters();
  } catch (error) {
    console.error('Falha ao carregar promoções:', error);
  }
}

function renderReactivationModal() {
  const item = reactivationStarted ? reactivationItems[reactivationIndex] : null;
  const total = reactivationItems.length;
  const current = reactivationStarted && total ? Math.min(reactivationIndex + 1, total) : 0;
  const nextButton = reactivateModal?.querySelector('.btn-next');
  const skipButton = reactivateModal?.querySelector('.btn-skip');
  const progress = total ? (reactivationIndex / total) * 100 : 0;
  document.querySelector('.reactivation-progress strong').innerHTML = `Promoção <span>${current}</span> de <span>${total}</span>`;
  document.querySelector('.reactivation-progress .progress-bar').style.width = `${progress}%`;
  if (nextButton) {
    nextButton.disabled = reactivationOpening || total === 0 || (!item && reactivationStarted);
    const label = reactivationStarted ? (reactivationCurrentOpened ? 'Próxima promoção' : 'Abrir promoção') : 'Começar';
    const icon = reactivationStarted ? 'fa-arrow-right' : 'fa-play';
    nextButton.innerHTML = (!item && reactivationStarted) ? 'Concluído' : `<i class="fa-solid ${icon}"></i> ${label}`;
  }
  if (skipButton) {
    skipButton.disabled = reactivationOpening || !reactivationStarted || !item;
  }
  if (!reactivationStarted) {
    setText('.reactivation-product strong', '-');
    setText('.reactivation-product h6', total
      ? 'Clique em Começar para carregar a primeira promoção expirada.'
      : 'Nenhuma promoção expirada encontrada.');
    document.querySelector('.discount-box strong').textContent = '0%';
    document.querySelector('.discount-copy-label').innerHTML = '<i class="fa-regular fa-clipboard"></i> Aguardando início';
    return;
  }
  if (!item) {
    setText('.reactivation-product strong', '-');
    setText('.reactivation-product h6', total ? 'Todas as promoções expiradas foram abertas.' : 'Nenhuma promoção expirada encontrada.');
    document.querySelector('.discount-box strong').textContent = '0%';
    document.querySelector('.discount-copy-label').innerHTML = '<i class="fa-regular fa-circle-check"></i> Concluído';
    return;
  }
  setText('.reactivation-product strong', cleanCode(item.codigo_produto));
  setText('.reactivation-product h6', item.nome_anuncio || '-');
  document.querySelector('.discount-box strong').textContent = item.desconto ? formatPercent(item.desconto) : '0%';
  document.querySelector('.discount-copy-label').innerHTML = reactivationCurrentOpened
    ? '<i class="fa-regular fa-circle-check"></i> Link aberto'
    : '<i class="fa-regular fa-clipboard"></i> Será copiado';
}

function discountNumberForCopy(value) {
  const number = Number(value || 0);
  const normalized = Math.abs(number) > 0 && Math.abs(number) <= 1 ? number * 100 : number;
  return normalized.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

function formatDateForSessionInput(date) {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

function fillDefaultReactivationDates() {
  const start = reactivateModal?.querySelector('[data-session-start]');
  const end = reactivateModal?.querySelector('[data-session-end]');
  if (!start || !end) return;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = new Date(today);
  limit.setDate(limit.getDate() + 30);
  start.value = formatDateForSessionInput(today);
  end.value = formatDateForSessionInput(limit);
  start.classList.remove('is-invalid');
  end.classList.remove('is-invalid');
  const feedback = reactivateModal.querySelector('.session-date-feedback');
  feedback?.classList.remove('danger');
  if (feedback) feedback.textContent = 'Período preenchido automaticamente com 30 dias.';
}

function validateReactivationDates() {
  const inputs = [
    reactivateModal?.querySelector('[data-session-start]'),
    reactivateModal?.querySelector('[data-session-end]'),
  ].filter(Boolean);
  const feedback = reactivateModal?.querySelector('.session-date-feedback');
  const invalid = inputs.filter(input => !parseBRDate(input.value));

  inputs.forEach(input => input.classList.toggle('is-invalid', invalid.includes(input)));
  if (feedback) {
    feedback.classList.toggle('danger', Boolean(invalid.length));
    feedback.textContent = invalid.length
      ? 'Preencha a data inicial e final no formato dd/mm/aaaa antes de começar.'
      : 'Datas preenchidas. Agora é só avançar as promoções.';
  }
  return invalid.length === 0;
}

function getReactivationDatePayload(item) {
  return {
    id: item.id,
    data_inicio: toISODateFromBR(reactivateModal.querySelector('[data-session-start]').value),
    data_fim: toISODateFromBR(reactivateModal.querySelector('[data-session-end]').value),
  };
}

async function saveReactivationDates(item) {
  const payload = getReactivationDatePayload(item);
  const saved = await getApi().atualizarPromocao(payload);
  Object.assign(item, {
    data_inicio: payload.data_inicio,
    data_fim: payload.data_fim,
    status: saved.status || item.status,
  });
  const listItem = promocoes.find(promocao => promocao.id === item.id);
  if (listItem) {
    Object.assign(listItem, {
      data_inicio: payload.data_inicio,
      data_fim: payload.data_fim,
      status: saved.status || listItem.status,
    });
  }
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function startReactivationStep() {
  if (reactivationOpening) return;
  if (!validateReactivationDates()) return;
  if (!reactivationStarted) {
    reactivationStarted = true;
    reactivationCurrentOpened = false;
    renderReactivationModal();
    await wait(120);
  } else if (reactivationCurrentOpened) {
    const openedItem = reactivationItems[reactivationIndex];
    reactivationOpening = true;
    const nextButton = reactivateModal?.querySelector('.btn-next');
    if (nextButton) nextButton.disabled = true;
    try {
      await saveReactivationDates(openedItem);
    } catch (error) {
      console.error('Falha ao salvar datas da promoção:', error);
      reactivationOpening = false;
      if (nextButton) nextButton.disabled = false;
      const feedback = reactivateModal?.querySelector('.session-date-feedback');
      if (feedback) {
        feedback.classList.add('danger');
        feedback.textContent = 'Não foi possível salvar as datas. Tente novamente.';
      }
      return;
    }
    reactivationOpening = false;
    reactivationIndex += 1;
    reactivationCurrentOpened = false;
    renderReactivationModal();
    await wait(120);
  }

  const item = reactivationItems[reactivationIndex];
  if (!item) return;
  reactivationOpening = true;
  const nextButton = reactivateModal?.querySelector('.btn-next');
  if (nextButton) nextButton.disabled = true;

  const discount = discountNumberForCopy(item.desconto);
  try {
    if (getApi().copiarTexto) {
      await getApi().copiarTexto(discount);
    } else {
      await navigator.clipboard.writeText(discount);
    }
    document.querySelector('.discount-copy-label').innerHTML = '<i class="fa-regular fa-circle-check"></i> Copiado';
  } catch (error) {
    console.warn('Não foi possível copiar o desconto:', error);
    document.querySelector('.discount-copy-label').innerHTML = '<i class="fa-regular fa-clipboard"></i> Não copiou';
  }

  const skipCountdown = reactivateModal?.querySelector('[data-skip-countdown]')?.checked;
  if (!skipCountdown) {
    for (let seconds = 3; seconds >= 1; seconds -= 1) {
      document.querySelector('.discount-copy-label').innerHTML = `<i class="fa-regular fa-clock"></i> Abrindo em ${seconds}s`;
      await wait(1000);
    }
  } else {
    document.querySelector('.discount-copy-label').innerHTML = '<i class="fa-regular fa-circle-check"></i> Abrindo';
  }

  window.open(`${PROMO_URL}${String(item.codigo_produto || '').replace(/\D/g, '')}`, '_blank');
  reactivationCurrentOpened = true;
  reactivationOpening = false;
  renderReactivationModal();
}

function skipReactivationItem() {
  if (reactivationOpening || !reactivationStarted) return;
  if (reactivationIndex >= reactivationItems.length) return;
  reactivationIndex += 1;
  reactivationCurrentOpened = false;
  renderReactivationModal();
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
adStatusSelect.addEventListener('change', applyFilters);
[startInput, endInput].forEach(input => {
  input.addEventListener('input', () => { input.value = formatBRDateInput(input.value); });
  input.addEventListener('change', applyFilters);
  input.addEventListener('blur', applyFilters);
});
document.querySelector('.filter-panel .btn-clear').addEventListener('click', () => {
  searchInput.value = '';
  statusSelect.value = 'Todos';
  periodSelect.value = 'Todos';
  adStatusSelect.value = 'Ativos';
  startInput.value = '';
  endInput.value = '';
  localStorage.removeItem(PROMO_FILTER_STORAGE_KEY);
  applyFilters();
});

reactivateModal?.addEventListener('shown.bs.modal', () => {
  reactivationItems = currentReactivationCandidates();
  reactivationIndex = 0;
  reactivationStarted = false;
  reactivationOpening = false;
  reactivationCurrentOpened = false;
  shouldRefreshAfterSession = false;
  fillDefaultReactivationDates();
  renderReactivationModal();
});

reactivateModal?.addEventListener('hidden.bs.modal', async () => {
  reactivationOpening = false;
  if (shouldRefreshAfterSession) {
    shouldRefreshAfterSession = false;
    await carregarPromocoes(false);
  }
});

reactivateModal?.querySelector('.btn-finish-session')?.addEventListener('click', () => {
  shouldRefreshAfterSession = true;
});
reactivateModal?.querySelector('.btn-next')?.addEventListener('click', startReactivationStep);
reactivateModal?.querySelector('.btn-skip')?.addEventListener('click', skipReactivationItem);
reactivateModal?.querySelectorAll('[data-session-start], [data-session-end]').forEach(input => {
  input.addEventListener('input', () => {
    input.value = formatBRDateInput(input.value);
    input.classList.remove('is-invalid');
    const feedback = reactivateModal.querySelector('.session-date-feedback');
    feedback?.classList.remove('danger');
    if (feedback) feedback.textContent = 'Digite as datas no formato dd/mm/aaaa.';
  });
});
reactivateModal?.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    event.preventDefault();
    startReactivationStep();
  }
  if (event.key === 'Escape') {
    bootstrap.Modal.getInstance(reactivateModal)?.hide();
  }
});

carregarPromocoes();
