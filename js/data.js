const dashboardData = {
  months: ["Jun","Jul","Ago","Set","Out","Nov","Dez","Jan","Fev","Mar","Abr","Mai"],
  revenue: [24680,28120,30450,29890,33540,31220,36110,32780,34190,37250,35480,38742.56],
  hero: [
    { icon:"fa-dollar-sign", label:"Receita Confirmada", value:38742.56, type:"money", trend:"▲ 21,3% vs mês anterior", green:true },
    { icon:"fa-cart-shopping", label:"Número de Vendas", value:1428, type:"number", trend:"▲ 18,4% vs mês anterior" },
    { icon:"fa-rectangle-ad", label:"Anúncios Ativos", value:312, type:"number", trend:"▲ 5,1% vs mês anterior" }
  ],
  small: [
    { icon:"fa-rotate-left", label:"Devoluções", value:43, type:"number", trend:"▼ -6,7% vs mês anterior" },
    { icon:"fa-circle-xmark", label:"Canceladas", value:29, type:"number", trend:"▼ -12,3% vs mês anterior" },
    { icon:"fa-triangle-exclamation", label:"Reclamações", value:5, type:"number", trend:"▼ -28,6% vs mês anterior" },
    { icon:"fa-pause", label:"Anúncios Pausados", value:28, type:"number", trend:"▼ -3,4% vs mês anterior" },
    { icon:"fa-list", label:"Total de Anúncios", value:340, type:"number", trend:"▲ 2,8% vs mês anterior" },
    { icon:"fa-arrow-trend-down", label:"Receita Perdida", value:1872.34, type:"money", trend:"▼ -8,9% vs mês anterior" },
    { icon:"fa-arrow-up-right-dots", label:"Ticket Médio", value:27.12, type:"money", trend:"▲ 9,6% vs mês anterior" },
    { icon:"fa-tags", label:"Promoções Ativas", value:38, type:"number", trend:"—" },
    { icon:"fa-clipboard-list", label:"Sem promoção", value:259, type:"number", trend:"—" },
    { icon:"fa-eye", label:"Itens monitorados", value:87, type:"number", trend:"—" }
  ],
  promos: [
    { icon:"fa-circle-xmark", label:"Expirado", value:12, cls:"promo-expired" },
    { icon:"fa-clock", label:"Expira hoje", value:7, cls:"promo-today" },
    { icon:"fa-calendar-day", label:"Expira amanhã", value:15, cls:"promo-tomorrow" },
    { icon:"fa-calendar-plus", label:"Programado", value:9, cls:"promo-programmed" },
    { icon:"fa-circle-check", label:"Ativado", value:38, cls:"promo-active" },
    { icon:"fa-ban", label:"Sem promoção", value:259, cls:"promo-none" }
  ],
  cities: [["São Paulo - SP",412,"100%"],["Rio de Janeiro - RJ",231,"56%"],["Belo Horizonte - MG",128,"31%"],["Brasília - DF",97,"23%"],["Curitiba - PR",86,"20%"]],
  salesByMonth: [892,1021,1103,1078,1230,1115,1342,1189,1207,1328,1261,1428],
  latestSales: [["#2000012345","Carlos Silva","São Paulo - SP","R$ 129,90","31/05/2024 18:35","Concluída","done"],["#2000012344","Ana Beatriz","Rio de Janeiro - RJ","R$ 89,90","31/05/2024 17:42","Concluída","done"],["#2000012343","João Marcos","Belo Horizonte - MG","R$ 149,90","31/05/2024 16:21","Enviado","sent"]],
  topProducts: [
    ["Cabo HDMI 2m 4K Ultra HD Nylon Reforçado Premium", "M00HDMI2", 412, "R$ 8.238,80", "fa-ethernet"],
    ["Controle Universal Smart TV Compatível Multimarcas", "M00CTRL1", 287, "R$ 6.601,00", "fa-gamepad"],
    ["Fonte 12V 2A Bivolt Estabilizada Para Câmeras e LED", "M00FNT12", 193, "R$ 4.632,00", "fa-plug"]
  ]
};
