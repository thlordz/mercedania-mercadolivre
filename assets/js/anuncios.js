setActiveMenu('anuncios');

let anuncios = [];
let filtered = [];
let state = { page: 1, pageSize: 10 };

const searchInput = document.querySelector('.anuncios-filter-panel .search-box input');
const statusSelect = document.querySelectorAll('.anuncios-filter-panel select')[0];
const typeSelect = document.querySelectorAll('.anuncios-filter-panel select')[1];
const stockSelect = document.querySelectorAll('.anuncios-filter-panel select')[2];

function injectEditModal() {
  if (document.querySelector('#editAdModal')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal fade" id="editAdModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-xl">
        <form class="modal-content app-modal product-edit-modal" id="editAdForm">
          <div class="modal-header">
            <div>
              <h5 class="modal-title fw-bold">Editar anúncio</h5>
              <p class="mb-0">Atualize os dados principais do produto e do anúncio.</p>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
          </div>
          <div class="modal-body">
            <input type="hidden" name="id">
            <div class="edit-product-layout">
              <aside class="edit-product-preview">
                <img id="editPreviewImage" src="" alt="Produto">
                <strong id="editPreviewName">Produto</strong>
                <span id="editPreviewMeta">Código e SKU</span>
                <a id="editPreviewLink" href="#" target="_blank">Abrir no Mercado Livre</a>
              </aside>
              <div class="row g-3">
                <div class="col-md-4"><label class="form-label">Código</label><input class="form-control" name="codigo_produto"></div>
                <div class="col-md-4"><label class="form-label">SKU</label><input class="form-control" name="sku"></div>
                <div class="col-md-4"><label class="form-label">Status</label><select class="form-select" name="status"><option>Ativado</option><option>Pausado</option></select></div>
                <div class="col-12"><label class="form-label">Nome</label><input class="form-control" name="nome"></div>
                <div class="col-md-6"><label class="form-label">Tipo</label><select class="form-select" name="tipo_anuncio"><option>Premium</option><option>Clássico</option></select></div>
                <div class="col-md-3"><label class="form-label">Preço anunciado</label><input class="form-control" name="preco_anunciado"></div>
                <div class="col-md-3"><label class="form-label">Líquido</label><input class="form-control" name="liquido_receber"></div>
                <div class="col-md-3"><label class="form-label">Valor total</label><input class="form-control" name="valor_total"></div>
                <div class="col-md-3"><label class="form-label">Frete</label><input class="form-control" name="frete"></div>
                <div class="col-md-3"><label class="form-label">Custo fixo</label><input class="form-control" name="custo_fixo"></div>
                <div class="col-md-3"><label class="form-label">Desconto %</label><input class="form-control" name="desconto"></div>
                <div class="col-md-3"><label class="form-label">Estoque</label><input class="form-control" name="estoque"></div>
                <div class="col-md-3"><label class="form-label">Vendidos</label><input class="form-control" name="quantidade_vendida"></div>
                <div class="col-md-3"><label class="form-label">Atualização</label><input type="date" class="form-control" name="ultima_atualizacao_preco"></div>
                <div class="col-12"><label class="form-label">Imagem do produto</label><input class="form-control" name="foto_url" placeholder="URL ou caminho da imagem"></div>
                <div class="col-12"><label class="form-label">Link Mercado Livre</label><input class="form-control" name="link_anuncio"></div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancelar</button>
            <button type="submit" class="btn btn-primary">Salvar anúncio</button>
          </div>
        </form>
      </div>
    </div>
  `);

  document.querySelector('#editAdForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const numeric = ['valor_total', 'frete', 'custo_fixo', 'desconto', 'preco_anunciado', 'liquido_receber', 'estoque', 'quantidade_vendida'];
    numeric.forEach(key => { data[key] = numberFromInput(data[key]); });
    data.id = Number(data.id);
    await getApi().atualizarAnuncio(data);
    bootstrap.Modal.getInstance(document.querySelector('#editAdModal')).hide();
    await carregarAnuncios();
  });
}

function applyFilters() {
  const search = searchInput.value.trim().toLowerCase();
  const status = statusSelect.value;
  const type = typeSelect.value;
  const stock = stockSelect.value;

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
            <small>${cleanCode(anuncio.codigo_produto)} <i class="fa-regular fa-copy"></i></small>
            <small>SKU <span title="${anuncio.sku || '-'}">${truncateText(anuncio.sku, 18)}</span> <i class="fa-regular fa-copy"></i></small>
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
        <td class="text-center"><button class="action-btn edit-row" title="Editar"><i class="fa-solid fa-pen"></i></button></td>
      </tr>
      <tr class="ad-campaign-row ${paused ? 'is-paused' : ''}">
        <td colspan="5">
          <div class="ad-campaign-callout">
            <i class="fa-solid fa-bullhorn"></i>
            <span>Venda mais com afiliados. Você só paga se vender.</span>
            <a href="#">Criar campanha <i class="fa-solid fa-chevron-right"></i></a>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.ml-ad-row').forEach(row => {
    row.addEventListener('click', (event) => {
      if (event.target.closest('input')) return;
      const anuncio = anuncios.find(item => item.id === Number(row.dataset.id));
      openEditModal(anuncio);
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

function openEditModal(anuncio) {
  if (!anuncio) return;
  const form = document.querySelector('#editAdForm');
  for (const [key, value] of Object.entries(anuncio)) {
    const input = form.elements[key];
    if (!input) continue;
    const numeric = ['valor_total', 'frete', 'custo_fixo', 'desconto', 'preco_anunciado', 'liquido_receber', 'estoque', 'quantidade_vendida'];
    if (key === 'ultima_atualizacao_preco') input.value = toInputDate(value);
    else if (numeric.includes(key)) input.value = Number(value ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 4 });
    else input.value = value ?? '';
  }

  document.querySelector('#editPreviewImage').src = productImage(anuncio.foto_url, anuncio.nome || 'ML');
  setText('#editPreviewName', anuncio.nome || 'Produto');
  setText('#editPreviewMeta', `${cleanCode(anuncio.codigo_produto)} · ${anuncio.sku || '-'}`);
  const previewLink = document.querySelector('#editPreviewLink');
  previewLink.href = anuncio.link_anuncio || '#';
  previewLink.classList.toggle('disabled', !anuncio.link_anuncio);
  bootstrap.Modal.getOrCreateInstance(document.querySelector('#editAdModal')).show();
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
document.querySelectorAll('.anuncios-filter-panel .btn-clear').forEach((button, index) => {
  button.addEventListener('click', () => {
    if (index === 0) applyFilters();
    else {
      searchInput.value = '';
      statusSelect.value = 'Todos';
      typeSelect.value = 'Todos';
      stockSelect.value = 'Todos';
      applyFilters();
    }
  });
});

carregarAnuncios();
