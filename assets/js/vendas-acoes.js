let vendaSelecionadaParaExcluir = null;

function criarModalExcluirVenda() {
  if (document.querySelector('#deleteSaleModal')) return;

  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal fade" id="deleteSaleModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content delete-sale-modal">
          <div class="modal-header">
            <div>
              <h5 class="modal-title fw-bold">Excluir venda</h5>
              <p class="mb-0 text-muted">Essa ação não poderá ser desfeita.</p>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
          </div>
          <div class="modal-body">
            <p class="delete-sale-text">Tem certeza que deseja excluir esta venda?</p>
            <div class="delete-sale-info" id="deleteSaleInfo"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-danger" id="confirmDeleteSaleButton">
              <i class="fa-solid fa-trash"></i> Excluir venda
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="sale-toast" id="saleToast"></div>
  `);

  document.querySelector('#confirmDeleteSaleButton').addEventListener('click', excluirVendaSelecionada);
}

function mostrarToastVenda(mensagem, erro = false) {
  const toast = document.querySelector('#saleToast');
  if (!toast) return;
  toast.textContent = mensagem;
  toast.className = `sale-toast show ${erro ? 'error' : ''}`;
  clearTimeout(mostrarToastVenda.timer);
  mostrarToastVenda.timer = setTimeout(() => {
    toast.className = 'sale-toast';
  }, 2600);
}

function fecharMenusVenda() {
  document.querySelectorAll('.sale-action-menu.show').forEach(menu => menu.classList.remove('show'));
}

function prepararMenuVendas() {
  document.querySelectorAll('.order-card').forEach(card => {
    const actions = card.querySelector('.order-actions');
    if (!actions || actions.querySelector('.sale-action-wrap')) return;

    const vendaCode = card.dataset.venda || card.querySelector('.order-meta strong')?.textContent?.trim() || '';
    const vendaId = typeof vendas !== 'undefined'
      ? vendas.find(venda => cleanCode(venda.numero_venda) === vendaCode)?.id
      : null;

    const ellipsis = actions.querySelector('.fa-ellipsis-vertical');
    if (!ellipsis || !vendaId) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'sale-action-wrap';
    wrapper.innerHTML = `
      <button type="button" class="sale-action-button" aria-label="Mais ações">
        <i class="fa-solid fa-ellipsis-vertical"></i>
      </button>
      <div class="sale-action-menu">
        <button type="button" class="delete-sale-option">
          <i class="fa-solid fa-trash"></i> Excluir venda
        </button>
      </div>
    `;

    ellipsis.replaceWith(wrapper);

    wrapper.querySelector('.sale-action-button').addEventListener('click', event => {
      event.stopPropagation();
      const menu = wrapper.querySelector('.sale-action-menu');
      document.querySelectorAll('.sale-action-menu.show').forEach(openMenu => {
        if (openMenu !== menu) openMenu.classList.remove('show');
      });
      menu.classList.toggle('show');
    });

    wrapper.querySelector('.delete-sale-option').addEventListener('click', event => {
      event.stopPropagation();
      fecharMenusVenda();
      abrirModalExcluirVenda(vendaId);
    });
  });
}

function abrirModalExcluirVenda(vendaId) {
  vendaSelecionadaParaExcluir = typeof vendas !== 'undefined'
    ? vendas.find(venda => Number(venda.id) === Number(vendaId))
    : null;

  if (!vendaSelecionadaParaExcluir) {
    mostrarToastVenda('Não consegui encontrar essa venda.', true);
    return;
  }

  document.querySelector('#deleteSaleInfo').innerHTML = `
    <strong>${cleanCode(vendaSelecionadaParaExcluir.numero_venda)}</strong>
    <span>${vendaSelecionadaParaExcluir.cliente_nome || '-'} · ${formatCurrency(vendaSelecionadaParaExcluir.valor_receber || 0)}</span>
  `;

  bootstrap.Modal.getOrCreateInstance(document.querySelector('#deleteSaleModal')).show();
}

async function excluirVendaSelecionada() {
  if (!vendaSelecionadaParaExcluir) return;

  const button = document.querySelector('#confirmDeleteSaleButton');
  const original = button.innerHTML;
  button.disabled = true;
  button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Excluindo...';

  try {
    await getApi().excluirVenda(vendaSelecionadaParaExcluir.id);
    bootstrap.Modal.getInstance(document.querySelector('#deleteSaleModal')).hide();
    mostrarToastVenda('Venda excluída com sucesso.');
    vendaSelecionadaParaExcluir = null;
    await carregarVendas();
    setTimeout(prepararMenuVendas, 80);
  } catch (error) {
    console.error('Falha ao excluir venda:', error);
    mostrarToastVenda('Não foi possível excluir a venda.', true);
  } finally {
    button.disabled = false;
    button.innerHTML = original;
  }
}

function observarListaVendas() {
  const lista = document.querySelector('.orders-list');
  if (!lista) return;

  const observer = new MutationObserver(() => prepararMenuVendas());
  observer.observe(lista, { childList: true, subtree: true });
}

document.addEventListener('click', fecharMenusVenda);
document.addEventListener('DOMContentLoaded', () => {
  criarModalExcluirVenda();
  prepararMenuVendas();
  observarListaVendas();
  setTimeout(prepararMenuVendas, 500);
});