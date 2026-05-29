function setupSalePopupUx() {
  const form = document.querySelector('#newSaleForm');
  if (!form || form.dataset.uxReady === 'true') return;
  form.dataset.uxReady = 'true';

  const style = document.createElement('style');
  style.textContent = `
    #newSaleForm [name="observacao"],
    #newSaleForm [name="observacao"] + *,
    #newSaleForm label:has(+ [name="observacao"]),
    #newSaleForm [name="entrega"],
    #newSaleForm label:has(+ [name="entrega"]) { display: none !important; }
    .sale-status-visual { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin: 8px 0 12px; }
    .sale-status-choice { border: 1px solid var(--border); border-radius: 10px; background: #fff; min-height: 42px; font-weight: 850; color: #334155; }
    .sale-status-choice.active { border-color: #111; box-shadow: 0 0 0 2px var(--yellow); color: #111; }
    .sale-status-choice[data-status="A caminho"] { background: #fff7d6; }
    .sale-status-choice[data-status="Em trânsito"] { background: #dbeafe; }
    .sale-status-choice[data-status="Entregue"] { background: #dcfce7; }
    .sale-status-choice[data-status="Cancelado"] { background: #fee2e2; }
  `;
  document.head.appendChild(style);

  const statusSelect = form.querySelector('[name="status"]');
  if (statusSelect && !form.querySelector('.sale-status-visual')) {
    const visual = document.createElement('div');
    visual.className = 'sale-status-visual';
    visual.innerHTML = ['A caminho', 'Em trânsito', 'Entregue', 'Cancelado'].map(status => `
      <button type="button" class="sale-status-choice" data-status="${status}">${status}</button>
    `).join('');
    statusSelect.insertAdjacentElement('afterend', visual);

    const syncStatus = () => {
      visual.querySelectorAll('.sale-status-choice').forEach(button => {
        button.classList.toggle('active', button.dataset.status === statusSelect.value);
      });
    };

    visual.querySelectorAll('.sale-status-choice').forEach(button => {
      button.addEventListener('click', () => {
        statusSelect.value = button.dataset.status;
        syncStatus();
      });
    });
    statusSelect.addEventListener('change', syncStatus);
    syncStatus();
  }

  const productSearch = document.querySelector('#saleProductSearch');
  const results = document.querySelector('.sale-product-results');
  if (productSearch && results) {
    results.addEventListener('click', event => {
      if (event.target.closest('.sale-product-option')) {
        setTimeout(() => {
          productSearch.value = '';
          results.innerHTML = '';
        }, 80);
      }
    });
    document.addEventListener('click', event => {
      if (!event.target.closest('#saleProductSearch') && !event.target.closest('.sale-product-results')) {
        results.innerHTML = '';
      }
    });
  }

  form.addEventListener('keydown', event => {
    const isTextarea = event.target.tagName === 'TEXTAREA';
    const currentStep = Number(document.querySelector('.sale-step-panel:not(.d-none)')?.dataset.step || 1);

    if (event.key === '*') {
      event.preventDefault();
      document.querySelector('#nextSaleStep')?.click();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      if (currentStep > 1) document.querySelector('#prevSaleStep')?.click();
      else bootstrap.Modal.getInstance(document.querySelector('#newSaleModal'))?.hide();
      return;
    }

    if (event.key === 'Enter' && currentStep === 5 && !isTextarea) {
      event.preventDefault();
      document.querySelector('#nextSaleStep')?.click();
    }
  }, true);
}

const salePopupObserver = new MutationObserver(setupSalePopupUx);
salePopupObserver.observe(document.body, { childList: true, subtree: true });
document.addEventListener('DOMContentLoaded', setupSalePopupUx);
setTimeout(setupSalePopupUx, 600);