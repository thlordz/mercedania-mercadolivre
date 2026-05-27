document.addEventListener("DOMContentLoaded", () => {
  renderCards();
  renderRevenueChart();
  renderBarChart();
  bindInteractions();
  document.querySelectorAll(".counter").forEach(counter => animateNumber(counter, Number(counter.dataset.value), counter.dataset.type));
});
