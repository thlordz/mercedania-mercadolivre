const hero=[
  {icon:'fa-solid fa-dollar-sign',label:'Receita Confirmada',value:38742.56,type:'money',trend:'▲ 21,3% vs mês anterior',green:true},
  {icon:'fa-solid fa-cart-shopping',label:'Número de Vendas',value:1428,type:'number',trend:'▲ 18,4% vs mês anterior'},
  {icon:'fa-solid fa-rectangle-ad',label:'Anúncios Ativos',value:312,type:'number',trend:'▲ 5,1% vs mês anterior'}
];
const small=[
  {icon:'fa-solid fa-rotate-left',label:'Devoluções',value:43,type:'number',trend:'▼ -6,7% vs mês anterior'},
  {icon:'fa-regular fa-circle-xmark',label:'Canceladas',value:29,type:'number',trend:'▼ -12,3% vs mês anterior'},
  {icon:'fa-solid fa-triangle-exclamation',label:'Reclamações',value:5,type:'number',trend:'▼ -28,6% vs mês anterior'},
  {icon:'fa-solid fa-pause',label:'Anúncios Pausados',value:28,type:'number',trend:'▼ -3,4% vs mês anterior'},
  {icon:'fa-solid fa-list',label:'Total de Anúncios',value:340,type:'number',trend:'▲ 2,8% vs mês anterior'},
  {icon:'fa-solid fa-arrow-trend-down',label:'Receita Perdida',value:1872.34,type:'money',trend:'▼ -8,9% vs mês anterior'},
  {icon:'fa-solid fa-arrow-up-right-dots',label:'Ticket Médio',value:27.12,type:'money',trend:'▲ 9,6% vs mês anterior'},
  {icon:'fa-solid fa-tags',label:'Promoções Ativas',value:38,type:'number',trend:'—'},
  {icon:'fa-solid fa-clipboard-list',label:'Sem promoção',value:259,type:'number',trend:'—'},
  {icon:'fa-regular fa-eye',label:'Itens monitorados',value:87,type:'number',trend:'—'}
];
const promos=[['<i class="fa-regular fa-circle-xmark"></i> Expirado',12,'promo-expired'],['<i class="fa-regular fa-clock"></i> Expira hoje',7,'promo-today'],['<i class="fa-solid fa-circle-plus"></i> Expira amanhã',15,'promo-tomorrow'],['<i class="fa-regular fa-calendar"></i> Programado',9,'promo-programmed'],['<i class="fa-solid fa-circle-check"></i> Ativado',38,'promo-active'],['<i class="fa-regular fa-circle"></i> Sem promoção',259,'promo-none']];
const cities=[['São Paulo - SP',412,'100%'],['Rio de Janeiro - RJ',231,'56%'],['Belo Horizonte - MG',128,'31%'],['Brasília - DF',97,'23%'],['Curitiba - PR',86,'20%']];
const months=['Jun','Jul','Ago','Set','Out','Nov','Dez','Jan','Fev','Mar','Abr','Mai'];
const revenue=[24680,28120,30450,29890,33540,31220,36110,32780,34190,37250,35480,38742.56];
const salesByMonth=[892,1021,1103,1078,1230,1115,1342,1189,1207,1328,1261,1428];
const sales=[['#2000012345','Carlos Silva','São Paulo - SP','R$ 129,90','31/05/2024 18:35','Concluída','done'],['#2000012344','Ana Beatriz','Rio de Janeiro - RJ','R$ 89,90','31/05/2024 17:42','Concluída','done'],['#2000012343','João Marcos','Belo Horizonte - MG','R$ 149,90','31/05/2024 16:21','Enviado','sent']];
function formatValue(value,type){return type==='money'?value.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):value.toLocaleString('pt-BR')}
function prepareCounter(el,target,type){const finalValue=formatValue(target,type);el.style.minWidth=`${Math.max(finalValue.length,3)}ch`;el.setAttribute('aria-label',finalValue)}
function animateNumber(el,target,type){prepareCounter(el,target,type);const duration=2300,start=performance.now();function tick(now){const p=Math.min((now-start)/duration,1);const e=1-Math.pow(1-p,4.8);const current=target*e;el.textContent=formatValue(type==='money'?current:Math.round(current),type);if(p<1)requestAnimationFrame(tick);else el.textContent=formatValue(target,type)}requestAnimationFrame(tick)}
function icon(cls){return `<i class="${cls}"></i>`}
function sparkline(c='sparkline'){return `<svg class="${c}" viewBox="0 0 170 70"><path d="M5 58 C25 50, 28 48, 42 45 S65 22, 82 30 S105 42, 122 20 S145 39, 165 5" /></svg>`}
function buildLineChart(values){
  const w=700,h=300,padX=0,padY=34,min=Math.min(...values),max=Math.max(...values),range=max-min||1;
  const pts=values.map((v,i)=>({
    x:padX+i*((w-padX*2)/(values.length-1)),
    y:padY+(max-v)/range*(h-padY*2),
    v
  }));
  const line=pts.map((p,i)=>`${i?'L':'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const area=`${line} L${w} ${h} L0 ${h} Z`;
  const markers=pts.map((p,i)=>`<button class="chart-marker" style="--x:${(p.x/w*100).toFixed(4)}%;--y:${(p.y/h*100).toFixed(4)}%" aria-label="${months[i]} • ${formatValue(p.v,'money')}"><span>${months[i]} • ${formatValue(p.v,'money')}</span></button>`).join('');
  document.querySelector('.line-chart').innerHTML=`<div class="line-plot"><svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><defs><linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(255,255,255,.22)"/><stop offset="100%" stop-color="rgba(255,255,255,0)"/></linearGradient></defs><path class="grid-line" d="M0 55 H700 M0 115 H700 M0 175 H700 M0 235 H700"/><path class="area" d="${area}"/><path class="line" d="${line}"/></svg><div class="chart-markers">${markers}</div></div><div class="months">${months.map(m=>`<span>${m}</span>`).join('')}</div>`;
}

document.querySelector('#heroCards').innerHTML=hero.map((i,n)=>`<article class="hero-card" style="animation-delay:${n*.06}s"><div class="hero-icon">${icon(i.icon)}</div><div><small>${i.label}</small><h3 class="counter ${i.green?'green':''}" data-value="${i.value}" data-type="${i.type}">0</h3><p>${i.trend}</p></div>${sparkline()}</article>`).join('');
document.querySelector('#smallCards').innerHTML=small.map((i,n)=>`<article class="small-card" style="animation-delay:${n*.035}s"><div class="small-icon">${icon(i.icon)}</div><div class="small-content"><small>${i.label}</small><h4 class="counter" data-value="${i.value}" data-type="${i.type}">0</h4><p>${i.trend}</p></div>${sparkline('small-spark')}</article>`).join('');
document.querySelector('#promoGrid').innerHTML=promos.map(([name,value,cls])=>`<div class="promo-item"><span class="${cls}">${name}</span><strong class="counter" data-value="${value}" data-type="number">0</strong></div>`).join('');
document.querySelector('#citiesList').innerHTML=cities.map(([name,value,width],index)=>`<div class="city-row"><span class="rank">${index+1}</span><div><span>${name}</span><div class="progress"><i style="--w:${width}"></i></div></div><strong class="counter" data-value="${value}" data-type="number">0</strong></div>`).join('');
buildLineChart(revenue);
const maxBar=Math.max(...salesByMonth);document.querySelector('#barChart').innerHTML=salesByMonth.map((value,index)=>`<div class="bar" style="--h:${value/maxBar*100}%; animation-delay:${index*.05}s" data-tooltip="${months[index]} • ${formatValue(value,'number')} vendas"><span class="counter" data-value="${value}" data-type="number">0</span><small>${months[index]}</small></div>`).join('');
document.querySelector('#latestSales').innerHTML=sales.map(([id,name,city,price,date,status,cls])=>`<div class="sale"><div class="sale-top"><div><strong>${id}</strong><p>${date}</p></div><strong>${price}</strong></div><p>${name}</p><p>${city}</p><span class="status ${cls}">${status}</span></div>`).join('');
document.querySelectorAll('.counter').forEach(c=>animateNumber(c,Number(c.dataset.value),c.dataset.type));
const searchInput=document.querySelector('#searchInput');window.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();searchInput.focus()}});
document.querySelector('#syncBtn').addEventListener('click',e=>{const b=e.currentTarget;b.classList.add('syncing');b.innerHTML='<i class="fa-solid fa-rotate"></i> Sincronizando...';setTimeout(()=>{document.querySelectorAll('.counter').forEach(c=>animateNumber(c,Number(c.dataset.value),c.dataset.type));b.classList.remove('syncing');b.innerHTML='<i class="fa-solid fa-check"></i> Dados sincronizados';setTimeout(()=>b.innerHTML='<i class="fa-solid fa-rotate"></i> Sincronizar dados',1400)},900)});
document.querySelectorAll('.menu-item').forEach(item=>item.addEventListener('click',()=>{document.querySelectorAll('.menu-item').forEach(i=>i.classList.remove('active'));item.classList.add('active')}));
