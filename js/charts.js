function createPath(points) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`).join(" ");
}

function renderRevenueChart() {
  const wrap = document.querySelector("#revenueChart");
  const values = dashboardData.revenue;
  const months = dashboardData.months;
  const width = 700, height = 300;
  const padX = 0, top = 35, bottom = 230;
  const min = Math.min(...values) * 0.92;
  const max = Math.max(...values) * 1.03;
  const points = values.map((value, index) => {
    const x = padX + (index * (width - padX)) / (values.length - 1);
    const y = bottom - ((value - min) / (max - min)) * (bottom - top);
    return { x, y, value, month: months[index] };
  });
  const lineD = createPath(points);
  const areaD = `${lineD} L${width} ${height} L0 ${height} Z`;

  wrap.innerHTML = `
    <svg class="chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(255,255,255,.30)" />
          <stop offset="60%" stop-color="rgba(255,255,255,.11)" />
          <stop offset="100%" stop-color="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      <path class="grid-line" d="M0 55 H700 M0 115 H700 M0 175 H700 M0 235 H700" />
      <path class="area" d="${areaD}" />
      <path class="line" d="${lineD}" />
      ${points.map((p, i) => `<circle class="chart-dot" style="animation-delay:${0.55 + i * 0.045}s" cx="${p.x}" cy="${p.y}" r="4" />`).join("")}
      ${points.map(p => `<circle class="chart-hit" data-month="${p.month}" data-value="${p.value}" cx="${p.x}" cy="${p.y}" r="16" />`).join("")}
    </svg>
    <div class="months">${months.map(month => `<span>${month}</span>`).join("")}</div>`;

  bindChartTooltip(wrap, "money");
}

function renderBarChart() {
  const max = Math.max(...dashboardData.salesByMonth);
  const barChart = document.querySelector("#barChart");
  barChart.innerHTML = dashboardData.salesByMonth.map((value, index) => `
    <div class="bar" data-month="${dashboardData.months[index]}" data-value="${value}" style="--h:${(value / max) * 100}%; animation-delay:${index * .05}s"></div>
  `).join("");
  bindChartTooltip(barChart, "sales");
}

function bindChartTooltip(container, type) {
  const tooltip = ensureTooltip();
  const targets = container.querySelectorAll(".chart-hit,.bar");
  targets.forEach(target => {
    target.addEventListener("mouseenter", () => tooltip.classList.add("show"));
    target.addEventListener("mouseleave", () => tooltip.classList.remove("show"));
    target.addEventListener("mousemove", event => {
      const month = target.dataset.month;
      const raw = Number(target.dataset.value);
      const value = type === "money" ? formatValue(raw, "money") : `${formatValue(raw, "number")} vendas`;
      tooltip.textContent = `${month} • ${value}`;
      tooltip.style.left = `${event.clientX}px`;
      tooltip.style.top = `${event.clientY - 12}px`;
    });
  });
}
