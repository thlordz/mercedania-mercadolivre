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
    #newSaleForm [name="status"] {
      border-color: transparent;
      font-weight: 850;
      color: #111827;
      transition: background-color .16s ease, border-color .16s ease, box-shadow .16s ease;
    }
    #newSaleForm [name="status"]:focus {
      box-shadow: 0 0 0 3px rgba(250, 204, 21, .2);
    }
    #newSaleForm [name="status"].sale-status-warning { background-color: #fff7d6; border-color: #facc15; }
    #newSaleForm [name="status"].sale-status-info { background-color: #dbeafe; border-color: #bfdbfe; }
    #newSaleForm [name="status"].sale-status-success { background-color: #dcfce7; border-color: #bbf7d0; }
    #newSaleForm [name="status"].sale-status-danger { background-color: #fee2e2; border-color: #fecaca; }
    #newSaleForm [name="status"] option {
      color: #111827;
      font-weight: 800;
    }
  `;
  document.head.appendChild(style);

  const statusSelect = form.querySelector('[name="status"]');
  if (statusSelect) {
    form.querySelector('.sale-status-visual')?.remove();

    const optionStyles = {
      'A caminho': { className: 'sale-status-warning', background: '#fff7d6' },
      'Em trânsito': { className: 'sale-status-info', background: '#dbeafe' },
      Entregue: { className: 'sale-status-success', background: '#dcfce7' },
      Cancelado: { className: 'sale-status-danger', background: '#fee2e2' },
    };

    statusSelect.querySelectorAll('option').forEach(option => {
      const styleConfig = optionStyles[option.value];
      if (!styleConfig) return;
      option.style.backgroundColor = styleConfig.background;
    });

    const syncStatus = () => {
      statusSelect.classList.remove(
        'sale-status-warning',
        'sale-status-info',
        'sale-status-success',
        'sale-status-danger',
      );
      const styleConfig = optionStyles[statusSelect.value];
      if (styleConfig) statusSelect.classList.add(styleConfig.className);
    };

    statusSelect.addEventListener('change', syncStatus);
    form.addEventListener('reset', () => setTimeout(syncStatus, 0));
    document.querySelector('#newSaleModal')?.addEventListener('shown.bs.modal', syncStatus);
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
