setActiveMenu('simulador');

function recalcularSimulacao() {
  const valor = Number(document.querySelector('#valorItem')?.value.replace(',', '.') || 0);
  const frete = Number(document.querySelector('#frete')?.value.replace(',', '.') || 0);
  const desconto = Number(document.querySelector('#desconto')?.value.replace(',', '.') || 0);
  const tarifa = valor * 0.17;
  const custoFixo = 6.75;
  const total = valor - tarifa - frete - custoFixo - (valor * desconto / 100);
  const linhas = document.querySelectorAll('.result-line strong');
  if (linhas[0]) linhas[0].textContent = formatCurrency(valor);
  if (linhas[1]) linhas[1].textContent = formatCurrency(tarifa);
  if (linhas[2]) linhas[2].textContent = formatCurrency(frete);
  if (linhas[3]) linhas[3].textContent = formatCurrency(custoFixo);
  if (linhas[4]) linhas[4].textContent = formatPercent(desconto);
  const totalEl = document.querySelector('#totalReceber');
  if (totalEl) totalEl.textContent = formatCurrency(total);
}

document.querySelectorAll('#valorItem, #frete, #desconto').forEach(input => {
  input.addEventListener('input', recalcularSimulacao);
});

async function carregarProdutoInicial() {
  try {
    const [produto] = await getApi().anuncios({ limit: 1 });
    if (!produto) return;
    setText('.selected-product h6', produto.nome);
    const linhas = document.querySelectorAll('.selected-product p');
    if (linhas[0]) linhas[0].textContent = `Código do anúncio: #${produto.codigo_produto}`;
    if (linhas[1]) linhas[1].textContent = `SKU: ${produto.sku || '-'}`;
    document.querySelector('#valorItem').value = String(produto.preco_anunciado || produto.valor_total || 0).replace('.', ',');
    document.querySelector('#frete').value = String(produto.frete || 0).replace('.', ',');
    recalcularSimulacao();
  } catch (error) {
    console.error('Falha ao carregar produto para simulação:', error);
  }
}

carregarProdutoInicial();
