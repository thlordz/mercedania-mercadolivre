// JS da página Simulador
setActiveMenu('simulador');

function recalcularSimulacao() {
  const valor = Number(document.querySelector('#valorItem')?.value.replace(',', '.') || 0);
  const frete = Number(document.querySelector('#frete')?.value.replace(',', '.') || 0);
  const desconto = Number(document.querySelector('#desconto')?.value.replace(',', '.') || 0);
  const tarifa = valor * 0.17;
  const custoFixo = 6.75;
  const total = valor - tarifa - frete - custoFixo - (valor * desconto / 100);
  const totalEl = document.querySelector('#totalReceber');
  if (totalEl) totalEl.textContent = formatCurrency(total);
}

document.querySelectorAll('#valorItem, #frete, #desconto').forEach(input => {
  input.addEventListener('input', recalcularSimulacao);
});
