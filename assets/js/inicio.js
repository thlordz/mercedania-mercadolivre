setActiveMenu('inicio');

async function carregarInicio() {
  try {
    const dados = await getApi().dashboard();
    const promocoes = Object.fromEntries((dados.promocoes || []).map(item => [item.status, item.total]));
    const kpis = document.querySelectorAll('.kpi-card');

    kpis[0]?.querySelector('h2') && (kpis[0].querySelector('h2').textContent = formatCurrency(dados.vendas.receita_liquida));
    kpis[1]?.querySelector('h2') && (kpis[1].querySelector('h2').textContent = formatNumber(dados.vendas.total_vendas));
    kpis[2]?.querySelector('h2') && (kpis[2].querySelector('h2').textContent = formatNumber(dados.anuncios.ativos));
    kpis[3]?.querySelector('h2') && (kpis[3].querySelector('h2').textContent = formatNumber(dados.anuncios.inativos));

    document.querySelector('.promo-card.expired strong').textContent = formatNumber((promocoes.Expirado || 0) + (promocoes['Expira hoje'] || 0));
    document.querySelector('.promo-card.scheduled strong').textContent = formatNumber(promocoes.Programado || 0);
    document.querySelector('.promo-card.active-promo strong').textContent = formatNumber(promocoes.Ativado || 0);
    document.querySelector('.promo-card.no-promo strong').textContent = formatNumber(promocoes['Sem Promoção'] || 0);

    const tbody = document.querySelector('.sales-table tbody');
    tbody.innerHTML = (dados.recentes || []).map(venda => `
      <tr data-venda="${cleanCode(venda.numero_venda)}">
        <td>${cleanCode(venda.numero_venda)}</td>
        <td>${formatDate(venda.data_venda)}</td>
        <td><span class="badge ${badgeClass(venda.status)}">${venda.status || '-'}</span></td>
        <td class="product-name">${venda.produto_nome || '-'}</td>
        <td>${formatCurrency(venda.valor_receber || venda.valor_unitario)}</td>
      </tr>
    `).join('');

    document.querySelector('.promo-card.expired').addEventListener('click', () => {
      window.location.href = 'promocoes.html?status=Expirado';
    });
    document.querySelector('.promo-card.scheduled').addEventListener('click', () => {
      window.location.href = 'promocoes.html?status=Programado';
    });
    document.querySelector('.promo-card.active-promo').addEventListener('click', () => {
      window.location.href = 'promocoes.html?status=Ativado';
    });
    document.querySelector('.promo-card.no-promo').addEventListener('click', () => {
      window.location.href = 'promocoes.html?status=Sem%20Promo%C3%A7%C3%A3o';
    });
    tbody.querySelectorAll('tr').forEach(row => {
      row.addEventListener('click', () => {
        window.location.href = `vendas.html?venda=${encodeURIComponent(row.dataset.venda)}`;
      });
    });
  } catch (error) {
    console.error('Falha ao carregar início:', error);
  }
}

carregarInicio();
