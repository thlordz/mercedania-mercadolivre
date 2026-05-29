setActiveMenu('vendas');

let vendas = [];
let filtered = [];
let anunciosBase = [];
let saleItems = [];
let state = { page: 1, pageSize: 10 };
let step = 1;
let productResults = [];
let activeProductResult = -1;

const query = getQuery();
const searchInput = document.querySelector('.sales-filter-panel .search-box input');
const periodSelect = document.querySelectorAll('.sales-filter-panel select')[0];
const statusSelect = document.querySelectorAll('.sales-filter-panel select')[1];

function statusClass(status) {
  const value = String(status || '').toLowerCase();
  if (value.includes('entregue') || value.includes('aprovado')) return 'success';
  if (value.includes('cancel')) return 'danger';
  if (value.includes('trânsito') || value.includes('enviado')) return 'info';
  return 'warning';
}

function injectNewSaleModal() {
  document.querySelector('.vendas-header').insertAdjacentHTML('beforeend', `
    <button class="btn-reactivate" id="newSaleButton"><i class="fa-solid fa-plus"></i> Nova venda</button>
  `);
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal fade" id="newSaleModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-xl new-sale-dialog">
        <form class="modal-content new-sale-modal" id="newSaleForm">
          <div class="modal-header">
            <div class="modal-title-wrap">
              <div class="modal-icon"><i class="fa-solid fa-cart-plus"></i></div>
              <div><h5 class="modal-title fw-bold">Nova venda</h5><p>Preencha os dados da venda em etapas</p></div>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
          </div>
          <div class="sale-steps">
            ${['Dados da venda', 'Produto', 'Valores', 'Entrega', 'Revisão'].map((label, index) => `
              <div class="sale-step ${index === 0 ? 'active' : ''}" data-step-dot="${index + 1}">
                <strong>${index + 1}</strong><span>${label}</span>
              </div>
            `).join('')}
          </div>
          <div class="modal-body">
            <section class="sale-step-panel" data-step="1">
              <div class="sale-form-grid">
                <div>
                  <label>Número da venda *</label>
                  <input class="form-control" name="numero_venda" id="saleNumber" required maxlength="17" placeholder="#2000013215886851">
                  <label>Data da venda *</label>
                  <input class="form-control" type="date" name="data_venda" required>
                  <label>Status da venda *</label>
                  <select class="form-select" name="status"><option>A caminho</option><option>Em trânsito</option><option>Entregue</option><option>Cancelado</option></select>
                  <label>Cliente *</label>
                  <input class="form-control" name="cliente_nome" required>
                  <label>CPF/CNPJ</label>
                  <input class="form-control" name="cliente_documento" id="saleDocument" inputmode="numeric" placeholder="CPF ou CNPJ">
                </div>
                <aside class="step-help"><strong>Sobre esta etapa</strong><p>Informe os dados principais da venda para identificação e organização.</p></aside>
              </div>
            </section>
            <section class="sale-step-panel d-none" data-step="2">
              <div class="sale-form-grid">
                <div>
                  <label>Buscar anúncio</label>
                  <input class="form-control" id="saleProductSearch" placeholder="Nome, SKU ou código">
                  <div class="sale-product-results"></div>
                  <h6 class="mt-3 fw-bold">Produtos adicionados</h6>
                  <div class="sale-items-list"></div>
                </div>
                <aside class="step-help"><strong>Produto</strong><p>Adicione um ou mais produtos. Cada item pode ter quantidade e valor próprios.</p></aside>
              </div>
            </section>
            <section class="sale-step-panel d-none" data-step="3">
              <div class="sale-form-grid">
                <div>
                  <div class="values-summary">
                    <div class="values-section">
                      <div><strong>Preço do produto</strong><span id="grossProductsTotal">R$ 0,00</span></div>
                      <div id="valuesProductsList" class="values-lines"></div>
                    </div>
                    <div class="values-section">
                      <div><strong>Tarifa de venda total</strong><span id="feeTotalPreview">-R$ 0,00</span></div>
                      <label>Tarifa total</label>
                      <input class="form-control money-input" name="tarifa_venda_total" inputmode="numeric" placeholder="R$ 0,00">
                    </div>
                    <div class="values-section">
                      <div><strong>Envios</strong><span id="shippingTotalPreview">-R$ 0,00</span></div>
                      <label>Envios</label>
                      <input class="form-control money-input" name="envios_total" inputmode="numeric" placeholder="R$ 0,00">
                    </div>
                    <div class="values-total"><strong>Total</strong><span id="saleTotalPreview">R$ 0,00</span></div>
                  </div>
                  <input type="hidden" name="valor_receber">
                  <label>Observação</label>
                  <textarea class="form-control" name="observacao" rows="4"></textarea>
                </div>
                <aside class="step-help"><strong>Valores</strong><p>Digite a tarifa total para liberar a próxima etapa. Use Enter para avançar e Esc para voltar.</p></aside>
              </div>
            </section>
            <section class="sale-step-panel d-none" data-step="4">
              <div class="sale-form-grid">
                <div>
                  <label>CEP</label>
                  <div class="cep-row">
                    <input class="form-control" name="cep" id="saleCep" maxlength="9" placeholder="01001-000">
                    <button type="button" class="btn btn-light border" id="lookupCepButton"><i class="fa-solid fa-magnifying-glass"></i> Buscar</button>
                  </div>
                  <small class="cep-feedback" id="cepFeedback"></small>
                  <div class="row g-3">
                    <div class="col-md-8">
                      <label>Endereço</label>
                      <input class="form-control" name="logradouro">
                    </div>
                    <div class="col-md-4">
                      <label>Número</label>
                      <input class="form-control" name="numero_endereco">
                    </div>
                    <div class="col-md-6">
                      <label>Complemento</label>
                      <input class="form-control" name="complemento_endereco">
                    </div>
                    <div class="col-md-6">
                      <label>Bairro</label>
                      <input class="form-control" name="bairro">
                    </div>
                    <div class="col-md-8">
                      <label>Cidade</label>
                      <input class="form-control" name="cidade">
                    </div>
                    <div class="col-md-4">
                      <label>UF</label>
                      <input class="form-control" name="uf" maxlength="2">
                    </div>
                  </div>
                  <label>Link da venda ou envio</label>
                  <input class="form-control" name="link_venda">
                  <label>Informações de entrega</label>
                  <textarea class="form-control" name="entrega" rows="4"></textarea>
                </div>
                <aside class="step-help"><strong>Entrega</strong><p>Guarde o link de acompanhamento ou qualquer detalhe operacional.</p></aside>
              </div>
            </section>
            <section class="sale-step-panel d-none" data-step="5">
              <div class="sale-review"></div>
            </section>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-light" id="cancelSaleButton" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-light" id="prevSaleStep">Voltar</button>
            <button type="button" class="btn btn-primary" id="nextSaleStep">Próximo <i class="fa-solid fa-arrow-right"></i></button>
          </div>
        </form>
      </div>
    </div>
  `);

  document.querySelector('#newSaleButton').addEventListener('click', () => {
    saleItems = [];
    step = 1;
    document.querySelector('#newSaleForm').reset();
    document.querySelector('[name="data_venda"]').value = new Date().toISOString().slice(0, 10);
    document.querySelector('[name="numero_venda"]').value = '#';
    renderSaleItems();
    renderSaleStep();
    bootstrap.Modal.getOrCreateInstance(document.querySelector('#newSaleModal'), { keyboard: false }).show();
    setTimeout(() => document.querySelector('[name="numero_venda"]').focus(), 150);
  });

  document.querySelector('#saleProductSearch').addEventListener('input', debounce(renderProductResults));
  document.querySelector('#saleProductSearch').addEventListener('keydown', handleProductSearchKeyboard);
  document.querySelector('#saleNumber').addEventListener('input', handleSaleNumberInput);
  document.querySelector('#saleDocument').addEventListener('input', handleDocumentInput);
  document.querySelectorAll('.money-input').forEach(input => input.addEventListener('input', handleMoneyInput));
  document.querySelector('#newSaleModal').addEventListener('keydown', handleSaleKeyboard);
  document.querySelector('#lookupCepButton').addEventListener('click', lookupCep);
  document.querySelector('#saleCep').addEventListener('input', handleCepInput);
  document.querySelector('#saleCep').addEventListener('blur', lookupCep);
  document.querySelector('#prevSaleStep').addEventListener('click', () => { if (step > 1) step -= 1; renderSaleStep(); });
  document.querySelector('#nextSaleStep').addEventListener('click', handleNextStep);
}

function onlyCepDigits(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 8);
}

function handleSaleNumberInput(event) {
  const digits = String(event.target.value || '').replace(/\D/g, '').slice(0, 16);
  event.target.value = `#${digits}`;
}

function formatDocument(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
  }
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5');
}

function handleDocumentInput(event) {
  event.target.value = formatDocument(event.target.value);
}

function moneyFromDigits(value) {
  return Number(String(value || '').replace(/\D/g, '') || 0) / 100;
}

function formatMoneyInputValue(value) {
  return moneyFromDigits(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function handleMoneyInput(event) {
  event.target.value = formatMoneyInputValue(event.target.value);
  renderValuesSummary();
}

function handleSaleKeyboard(event) {
  if (event.target.id === 'saleProductSearch' && ['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    if (step > 1) {
      step -= 1;
      renderSaleStep();
    } else {
      bootstrap.Modal.getInstance(document.querySelector('#newSaleModal'))?.hide();
    }
    return;
  }
  if (event.key !== 'Enter' || event.target.tagName === 'TEXTAREA') return;
  event.preventDefault();
  event.stopPropagation();
  if (event.shiftKey && step > 1) {
    step -= 1;
    renderSaleStep();
    return;
  }
  handleNextStep();
}

function formatCep(value) {
  const digits = onlyCepDigits(value);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

function setCepFeedback(message, type = '') {
  const feedback = document.querySelector('#cepFeedback');
  feedback.textContent = message;
  feedback.className = `cep-feedback ${type}`;
}

function handleCepInput(event) {
  event.target.value = formatCep(event.target.value);
  setCepFeedback('');
}

async function lookupCep() {
  const cepInput = document.querySelector('#saleCep');
  const cep = onlyCepDigits(cepInput.value);
  if (!cep) return;
  if (!/^\d{8}$/.test(cep)) {
    setCepFeedback('Informe um CEP com 8 dígitos.', 'error');
    return;
  }

  setCepFeedback('Buscando endereço...', 'loading');
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!response.ok) {
      setCepFeedback('CEP inválido. Confira os 8 dígitos.', 'error');
      return;
    }
    const data = await response.json();
    if (data.erro) {
      setCepFeedback('CEP não encontrado na base do ViaCEP.', 'error');
      return;
    }

    const form = document.querySelector('#newSaleForm');
    form.elements.cep.value = formatCep(cep);
    form.elements.logradouro.value = data.logradouro || '';
    form.elements.bairro.value = data.bairro || '';
    form.elements.cidade.value = data.localidade || '';
    form.elements.uf.value = data.uf || '';
    form.elements.complemento_endereco.value = data.complemento || form.elements.complemento_endereco.value;
    setCepFeedback('Endereço preenchido automaticamente.', 'success');
    form.elements.numero_endereco.focus();
  } catch (error) {
    console.error('Falha ao consultar ViaCEP:', error);
    setCepFeedback('Não foi possível consultar o ViaCEP agora.', 'error');
  }
}

function renderProductResults() {
  const term = document.querySelector('#saleProductSearch').value.trim().toLowerCase();
  if (!term) {
    productResults = [];
    activeProductResult = -1;
    document.querySelector('.sale-product-results').innerHTML = '';
    return;
  }
  productResults = anunciosBase
    .filter(item => !term || `${item.nome} ${item.sku} ${item.codigo_produto}`.toLowerCase().includes(term))
    .slice(0, 6);
  activeProductResult = productResults.length ? 0 : -1;
  document.querySelector('.sale-product-results').innerHTML = productResults.map((item, index) => `
    <button type="button" class="sale-product-option ${index === activeProductResult ? 'active' : ''}" data-id="${item.id}" data-index="${index}">
      <img src="${productImage(item.foto_url, item.nome || 'ML')}" alt="Produto">
      <span><strong>${item.nome}</strong><small>${cleanCode(item.codigo_produto)} · ${truncateText(item.sku, 18)}</small></span>
      <em>${formatCurrency(item.preco_anunciado)}</em>
    </button>
  `).join('');
  document.querySelectorAll('.sale-product-option').forEach(button => {
    button.addEventListener('click', () => {
      addSaleProduct(anunciosBase.find(item => item.id === Number(button.dataset.id)));
    });
  });
}

function refreshProductActiveResult() {
  document.querySelectorAll('.sale-product-option').forEach((button, index) => {
    button.classList.toggle('active', index === activeProductResult);
    if (index === activeProductResult) button.scrollIntoView({ block: 'nearest' });
  });
}

function handleProductSearchKeyboard(event) {
  if (!['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(event.key)) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    document.querySelector('#saleProductSearch').value = '';
    document.querySelector('.sale-product-results').innerHTML = '';
    productResults = [];
    activeProductResult = -1;
    return;
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    if (productResults.length) activeProductResult = Math.min(productResults.length - 1, activeProductResult + 1);
    refreshProductActiveResult();
    return;
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    if (productResults.length) activeProductResult = Math.max(0, activeProductResult - 1);
    refreshProductActiveResult();
    return;
  }
  if (event.key === 'Enter') {
    event.preventDefault();
    if (productResults[activeProductResult]) addSaleProduct(productResults[activeProductResult]);
    else handleNextStep();
  }
}

function addSaleProduct(ad) {
  if (!ad) return;
  saleItems.push({
    anuncio_id: ad.id,
    codigo_produto: ad.codigo_produto,
    sku: ad.sku,
    produto_nome: ad.nome,
    quantidade: 1,
    valor_unitario: ad.preco_anunciado || ad.valor_total || 0,
    foto_url: ad.foto_url || '',
  });
  document.querySelector('#saleProductSearch').value = '';
  document.querySelector('.sale-product-results').innerHTML = '';
  productResults = [];
  activeProductResult = -1;
  renderSaleItems();
  document.querySelector('#saleProductSearch').focus();
}

function renderSaleItems() {
  const total = saleItems.reduce((sum, item) => sum + item.quantidade * item.valor_unitario, 0);
  const totalInput = document.querySelector('[name="valor_receber"]');
  if (totalInput && !totalInput.value) totalInput.value = String(total);
  renderValuesSummary();
  const list = document.querySelector('.sale-items-list');
  if (!list) return;
  list.innerHTML = saleItems.length ? saleItems.map((item, index) => `
    <div class="sale-item-row">
      <img src="${productImage(item.foto_url, item.produto_nome || 'ML')}" alt="Produto">
      <div><strong>${item.produto_nome}</strong><small>${truncateText(item.sku, 18)}</small></div>
      <input type="number" min="1" value="${item.quantidade}" data-item-qty="${index}">
      <input value="${String(item.valor_unitario).replace('.', ',')}" data-item-value="${index}">
      <button type="button" data-remove-item="${index}"><i class="fa-solid fa-xmark"></i></button>
    </div>
  `).join('') : '<p class="text-muted mb-0">Nenhum produto adicionado.</p>';
  list.querySelectorAll('[data-item-qty]').forEach(input => input.addEventListener('input', () => {
    saleItems[Number(input.dataset.itemQty)].quantidade = Number(input.value || 1);
    renderSaleItems();
  }));
  list.querySelectorAll('[data-item-value]').forEach(input => input.addEventListener('input', () => {
    saleItems[Number(input.dataset.itemValue)].valor_unitario = numberFromInput(input.value);
    renderValuesSummary();
  }));
  list.querySelectorAll('[data-remove-item]').forEach(button => button.addEventListener('click', () => {
    saleItems.splice(Number(button.dataset.removeItem), 1);
    renderSaleItems();
  }));
}

function renderValuesSummary() {
  const gross = saleItems.reduce((sum, item) => sum + item.quantidade * item.valor_unitario, 0);
  const fee = numberFromInput(document.querySelector('[name="tarifa_venda_total"]')?.value || 0);
  const shipping = numberFromInput(document.querySelector('[name="envios_total"]')?.value || 0);
  const total = gross - fee - shipping;
  const totalInput = document.querySelector('[name="valor_receber"]');
  if (totalInput) totalInput.value = String(total);
  setText('#grossProductsTotal', formatCurrency(gross));
  setText('#feeTotalPreview', `-${formatCurrency(fee)}`);
  setText('#shippingTotalPreview', `-${formatCurrency(shipping)}`);
  setText('#saleTotalPreview', formatCurrency(total));
  const list = document.querySelector('#valuesProductsList');
  if (list) {
    list.innerHTML = saleItems.map(item => `
      <div><span>${item.produto_nome}</span><strong>${formatCurrency(item.valor_unitario * item.quantidade)}</strong></div>
    `).join('');
  }
}

function renderSaleStep() {
  document.querySelectorAll('.sale-step-panel').forEach(panel => panel.classList.toggle('d-none', Number(panel.dataset.step) !== step));
  document.querySelectorAll('.sale-step').forEach(dot => dot.classList.toggle('active', Number(dot.dataset.stepDot) <= step));
  document.querySelector('#prevSaleStep').disabled = step === 1;
  renderValuesSummary();
  document.querySelector('#nextSaleStep').innerHTML = step === 5 ? 'Salvar venda' : 'Próximo <i class="fa-solid fa-arrow-right"></i>';
  if (step === 5) renderReview();
  setTimeout(() => {
    const current = document.querySelector(`.sale-step-panel[data-step="${step}"]`);
    const target = current?.querySelector('input, select, textarea, button') || document.querySelector('#nextSaleStep');
    target?.focus();
  }, 40);
}

function renderReview() {
  const form = document.querySelector('#newSaleForm');
  const data = Object.fromEntries(new FormData(form));
  document.querySelector('.sale-review').innerHTML = `
    <h5>Revisão</h5>
    <div class="review-grid">
      <div><span>Venda</span><strong>${cleanCode(data.numero_venda)}</strong></div>
      <div><span>Cliente</span><strong>${data.cliente_nome || '-'}</strong></div>
      <div><span>CPF/CNPJ</span><strong>${data.cliente_documento || '-'}</strong></div>
      <div><span>Status</span><strong>${data.status || '-'}</strong></div>
      <div><span>Produtos</span><strong>${saleItems.length}</strong></div>
      <div><span>Total</span><strong>${formatCurrency(numberFromInput(data.valor_receber))}</strong></div>
      <div><span>Entrega</span><strong>${data.logradouro ? `${data.logradouro}, ${data.numero_endereco || 's/n'}` : 'Não informada'}</strong></div>
    </div>
    <div class="sale-items-list static">${saleItems.map(item => `<div class="sale-item-row"><img src="${productImage(item.foto_url, item.produto_nome)}" alt=""><div><strong>${item.produto_nome}</strong><small>${item.quantidade} unid. · ${formatCurrency(item.valor_unitario)}</small></div></div>`).join('')}</div>
  `;
}

async function handleNextStep() {
  if (step === 1) {
    const saleNumber = document.querySelector('[name="numero_venda"]').value;
    if (!/^#\d{16}$/.test(saleNumber)) {
      document.querySelector('[name="numero_venda"]').focus();
      return;
    }
  }
  if (step === 2 && !saleItems.length) return;
  if (step === 3 && numberFromInput(document.querySelector('[name="tarifa_venda_total"]').value) <= 0) {
    document.querySelector('[name="tarifa_venda_total"]').focus();
    return;
  }
  if (step < 5) {
    step += 1;
    renderSaleStep();
    return;
  }
  const form = document.querySelector('#newSaleForm');
  const data = Object.fromEntries(new FormData(form));
  await getApi().criarVenda({
    numero_venda: cleanCode(data.numero_venda),
    data_venda: data.data_venda,
    status: data.status,
    cliente_nome: data.cliente_nome,
    cliente_documento: data.cliente_documento,
    valor_receber: numberFromInput(data.valor_receber),
    tarifa_venda_total: numberFromInput(data.tarifa_venda_total),
    envios_total: numberFromInput(data.envios_total),
    observacao: data.observacao,
    link_venda: data.link_venda,
    cep: onlyCepDigits(data.cep),
    logradouro: data.logradouro,
    numero_endereco: data.numero_endereco,
    complemento_endereco: data.complemento_endereco,
    bairro: data.bairro,
    cidade: data.cidade,
    uf: data.uf,
    itens: saleItems,
  });
  bootstrap.Modal.getInstance(document.querySelector('#newSaleModal')).hide();
  await carregarVendas();
}

function applyFilters() {
  const search = searchInput.value.trim().toLowerCase();
  const status = statusSelect.value;
  const period = periodSelect.value;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  filtered = vendas.filter((venda) => {
    const haystack = `${venda.numero_venda} ${venda.cliente_nome} ${venda.produto_nome} ${venda.sku}`.toLowerCase();
    const date = venda.data_venda ? new Date(`${venda.data_venda}T00:00:00`) : null;
    const diff = date ? Math.ceil((today - date) / 86400000) : 99999;
    return (!search || haystack.includes(search))
      && (status === 'Todos' || venda.status === status)
      && (period === 'Últimos 30 dias' ? diff <= 30 : period === 'Hoje' ? diff === 0 : period === '7 dias' ? diff <= 7 : true);
  });
  state.page = 1;
  render();
}

function renderVendas(lista) {
  const container = document.querySelector('.orders-list');
  container.innerHTML = lista.map(venda => `
    <article class="order-card ${query.venda && cleanCode(query.venda) === cleanCode(venda.numero_venda) ? 'selected-sale' : ''}" data-venda="${cleanCode(venda.numero_venda)}">
      <div class="order-topline">
        <div class="order-meta">
          <span class="checkbox-fake"></span>
          <span class="ml-pill">ML</span>
          <strong>${cleanCode(venda.numero_venda)}</strong>
          <span>${formatDate(venda.data_venda)}</span>
          <span>${venda.cliente_nome || '-'}</span>
        </div>
        <div class="order-actions">
          <span class="status-pill ${statusClass(venda.status)}"><i class="fa-solid fa-truck"></i> ${venda.status || '-'}</span>
          <button data-open-sale="${venda.link_venda || ''}">${venda.link_venda ? 'Abrir venda' : 'Ver detalhes'}</button>
          <i class="fa-regular fa-receipt"></i>
          <i class="fa-solid fa-ellipsis-vertical"></i>
        </div>
      </div>
      <div class="order-items">
        ${(venda.itens || []).map(item => `
          <div class="order-product-row">
            <img src="${productImage(item.foto_url, item.produto_nome || 'ML')}" alt="Produto">
            <div class="order-product-name">${item.produto_nome || '-'}</div>
            <div class="order-data"><strong>${formatCurrency(item.valor_unitario)}</strong><span>Valor unitário</span></div>
            <div class="order-data"><strong>${formatNumber(item.quantidade)} unid.</strong><span>Quantidade</span></div>
            <div class="order-data"><strong title="${item.sku || '-'}">${truncateText(item.sku, 18)}</strong><span>SKU</span></div>
          </div>
        `).join('')}
      </div>
    </article>
  `).join('');
  container.querySelectorAll('[data-open-sale]').forEach(button => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      if (button.dataset.openSale) window.open(button.dataset.openSale, '_blank');
    });
  });
}

function render() {
  const page = paginate(filtered, state.page, state.pageSize);
  state.page = page.page;
  renderVendas(page.items);
  setText('.sales-footer > span', `Mostrando ${page.total ? page.start + 1 : 0} a ${page.end} de ${page.total} vendas`);
  renderPagination(document.querySelector('.sales-footer .pagination-wrap'), { ...state, totalPages: page.totalPages }, (next) => {
    state = { ...state, ...next };
    render();
  });
}

async function carregarVendas() {
  try {
    const [stats, lista, anuncios] = await Promise.all([
      getApi().stats(),
      getApi().vendas({ limit: 1000 }),
      getApi().anuncios({ limit: 1000 }),
    ]);

    vendas = lista;
    anunciosBase = anuncios;
    const cards = document.querySelectorAll('.sales-kpi-card');
    cards[0].querySelector('h2').textContent = formatCurrency(stats.vendas.receita);
    cards[0].querySelector('small').firstChild.textContent = `${formatNumber(stats.vendas.total)} vendas `;
    cards[1].querySelector('h2').textContent = formatNumber(stats.vendas.devolucoes || 0);
    cards[2].querySelector('h2').textContent = formatNumber(stats.vendas.canceladas || 0);
    if (query.venda) searchInput.value = cleanCode(query.venda);
    applyFilters();
  } catch (error) {
    console.error('Falha ao carregar vendas:', error);
  }
}

injectNewSaleModal();
searchInput.addEventListener('input', debounce(applyFilters));
periodSelect.addEventListener('change', applyFilters);
statusSelect.addEventListener('change', applyFilters);
document.querySelectorAll('.sales-filter-panel .btn-clear').forEach((button, index) => {
  button.addEventListener('click', () => {
    if (index === 0) applyFilters();
    else {
      searchInput.value = '';
      periodSelect.value = 'Últimos 30 dias';
      statusSelect.value = 'Todos';
      applyFilters();
    }
  });
});

carregarVendas();
