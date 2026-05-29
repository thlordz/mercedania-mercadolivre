// JS da página Promoções
setActiveMenu('promocoes');

const reactivateNextBtn = document.querySelector('[data-action="reactivate-next"]');
if (reactivateNextBtn) {
  reactivateNextBtn.addEventListener('click', () => {
    console.log('Abrir link da próxima promoção e copiar desconto automaticamente.');
  });
}
