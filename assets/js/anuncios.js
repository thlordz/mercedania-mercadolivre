// JS da página Anúncios
setActiveMenu('anuncios');

const updateOldPricesBtn = document.querySelector('[data-action="update-old-prices"]');
if (updateOldPricesBtn) {
  updateOldPricesBtn.addEventListener('click', () => {
    console.log('Iniciar fila de atualização de preços antigos.');
  });
}
