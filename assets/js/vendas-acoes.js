let vendaSelecionadaParaExcluir = null;
let vendaSelecionadaParaEditar = null;
let vendaSelecionadaParaNota = null;
let notaFiscalSelecionada = null;

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
    <div class="modal fade" id="editSaleModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <form class="modal-content delete-sale-modal" id="editSaleForm">
          <div class="modal-header">
            <div>
              <h5 class="modal-title fw-bold">Editar venda</h5>
              <p class="mb-0 text-muted">Atualize os dados principais da venda.</p>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
          </div>
          <div class="modal-body edit-sale-grid">
            <label>Número da venda</label>
            <input class="form-control" name="numero_venda">
            <label>Nome do Cliente</label>
            <input class="form-control" name="cliente_nome">
            <label>Data</label>
            <input class="form-control" type="date" name="data_venda">
            <label>Status</label>
            <select class="form-select" name="status">
              <option>A caminho</option>
              <option>Em trânsito</option>
              <option>Entregue</option>
              <option>Cancelado</option>
            </select>
            <label>Tarifa total</label>
            <input class="form-control" name="tarifa_venda_total" inputmode="decimal">
            <label>Envios</label>
            <input class="form-control" name="envios_total" inputmode="decimal">
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancelar</button>
            <button type="submit" class="btn btn-primary" id="confirmEditSaleButton">
              <i class="fa-solid fa-floppy-disk"></i> Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
    <div class="modal fade" id="invoiceSaleModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <form class="modal-content delete-sale-modal" id="invoiceSaleForm">
          <div class="modal-header">
            <div>
              <h5 class="modal-title fw-bold">Nota fiscal</h5>
              <p class="mb-0 text-muted">Anexe o PDF da nota fiscal.</p>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
          </div>
          <div class="modal-body">
            <input type="file" id="invoiceFileInput" accept="application/pdf,.pdf" hidden>
            <button type="button" class="invoice-dropzone" id="invoiceDropzone">
              <i class="fa-regular fa-file-pdf"></i>
              <strong>Escolher PDF da nota fiscal</strong>
              <span>Arraste o arquivo aqui ou cole com Ctrl+V</span>
            </button>
            <div class="invoice-file-info" id="invoiceFileInfo">Nenhum PDF selecionado.</div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-light" id="openInvoiceButton">
              <i class="fa-solid fa-arrow-up-right-from-square"></i> Abrir nota
            </button>
            <button type="submit" class="btn btn-primary" id="confirmInvoiceSaleButton">
              <i class="fa-solid fa-floppy-disk"></i> Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
    <div class="sale-toast" id="saleToast"></div>
  `);

  document.querySelector('#confirmDeleteSaleButton').addEventListener('click', excluirVendaSelecionada);
  document.querySelector('#editSaleForm').addEventListener('submit', salvarVendaEditada);
  document.querySelector('#invoiceSaleForm').addEventListener('submit', salvarNotaFiscal);
  document.querySelector('#openInvoiceButton').addEventListener('click', abrirNotaFiscalSalva);
  prepararUploadNotaFiscal();
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
        <button type="button" class="edit-sale-option">
          <i class="fa-solid fa-pen-to-square"></i> Editar venda
        </button>
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

    wrapper.querySelector('.edit-sale-option').addEventListener('click', event => {
      event.stopPropagation();
      fecharMenusVenda();
      abrirModalEditarVenda(vendaId);
    });

    wrapper.querySelector('.delete-sale-option').addEventListener('click', event => {
      event.stopPropagation();
      fecharMenusVenda();
      abrirModalExcluirVenda(vendaId);
    });
  });
}

function vendaPorId(vendaId) {
  return typeof vendas !== 'undefined'
    ? vendas.find(venda => Number(venda.id) === Number(vendaId))
    : null;
}

function abrirModalEditarVenda(vendaId) {
  vendaSelecionadaParaEditar = vendaPorId(vendaId);
  if (!vendaSelecionadaParaEditar) {
    mostrarToastVenda('Não consegui encontrar essa venda.', true);
    return;
  }

  const form = document.querySelector('#editSaleForm');
  form.elements.numero_venda.value = cleanCode(vendaSelecionadaParaEditar.numero_venda);
  form.elements.cliente_nome.value = vendaSelecionadaParaEditar.cliente_nome || '';
  form.elements.data_venda.value = vendaSelecionadaParaEditar.data_venda || '';
  form.elements.status.value = vendaSelecionadaParaEditar.status || 'A caminho';
  form.elements.tarifa_venda_total.value = String(vendaSelecionadaParaEditar.tarifa_venda_total || 0).replace('.', ',');
  form.elements.envios_total.value = String(vendaSelecionadaParaEditar.envios_total || 0).replace('.', ',');
  bootstrap.Modal.getOrCreateInstance(document.querySelector('#editSaleModal')).show();
}

async function salvarVendaEditada(event) {
  event.preventDefault();
  if (!vendaSelecionadaParaEditar) return;

  const form = event.currentTarget;
  const payload = {
    ...vendaSelecionadaParaEditar,
    numero_venda: cleanCode(form.elements.numero_venda.value),
    cliente_nome: form.elements.cliente_nome.value.trim(),
    data_venda: form.elements.data_venda.value,
    status: form.elements.status.value,
    tarifa_venda_total: numberFromInput(form.elements.tarifa_venda_total.value),
    envios_total: numberFromInput(form.elements.envios_total.value),
  };
  payload.link_venda = typeof vendaDetalheUrl === 'function' ? vendaDetalheUrl(payload.numero_venda) : payload.link_venda;

  try {
    await getApi().atualizarVenda(payload);
    bootstrap.Modal.getInstance(document.querySelector('#editSaleModal')).hide();
    mostrarToastVenda('Venda atualizada com sucesso.');
    await carregarVendas();
    setTimeout(prepararMenuVendas, 80);
  } catch (error) {
    console.error('Falha ao editar venda:', error);
    mostrarToastVenda('Não foi possível editar a venda.', true);
  }
}

function abrirModalNotaFiscal(vendaId) {
  vendaSelecionadaParaNota = vendaPorId(vendaId);
  notaFiscalSelecionada = null;
  if (!vendaSelecionadaParaNota) {
    mostrarToastVenda('Não consegui encontrar essa venda.', true);
    return;
  }

  const input = document.querySelector('#invoiceFileInput');
  if (input) input.value = '';
  atualizarInfoNotaFiscal();
  bootstrap.Modal.getOrCreateInstance(document.querySelector('#invoiceSaleModal')).show();
  setTimeout(() => document.querySelector('#invoiceDropzone')?.focus(), 180);
}

function prepararUploadNotaFiscal() {
  const input = document.querySelector('#invoiceFileInput');
  const dropzone = document.querySelector('#invoiceDropzone');
  const modal = document.querySelector('#invoiceSaleModal');
  if (!input || !dropzone || !modal) return;

  dropzone.addEventListener('click', () => input.click());
  input.addEventListener('change', () => selecionarArquivoNota(input.files?.[0]));

  dropzone.addEventListener('dragover', event => {
    event.preventDefault();
    dropzone.classList.add('drag-over');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
  dropzone.addEventListener('drop', event => {
    event.preventDefault();
    dropzone.classList.remove('drag-over');
    selecionarArquivoNota(event.dataTransfer.files?.[0]);
  });

  modal.addEventListener('paste', event => {
    const file = Array.from(event.clipboardData?.files || []).find(item => item.type === 'application/pdf' || item.name.toLowerCase().endsWith('.pdf'));
    if (file) {
      event.preventDefault();
      selecionarArquivoNota(file);
    }
  });
}

function selecionarArquivoNota(file) {
  if (!file) return;
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    mostrarToastVenda('Selecione um arquivo PDF.', true);
    return;
  }
  notaFiscalSelecionada = file;
  atualizarInfoNotaFiscal();
}

function atualizarInfoNotaFiscal() {
  const info = document.querySelector('#invoiceFileInfo');
  if (!info) return;

  const nomeSalvo = vendaSelecionadaParaNota?.nota_fiscal_nome;
  if (notaFiscalSelecionada) {
    info.innerHTML = `<strong>${notaFiscalSelecionada.name}</strong><span>PDF pronto para salvar.</span>`;
    return;
  }
  if (nomeSalvo) {
    info.innerHTML = `<strong>${nomeSalvo}</strong><span>Nota fiscal anexada.</span>`;
    return;
  }
  info.textContent = 'Nenhum PDF selecionado.';
}

async function salvarNotaFiscal(event) {
  event.preventDefault();
  if (!vendaSelecionadaParaNota) return;
  if (!notaFiscalSelecionada) {
    mostrarToastVenda('Escolha, arraste ou cole um PDF primeiro.', true);
    return;
  }

  try {
    const bytes = new Uint8Array(await notaFiscalSelecionada.arrayBuffer());
    const arquivo = await getApi().salvarNotaFiscalArquivo({
      vendaId: vendaSelecionadaParaNota.id,
      nome: notaFiscalSelecionada.name,
      bytes,
    });
    await getApi().atualizarVenda({
      ...vendaSelecionadaParaNota,
      nota_fiscal: arquivo.path,
      nota_fiscal_nome: arquivo.nome,
    });
    bootstrap.Modal.getInstance(document.querySelector('#invoiceSaleModal')).hide();
    const input = document.querySelector('#invoiceFileInput');
    if (input) input.value = '';
    notaFiscalSelecionada = null;
    mostrarToastVenda('Nota fiscal anexada.');
    await carregarVendas();
    setTimeout(prepararMenuVendas, 80);
  } catch (error) {
    console.error('Falha ao salvar nota fiscal:', error);
    mostrarToastVenda('Não foi possível salvar a nota fiscal.', true);
  }
}

function abrirNotaFiscalSalva() {
  const filePath = vendaSelecionadaParaNota?.nota_fiscal;
  if (!filePath) {
    mostrarToastVenda('Nenhum PDF anexado ainda.', true);
    return;
  }
  getApi().abrirArquivo(filePath).catch(error => {
    console.error('Falha ao abrir nota fiscal:', error);
    mostrarToastVenda('Não foi possível abrir a nota fiscal.', true);
  });
}

function abrirModalExcluirVenda(vendaId) {
  vendaSelecionadaParaExcluir = vendaPorId(vendaId);

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
