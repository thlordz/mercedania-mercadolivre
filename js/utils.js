function formatValue(value, type) {
  if (type === "money") return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return value.toLocaleString("pt-BR");
}

function animateNumber(el, target, type) {
  const duration = 1600;
  const start = performance.now();
  el.style.minWidth = `${formatValue(target, type).length}ch`;
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 4);
    const current = target * eased;
    el.textContent = formatValue(type === "money" ? current : Math.round(current), type);
    if (progress < 1) requestAnimationFrame(tick);
    else el.textContent = formatValue(target, type);
  }
  requestAnimationFrame(tick);
}

function sparkline(className = "hero-spark") {
  return `<svg class="${className}" viewBox="0 0 170 70" aria-hidden="true"><path d="M5 58 C25 50, 28 48, 42 45 S65 22, 82 30 S105 42, 122 20 S145 39, 165 5" /></svg>`;
}

function ensureTooltip() {
  let tooltip = document.querySelector(".chart-tooltip");
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.className = "chart-tooltip";
    document.body.appendChild(tooltip);
  }
  return tooltip;
}
