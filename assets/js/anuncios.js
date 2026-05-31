setActiveMenu('anuncios');

let anuncios = [];
let filtered = [];
let state = { page: 1, pageSize: 10 };
let adImageFile = null;
let originalAdSnapshot = null;
const AD_FILTER_STORAGE_KEY = 'mercedania:anuncios:filtros';

const searchInput = document.querySelector('.anuncios-filter-panel .search-box input');
const statusSelect = document.querySelectorAll('.anuncios-filter-panel select')[0];
const typeSelect = document.querySelectorAll('.anuncios-filter-panel select')[1];
const stockSelect = document.querySelectorAll('.anuncios-filter-panel select')[2];
const sortSelect = document.querySelectorAll('.anuncios-filter-panel select')[3];

function percentFromInput(value) {
  return numberFromInput(value) / 100;
}

function percentToInput(value) {
  return (Number(value || 0) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

function tariffByType(type) {
  return String(type || '').toLowerCase().includes('premium') ? 0.17 : 0.12;
}

function formatMoneyInputValue(value) {
  return (Number(String(value || '').replace(/\D/g, '') || 0) / 100)
    .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatPercentInputValue(value) {
  const number = numberFromInput(value);
  return number.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

function calculateAdValues({ valor_total = 0, desconto = 0, frete = 0, tarifa = 0 } = {}) {
  const precoAnunciado = desconto ? valor_total * (1 - desconto) : valor_total;
  let custoFixo = 0;

  if (frete <= 0) {
    if (precoAnunciado <= 12.5) custoFixo = Math.floor((precoAnunciado / 2) / 0.02) * 0.02;
    else if (precoAnunciado < 29) custoFixo = 6.25;
    else if (precoAnunciado < 50) custoFixo = 6.5;
    else if (precoAnunciado <= 79) custoFixo = 6.75;
  }

  const liquidoReceber = precoAnunciado * (1 - tarifa) - frete - custoFixo;
  return { precoAnunciado, custoFixo, liquidoReceber };
}

function readAdFormValues(form) {
  const valor_total = numberFromInput(form.elements.valor_total.value);
  const frete = numberFromInput(form.elements.frete.value);
  const tarifa = tariffByType(form.elements.tipo_anuncio.value);
  const desconto = percentFromInput(form.elements.desconto.value);
  const calculated = calculateAdValues({ valor_total, frete, tarifa, desconto });
  return {
    valor_total,
    frete,
    tarifa,
    desconto,
    custo_fixo: calculated.custoFixo,
    preco_anunciado: calculated.precoAnunciado,
    liquido_receber: calculated.liquidoReceber,
    estoque: Number(numberFromInput(form.elements.estoque.value)),
    quantidade_vendida: Number(numberFromInput(form.elements.quantidade_vendida.value)),
  };
}

function updateAdFinancialSummary() {
  const form = document.querySelector('#editAdForm');
  if (!form) return;
  const values = readAdFormValues(form);
  form.elements.preco_anunciado.value = String(values.preco_anunciado);
  form.elements.custo_fixo.value = formatCurrency(values.custo_fixo);
  form.elements.liquido_receber.value = String(values.liquido_receber);
  setText('#adSummaryPrice', formatCurrency(values.preco_anunciado));
  setText('#adSummaryFeeLabel', `Tarifa Mercado Livre (${(values.tarifa * 100).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%)`);
  setText('#adSummaryFee', `- ${formatCurrency(values.preco_anunciado * values.tarifa)}`);
  setText('#adSummaryFixed', `- ${formatCurrency(values.custo_fixo)}`);
  setText('#adSummaryShipping', `- ${formatCurrency(values.frete)}`);
  setText('#adSummaryNet', formatCurrency(values.liquido_receber));
  updateAdModalPreview();
  updateAdChangeHighlights();
}

function updateAdModalPreview() {
  const form = document.querySelector('#editAdForm');
  if (!form) return;
  const name = form.elements.nome.value.trim() || 'Produto';
  const code = form.elements.codigo_produto.value.trim() || '#';
  const sku = form.elements.sku.value.trim() || 'SKU';
  const image = form.elements.foto_url.value.trim();
  const pendingImageUrl = adImageFile ? URL.createObjectURL(adImageFile) : '';
  const initials = name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'ML';
  const preview = document.querySelector('#adModalPreview');
  preview.innerHTML = pendingImageUrl || image
    ? `<img src="${pendingImageUrl || image}" alt="Produto">`
    : `<span>${initials}</span>`;
  setText('#adModalPreviewMeta', `${cleanCode(code)} · ${sku}`);
  const hasLink = Boolean(form.elements.link_anuncio.value.trim());
  document.querySelectorAll('[data-open-current-ad-link]').forEach(button => {
    button.disabled = !hasLink;
    button.title = hasLink ? 'Abrir anúncio no Mercado Livre' : 'Informe o link do anúncio';
  });
}

function openCurrentAdLink() {
  const form = document.querySelector('#editAdForm');
  const link = form?.elements.link_anuncio.value.trim();
  if (link) window.open(link, '_blank');
}

function injectEditModal() {
  if (document.querySelector('#editAdModal')) return;
  document.querySelector('.anuncios-content .page-header > div').insertAdjacentHTML('afterend', `
    <div class="ad-header-actions">
      <button class="btn-reactivate add-ad-button" id="addAdButton"><i class="fa-solid fa-plus"></i> Adicionar anúncio</button>
    </div>
  `);
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal fade" id="editAdModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-xl ad-editor-dialog">
        <form class="modal-content app-modal product-edit-modal ad-editor-modal" id="editAdForm">
          <div class="modal-header ad-editor-header">
            <div class="modal-title-wrap">
              <div class="modal-icon"><i class="fa-solid fa-pen"></i></div>
              <div>
                <h5 class="modal-title fw-bold" id="adModalTitle">Editar anúncio</h5>
                <p class="mb-0">Atualize os dados principais do produto e do anúncio.</p>
              </div>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
          </div>
          <div class="modal-body ad-editor-body">
            <input type="hidden" name="id">
            <input type="hidden" name="ultima_atualizacao_preco">
            <input type="hidden" name="quantidade_vendida">
            <input type="hidden" name="preco_anunciado">
            <input type="hidden" name="liquido_receber">
            <div class="ad-editor-grid">
              <div class="ad-editor-main">
                <section class="ad-editor-card">
                  <h6><i class="fa-regular fa-image"></i> Informações do anúncio</h6>
                  <div class="ad-info-grid">
                    <div class="ad-image-column">
                      <div class="ad-modal-preview" id="adModalPreview"><span>ML</span></div>
                      <input type="file" id="adImageInput" accept="image/*" hidden>
                      <button type="button" class="ad-change-image-button" id="adChangeImageButton">
                        <i class="fa-regular fa-image"></i> Alterar imagem
                      </button>
                      <span class="ad-image-hint">JPG, PNG ou WEBP. Máx. 5MB</span>
                    </div>
                    <div class="ad-fields-grid">
                      <div class="ad-name-field"><label>Nome do produto</label><input class="form-control" name="nome" maxlength="60" required></div>
                      <div><label>SKU</label><input class="form-control" name="sku" placeholder="Ex.: M001256"></div>
                      <div><label>Código do Produto</label><input class="form-control" name="codigo_produto" placeholder="Ex.: #5929218750" required></div>
                      <div><label>Status</label><select class="form-select" name="status"><option>Ativado</option><option>Pausado</option></select></div>
                      <div><label>Tipo</label><select class="form-select" name="tipo_anuncio"><option>Clássico</option><option>Premium</option></select></div>
                      <div><label>Estoque</label><input class="form-control" name="estoque" inputmode="numeric"></div>
                    </div>
                  </div>
                  <label>Link da página do anúncio (Mercado Livre)</label>
                  <div class="ad-link-row">
                    <i class="fa-solid fa-link"></i>
                    <input class="form-control" name="link_anuncio">
                    <button type="button" id="openAdLinkButton" data-open-current-ad-link aria-label="Abrir link"><i class="fa-solid fa-arrow-up-right-from-square"></i></button>
                  </div>
                  <input type="hidden" name="foto_url">
                  <button type="button" class="ad-image-dropzone" id="adImageDropzone">
                    <i class="fa-regular fa-image"></i>
                    <strong>Adicionar imagem do produto</strong>
                    <span>Escolha, arraste ou cole com Ctrl+V</span>
                  </button>
                  <div class="ad-image-info" id="adImageInfo">Nenhuma imagem selecionada.</div>
                  <small id="adModalPreviewMeta"># · SKU</small>
                </section>

              </div>

              <aside class="ad-side-stack">
                <section class="ad-editor-card ad-pricing-card">
                  <h6><i class="fa-solid fa-tag"></i> Precificação</h6>
                  <div class="ad-pricing-grid">
                    <div><label>Valor do produto</label><input class="form-control cents-input" name="valor_total" inputmode="numeric"></div>
                    <div><label>Desconto (%)</label><input class="form-control percent-cents-input" name="desconto" inputmode="numeric"></div>
                    <div><label>Frete</label><input class="form-control cents-input" name="frete" inputmode="numeric"></div>
                    <div><label>Custo fixo</label><input class="form-control" name="custo_fixo" readonly></div>
                  </div>
                  <div class="ad-form-note"><i class="fa-solid fa-circle-info"></i> O tipo do anúncio define a tarifa: Clássico 12% e Premium 17%.</div>
                </section>

                <section class="ad-summary-card">
                <h6>Resumo financeiro <i class="fa-solid fa-circle-info"></i></h6>
                <div class="ad-summary-list">
                  <div><span>Preço anunciado</span><strong id="adSummaryPrice">R$ 0,00</strong></div>
                  <div><span id="adSummaryFeeLabel">Tarifa Mercado Livre</span><strong class="ad-summary-negative" id="adSummaryFee">- R$ 0,00</strong></div>
                  <div><span>Custo fixo</span><strong class="ad-summary-negative" id="adSummaryFixed">- R$ 0,00</strong></div>
                  <div><span>Frete</span><strong class="ad-summary-negative" id="adSummaryShipping">- R$ 0,00</strong></div>
                </div>
                <div class="ad-net-card">
                  <strong>Líquido a receber</strong>
                  <span id="adSummaryNet">R$ 0,00</span>
                  <small><i class="fa-regular fa-circle-check"></i> Este é o valor que você receberá.</small>
                </div>
                </section>
              </aside>
            </div>
          </div>
          <div class="modal-footer ad-editor-footer">
            <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-outline-secondary ad-open-link-footer" id="openAdLinkFooterButton" data-open-current-ad-link>
              <i class="fa-solid fa-arrow-up-right-from-square"></i> Abrir anúncio
            </button>
            <button type="submit" class="btn btn-primary" id="saveAdButton">Salvar anúncio</button>
          </div>
        </form>
      </div>
    </div>
  `);

  document.querySelector('#editAdForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = { ...Object.fromEntries(new FormData(form)), ...readAdFormValues(form) };
    data.id = Number(data.id || 0);
    if (adImageFile) {
      const bytes = new Uint8Array(await adImageFile.arrayBuffer());
      const image = await getApi().salvarImagemAnuncioArquivo({
        anuncioId: data.id,
        nome: adImageFile.name,
        type: adImageFile.type,
        bytes,
      });
      data.foto_url = image.url;
    }
    if (data.id) await getApi().atualizarAnuncio(data);
    else await getApi().criarAnuncio(data);
    adImageFile = null;
    bootstrap.Modal.getInstance(document.querySelector('#editAdModal')).hide();
    await carregarAnuncios();
  });

  document.querySelector('#addAdButton').addEventListener('click', () => openAdModal());
  document.querySelectorAll('[data-open-current-ad-link]').forEach(button => {
    button.addEventListener('click', openCurrentAdLink);
  });
  document.querySelectorAll('#editAdForm input, #editAdForm select').forEach(input => {
    input.addEventListener('input', updateAdFinancialSummary);
    input.addEventListener('change', updateAdFinancialSummary);
  });
  document.querySelectorAll('#editAdForm .cents-input').forEach(input => {
    input.addEventListener('input', event => {
      event.target.value = formatMoneyInputValue(event.target.value);
      updateAdFinancialSummary();
    });
  });
  document.querySelectorAll('#editAdForm .percent-cents-input').forEach(input => {
    input.addEventListener('blur', event => {
      event.target.value = formatPercentInputValue(event.target.value);
      updateAdFinancialSummary();
    });
  });
  prepareAdImageUpload();
}

function prepareAdImageUpload() {
  const input = document.querySelector('#adImageInput');
  const dropzone = document.querySelector('#adImageDropzone');
  const modal = document.querySelector('#editAdModal');
  if (!input || !dropzone || !modal) return;

  dropzone.addEventListener('click', () => input.click());
  document.querySelector('#adChangeImageButton')?.addEventListener('click', () => input.click());
  input.addEventListener('change', () => selectAdImage(input.files?.[0]));

  dropzone.addEventListener('dragover', event => {
    event.preventDefault();
    dropzone.classList.add('drag-over');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
  dropzone.addEventListener('drop', event => {
    event.preventDefault();
    dropzone.classList.remove('drag-over');
    selectAdImage(event.dataTransfer.files?.[0]);
  });
  modal.addEventListener('paste', event => {
    const file = Array.from(event.clipboardData?.files || []).find(item => item.type.startsWith('image/'));
    if (!file) return;
    event.preventDefault();
    selectAdImage(file);
  });
}

function selectAdImage(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) return;
  adImageFile = file;
  setText('#adImageInfo', `${file.name} pronto para salvar.`);
  updateAdModalPreview();
  updateAdChangeHighlights();
}

function getAdComparableValues() {
  const form = document.querySelector('#editAdForm');
  if (!form) return {};
  const values = readAdFormValues(form);
  return {
    nome: form.elements.nome.value.trim(),
    sku: form.elements.sku.value.trim(),
    codigo_produto: form.elements.codigo_produto.value.trim(),
    status: form.elements.status.value,
    tipo_anuncio: form.elements.tipo_anuncio.value,
    estoque: values.estoque,
    link_anuncio: form.elements.link_anuncio.value.trim(),
    valor_total: Number(values.valor_total.toFixed(2)),
    desconto: Number(values.desconto.toFixed(4)),
    frete: Number(values.frete.toFixed(2)),
    custo_fixo: Number(values.custo_fixo.toFixed(2)),
    foto_url: adImageFile ? '__new_image__' : form.elements.foto_url.value.trim(),
  };
}

function updateAdChangeHighlights() {
  const form = document.querySelector('#editAdForm');
  if (!form || !originalAdSnapshot) {
    document.querySelectorAll('#editAdForm .ad-field-changed').forEach(element => element.classList.remove('ad-field-changed'));
    document.querySelector('.ad-image-column')?.classList.remove('ad-field-changed');
    return;
  }

  const current = getAdComparableValues();
  const fieldMap = {
    nome: form.elements.nome,
    sku: form.elements.sku,
    codigo_produto: form.elements.codigo_produto,
    status: form.elements.status,
    tipo_anuncio: form.elements.tipo_anuncio,
    estoque: form.elements.estoque,
    link_anuncio: form.elements.link_anuncio,
    valor_total: form.elements.valor_total,
    desconto: form.elements.desconto,
    frete: form.elements.frete,
    custo_fixo: form.elements.custo_fixo,
  };

  Object.entries(fieldMap).forEach(([key, field]) => {
    field?.classList.toggle('ad-field-changed', current[key] !== originalAdSnapshot[key]);
  });
  document.querySelector('.ad-image-column')?.classList.toggle('ad-field-changed', current.foto_url !== originalAdSnapshot.foto_url);
}

function saveAdFilters() {
  localStorage.setItem(AD_FILTER_STORAGE_KEY, JSON.stringify({
    search: searchInput.value,
    status: statusSelect.value,
    type: typeSelect.value,
    stock: stockSelect.value,
    sort: sortSelect.value,
  }));
}

function restoreAdFilters() {
  try {
    const filters = JSON.parse(localStorage.getItem(AD_FILTER_STORAGE_KEY) || '{}');
    searchInput.value = filters.search || '';
    statusSelect.value = filters.status || 'Todos';
    typeSelect.value = filters.type || 'Todos';
    stockSelect.value = filters.stock || 'Todos';
    sortSelect.value = filters.sort || 'Padrão';
  } catch (error) {
    localStorage.removeItem(AD_FILTER_STORAGE_KEY);
  }
}

function applyFilters() {
  const search = searchInput.value.trim().toLowerCase();
  const status = statusSelect.value;
  const type = typeSelect.value;
  const stock = stockSelect.value;
  const sort = sortSelect.value;

  filtered = anuncios.filter((anuncio) => {
    const haystack = `${anuncio.codigo_produto} ${anuncio.sku} ${anuncio.nome}`.toLowerCase();
    const isActive = String(anuncio.status || '').toLowerCase().startsWith('ativ');
    return (!search || haystack.includes(search))
      && (status === 'Todos' || (status === 'Ativo' ? isActive : !isActive))
      && (type === 'Todos' || anuncio.tipo_anuncio === type)
      && (stock === 'Todos'
        || (stock === 'Com estoque' && anuncio.estoque > 0)
        || (stock === 'Estoque baixo' && anuncio.estoque > 0 && anuncio.estoque <= 5)
        || (stock === 'Sem estoque' && anuncio.estoque <= 0));
  });
  if (sort === 'Adicionados recentemente') {
    filtered.sort((a, b) => {
      const aOrder = Number(a.ordem_importacao || a.id || 0);
      const bOrder = Number(b.ordem_importacao || b.id || 0);
      return aOrder - bOrder;
    });
  }
  saveAdFilters();

  state.page = 1;
  render();
}

function renderTabela(lista) {
  const tbody = document.querySelector('.anuncios-table tbody');
  tbody.innerHTML = lista.map((anuncio) => {
    const paused = String(anuncio.status || '').toLowerCase().startsWith('paus');
    return `
      <tr class="ml-ad-row ${paused ? 'is-paused' : ''}" data-id="${anuncio.id}">
        <td class="ad-main-cell">
          <label class="ad-check"><input type="checkbox"><span></span></label>
          <img class="ad-list-thumb" src="${productImage(anuncio.foto_url, anuncio.nome || 'ML')}" alt="Produto">
          <div class="ad-list-info">
            <strong title="${anuncio.nome || ''}">${anuncio.nome || '-'}</strong>
            <small>${cleanCode(anuncio.codigo_produto)}</small>
            <small>SKU <span title="${anuncio.sku || '-'}">${truncateText(anuncio.sku, 18)}</span></small>
            <span>Estoque: ${formatNumber(anuncio.estoque)} u.</span>
          </div>
        </td>
        <td class="ad-price-cell">
          <strong>${formatCurrency(anuncio.preco_anunciado)}</strong>
          <span>${anuncio.desconto ? `com desconto de ${formatPercent(anuncio.desconto)}` : 'sem promoção'}</span>
        </td>
        <td class="ad-condition-cell">
          <strong>${anuncio.tipo_anuncio || '-'}</strong>
          <span>A pagar ${formatCurrency(anuncio.custo_fixo)}</span>
          <strong>Envio por conta do comprador</strong>
          <span>Frete ${formatCurrency(anuncio.frete)} <i class="fa-regular fa-circle-question"></i></span>
        </td>
        <td class="ad-receive-cell">
          <strong>${formatCurrency(anuncio.liquido_receber)}</strong>
          <i class="fa-regular fa-circle-question"></i>
        </td>
        <td class="text-center">
          <div class="ad-row-actions">
            <button class="action-btn open-ad-link" title="Abrir anúncio" ${anuncio.link_anuncio ? '' : 'disabled'}><i class="fa-solid fa-arrow-up-right-from-square"></i></button>
            <button class="action-btn edit-row" title="Editar"><i class="fa-solid fa-pen"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.ml-ad-row').forEach(row => {
    const anuncio = anuncios.find(item => item.id === Number(row.dataset.id));
    row.querySelector('.edit-row')?.addEventListener('click', (event) => {
      event.stopPropagation();
      openAdModal(anuncio);
    });
    row.querySelector('.open-ad-link')?.addEventListener('click', (event) => {
      event.stopPropagation();
      if (anuncio?.link_anuncio) window.open(anuncio.link_anuncio, '_blank');
    });
  });
}

function render() {
  const page = paginate(filtered, state.page, state.pageSize);
  state.page = page.page;
  renderTabela(page.items);
  setText('.table-footer > span', `Mostrando ${page.total ? page.start + 1 : 0} a ${page.end} de ${page.total} anúncios`);
  renderPagination(document.querySelector('.table-footer .pagination-wrap'), { ...state, totalPages: page.totalPages }, (next) => {
    state = { ...state, ...next };
    render();
  });
}

function openAdModal(anuncio = null) {
  const form = document.querySelector('#editAdForm');
  adImageFile = null;
  originalAdSnapshot = null;
  form.reset();
  form.elements.id.value = anuncio?.id || '';
  form.elements.status.value = anuncio?.status || 'Ativado';
  form.elements.tipo_anuncio.value = anuncio?.tipo_anuncio || 'Clássico';
  form.elements.desconto.value = percentToInput(anuncio?.desconto ?? 0);
  form.elements.valor_total.value = formatCurrency(anuncio?.valor_total || 0);
  form.elements.frete.value = formatCurrency(anuncio?.frete || 0);
  form.elements.estoque.value = Number(anuncio?.estoque || 0).toLocaleString('pt-BR');
  form.elements.quantidade_vendida.value = Number(anuncio?.quantidade_vendida || 0).toLocaleString('pt-BR');
  form.elements.nome.value = anuncio?.nome || '';
  form.elements.sku.value = anuncio?.sku || '';
  form.elements.codigo_produto.value = anuncio?.codigo_produto || '';
  form.elements.ultima_atualizacao_preco.value = toInputDate(anuncio?.ultima_atualizacao_preco);
  form.elements.link_anuncio.value = anuncio?.link_anuncio || '';
  form.elements.foto_url.value = anuncio?.foto_url || '';
  const imageInput = document.querySelector('#adImageInput');
  if (imageInput) imageInput.value = '';
  setText('#adImageInfo', anuncio?.foto_url ? 'Imagem já cadastrada.' : 'Nenhuma imagem selecionada.');

  setText('#adModalTitle', anuncio ? 'Editar anúncio' : 'Adicionar anúncio');
  setText('#saveAdButton', anuncio ? 'Salvar anúncio' : 'Adicionar anúncio');
  updateAdFinancialSummary();
  originalAdSnapshot = anuncio ? getAdComparableValues() : null;
  updateAdChangeHighlights();
  bootstrap.Modal.getOrCreateInstance(document.querySelector('#editAdModal')).show();
}

function openEditModal(anuncio) {
  openAdModal(anuncio);
}

async function carregarAnuncios() {
  try {
    const [stats, lista] = await Promise.all([
      getApi().stats(),
      getApi().anuncios({ limit: 1000 }),
    ]);

    anuncios = lista;
    const cards = document.querySelectorAll('.ad-kpi-card strong');
    if (cards[0]) cards[0].textContent = formatNumber(stats.anuncios.ativos);
    if (cards[1]) cards[1].textContent = formatNumber(stats.anuncios.inativos);
    if (cards[2]) cards[2].textContent = formatNumber(stats.anuncios.premium);
    if (cards[3]) cards[3].textContent = formatNumber(stats.anuncios.classico);
    if (cards[4]) cards[4].textContent = '0';
    applyFilters();
  } catch (error) {
    console.error('Falha ao carregar anúncios:', error);
  }
}

injectEditModal();
searchInput.addEventListener('input', debounce(applyFilters));
statusSelect.addEventListener('change', applyFilters);
typeSelect.addEventListener('change', applyFilters);
stockSelect.addEventListener('change', applyFilters);
sortSelect.addEventListener('change', applyFilters);
document.querySelectorAll('.anuncios-filter-panel .btn-clear').forEach((button, index) => {
  button.addEventListener('click', () => {
    if (index === 0) applyFilters();
    else {
      searchInput.value = '';
      statusSelect.value = 'Todos';
      typeSelect.value = 'Todos';
      stockSelect.value = 'Todos';
      sortSelect.value = 'Padrão';
      localStorage.removeItem(AD_FILTER_STORAGE_KEY);
      applyFilters();
    }
  });
});

restoreAdFilters();
carregarAnuncios();
