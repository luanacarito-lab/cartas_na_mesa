// finance.js – Motor Financeiro Integrado & Controle de Segurança Cósmico
// --------------------------------------------------------------------------

// Credenciais do Supabase (Lidas de config.js / window.ENV)
const SUPABASE_URL = (window.ENV && window.ENV.SUPABASE_URL) || "https://YOUR_PROJECT_REF.supabase.co";
const SUPABASE_ANON_KEY = (window.ENV && window.ENV.SUPABASE_ANON_KEY) || "YOUR_PUBLIC_ANON_KEY";

// Inicialização do Supabase Client
let supabase = null;
try {
  if (typeof supabaseCreateClient === "function") {
    supabase = supabaseCreateClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } else if (typeof window.supabase !== "undefined") {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch (e) {
  console.warn("Supabase não disponível. Rodando Financeiro em Modo Demonstrativo.");
}

// ==========================================================================
// ESTADO FINANCEIRO INTERNO E MOCK DE CONTINGÊNCIA
// ==========================================================================
let financeiroData = [];  // Lista completa de movimentações
let filteredData = [];    // Movimentações filtradas
let activeClients = [];   // Lista de clientes únicos detectados

// Configurações de Segurança Financeira local
let securityConfig = {
  pin_ativo: true,
  pin: "1234"
};

// Movimentações Iniciais de Demonstração (Para ligar os gráficos e faturamento de imediato!)
const MOCK_INITIAL_FINANCES = [
  {
    id: "tx-1",
    cliente_id: "c1-uuid-helena",
    cliente_nome: "Helena de Souza",
    tipo: "entrada",
    categoria: "atendimento",
    valor: 150.00,
    status: "pago",
    origem: "automatico",
    descricao: "Consulta de Tarô Terapêutico Estelar",
    data_registro: new Date(Date.now() - 3600000 * 2).toISOString() // hoje
  },
  {
    id: "tx-2",
    cliente_id: "c1-uuid-helena",
    cliente_nome: "Helena de Souza",
    tipo: "entrada",
    categoria: "pergunta_baralho",
    valor: 90.00,
    status: "pago",
    origem: "automatico",
    descricao: "Pergunta ao Baralho Cigano - Duas Perguntas",
    data_registro: new Date(Date.now() - 3600000 * 24).toISOString() // ontem
  },
  {
    id: "tx-3",
    cliente_id: "c2-uuid-gabriel",
    cliente_nome: "Gabriel Medeiros",
    tipo: "entrada",
    categoria: "servico",
    valor: 120.00,
    status: "pendente",
    origem: "automatico",
    descricao: "Alinhamento de Chakras Cristalinos",
    data_registro: new Date(Date.now() - 3600000 * 48).toISOString() // 2 dias atrás
  },
  {
    id: "tx-4",
    cliente_id: null,
    cliente_nome: "Nenhuma",
    tipo: "saida",
    categoria: "plataforma",
    valor: 29.90,
    status: "pago",
    origem: "manual",
    descricao: "Taxa mensal da plataforma Cartomante",
    data_registro: new Date(Date.now() - 3600000 * 72).toISOString()
  },
  {
    id: "tx-5",
    cliente_id: null,
    cliente_nome: "Nenhuma",
    tipo: "saida",
    categoria: "gasto_pessoal",
    valor: 65.00,
    status: "pago",
    origem: "manual",
    descricao: "Incenso de Sândalo e Velas Violeta",
    data_registro: new Date(Date.now() - 3600000 * 120).toISOString()
  },
  {
    id: "tx-6",
    cliente_id: "c3-uuid-valentina",
    cliente_nome: "Valentina Rocha",
    tipo: "entrada",
    categoria: "pergunta_baralho",
    valor: 50.00,
    status: "pendente",
    origem: "automatico",
    descricao: "Pergunta ao Baralho Cigano - Urgência Alta",
    data_registro: new Date(Date.now() - 3600000 * 140).toISOString()
  },
  {
    id: "tx-7",
    cliente_id: "c1-uuid-helena",
    cliente_nome: "Helena de Souza",
    tipo: "entrada",
    categoria: "atendimento",
    valor: 180.00,
    status: "pago",
    origem: "automatico",
    descricao: "Tiragem de Mandala Astrológica",
    data_registro: new Date(Date.now() - 3600000 * 240).toISOString() // 10 dias atrás
  }
];

// Dados Históricos de Faturamento Mensal (Últimos 6 meses para desenhar o gráfico)
const MONTHLY_HISTORICAL_REVENUE = [
  { mes: "Dez", valor: 1400 },
  { mes: "Jan", valor: 1850 },
  { mes: "Fev", valor: 1600 },
  { mes: "Mar", valor: 2100 },
  { mes: "Abr", valor: 2500 },
  { mes: "Mai", valor: 2980 }
];

// ==========================================================================
// INICIALIZAÇÃO E SEGURANÇA
// ==========================================================================
document.addEventListener("DOMContentLoaded", async () => {
  // Inicializa estrelas cintilantes do design system
  if (typeof generateStars === "function") {
    generateStars();
  }

  // Carrega configurações de segurança locais ou do Supabase
  await loadSecuritySettings();

  // Se o PIN não estiver ativo, esconde overlay de imediato
  if (!securityConfig.pin_ativo) {
    document.getElementById("securityOverlay").classList.add("hidden");
  } else {
    // Foca no primeiro campo do PIN automaticamente
    document.getElementById("pin1").focus();
  }

  // Carregar dados de movimentações e pedidos
  const isConnected = await testSupabaseConnection();
  if (isConnected) {
    await fetchRealFinances();
    await fetchRealPedidos();
  } else {
    loadDemonstrativeFinances();
    loadDemonstrativePedidos();
  }

  // Redirecionamento de aba baseado nos parâmetros da URL (ex: cliques em notificações)
  const urlParams = new URLSearchParams(window.location.search);
  const statusParam = urlParams.get("status");
  const selectTab = urlParams.get("tab") || (statusParam ? "pedidos" : "movimentacoes");
  if (selectTab === "pedidos") {
     switchFinanceTab("pedidos");
     if (statusParam) {
       document.getElementById("fltPedidoStatus").value = statusParam;
     }
  }
});

// Verifica se a conexão com o Supabase está respondendo
async function testSupabaseConnection() {
  if (!supabase || SUPABASE_URL.includes("YOUR_PROJECT_REF")) return false;
  try {
    const { data, error } = await supabase.from("financeiro").select("id").limit(1);
    return error ? false : true;
  } catch (e) {
    return false;
  }
}

// Carregar Configurações de Segurança
async function loadSecuritySettings() {
  const isConnected = await testSupabaseConnection();
  if (isConnected) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("configuracoes_chat")
          .select("senha_financeira, senha_financeira_ativa")
          .eq("cartomante_id", user.id)
          .single();
        
        if (data) {
          securityConfig.pin_ativo = data.senha_financeira_ativa;
          securityConfig.pin = data.senha_financeira || "1234";
        }
      }
    } catch (e) {
      console.warn("Erro ao buscar configurações no Supabase, usando backup local.", e);
    }
  } else {
    // Backup em LocalStorage
    const stored = localStorage.getItem("cartomante_finance_security");
    if (stored) {
      securityConfig = JSON.parse(stored);
    }
  }

  updateSecurityUI();
}

function updateSecurityUI() {
  const label = document.getElementById("lblLockStatus");
  if (label) {
    label.innerHTML = `Proteção: <strong style="color:${securityConfig.pin_ativo ? '#2ec4b6' : '#e63946'}">${securityConfig.pin_ativo ? 'Ativada' : 'Desativada'}</strong>`;
  }
}

// ==========================================================================
// CONTROLES DE DIGITAÇÃO E VALIDAÇÃO DO PIN (PADLOCK OVERLAY)
// ==========================================================================
function handlePinKeyUp(current, nextId) {
  if (current.value.length >= 1) {
    document.getElementById(nextId).focus();
  }
}

function handlePinKeyDown(event, prevId) {
  if (event.key === "Backspace" && event.target.value.length === 0) {
    document.getElementById(prevId).focus();
  }
}

function handlePinFinal(current) {
  if (current.value.length >= 1) {
    verifyFinancialPin();
  }
}

// Confirma a senha de acesso financeiro
async function verifyFinancialPin() {
  const p1 = document.getElementById("pin1").value;
  const p2 = document.getElementById("pin2").value;
  const p3 = document.getElementById("pin3").value;
  const p4 = document.getElementById("pin4").value;

  const enteredPin = p1 + p2 + p3 + p4;

  if (enteredPin === securityConfig.pin) {
    // Efeito de desbloqueio elegante
    const overlay = document.getElementById("securityOverlay");
    overlay.style.transition = "all 0.6s cubic-bezier(0.25, 0.8, 0.25, 1)";
    overlay.style.opacity = "0";
    overlay.style.transform = "scale(1.1)";
    
    setTimeout(() => {
      overlay.classList.add("hidden");
    }, 600);
  } else {
    // Feedback de erro (piscar campos em vermelho)
    const inputs = document.querySelectorAll(".pin-input");
    inputs.forEach(inp => {
      inp.style.borderColor = "#e63946";
      inp.style.boxShadow = "0 0 10px rgba(230, 57, 70, 0.5)";
      inp.value = "";
    });

    setTimeout(() => {
      inputs.forEach(inp => {
        inp.style.borderColor = "var(--card-border)";
        inp.style.boxShadow = "none";
      });
      document.getElementById("pin1").focus();
    }, 800);
  }
}

// ==========================================================================
// CARREGAMENTO DE TRANSACÕES (REAL VS DEMONSTRATIVO)
// ==========================================================================
function loadDemonstrativeFinances() {
  // Carrega movimentações salvas localmente
  const stored = localStorage.getItem("cartomante_finances_db");
  if (stored) {
    financeiroData = JSON.parse(stored);
  } else {
    financeiroData = MOCK_INITIAL_FINANCES;
    localStorage.setItem("cartomante_finances_db", JSON.stringify(financeiroData));
  }

  // Preencher dropdown de clientes na listagem
  populateClientsDropdown();
  
  // Executar cálculos e renderizar
  applyFilters();
}

async function fetchRealFinances() {
  const { data, error } = await supabase
    .from("financeiro")
    .select(`
      *,
      clientes (
        id,
        nome_completo
      )
    `)
    .order("data_registro", { ascending: false });

  if (error) {
    console.error("Erro ao carregar movimentações do Supabase:", error);
    loadDemonstrativeFinances();
    return;
  }

  financeiroData = data.map(tx => ({
    id: tx.id,
    cliente_id: tx.cliente_id,
    cliente_nome: tx.clientes ? tx.clientes.nome_completo : "Nenhuma",
    tipo: tx.tipo,
    categoria: tx.categoria,
    valor: Number(tx.valor),
    status: tx.status,
    origem: tx.origem,
    descricao: tx.descricao,
    data_registro: tx.data_registro
  }));

  populateClientsDropdown();
  applyFilters();
}

// Preenche a lista de consulentes únicos
function populateClientsDropdown() {
  const clientFilterSelect = document.getElementById("fltCliente");
  const formClientSelect = document.getElementById("txCliente");
  if (!clientFilterSelect || !formClientSelect) return;

  // Extrair nomes únicos de clientes das transações
  const clientMap = {};
  financeiroData.forEach(tx => {
    if (tx.cliente_id && tx.cliente_nome && tx.cliente_nome !== "Nenhuma") {
      clientMap[tx.cliente_id] = tx.cliente_nome;
    }
  });

  // Preencher dropdowns
  let optionsHTML = '<option value="">Todos os Consulentes</option>';
  let formOptionsHTML = '<option value="">Nenhuma</option>';

  for (const [id, nome] of Object.entries(clientMap)) {
    optionsHTML += `<option value="${id}">${nome}</option>`;
    formOptionsHTML += `<option value="${id}">${nome}</option>`;
  }

  clientFilterSelect.innerHTML = optionsHTML;
  formClientSelect.innerHTML = formOptionsHTML;
}

// ==========================================================================
// CÁLCULOS DO FINANCEIRO E ATUALIZAÇÃO DO DASHBOARD
// ==========================================================================
function updateDashboardMetrics() {
  let receitaMes = 0;
  let receitaSemana = 0;
  let receitaDia = 0;
  let despesas = 0;
  let lucroLiquido = 0;
  let pendentes = 0;

  const now = new Date();
  
  // Datas limites para filtros diários, semanais e mensais
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Início da semana (Domingo)
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  financeiroData.forEach(tx => {
    const value = Number(tx.valor);
    const txDate = new Date(tx.data_registro);

    // Soma pagamentos pendentes (não compensados ainda)
    if (tx.status === "pendente") {
      if (tx.tipo === "entrada") {
        pendentes += value;
      }
      return; // Pendentes não entram no faturamento recebido de imediato
    }

    if (tx.status === "cancelado") return;

    if (tx.tipo === "entrada") {
      // Receita do Mês
      if (txDate >= startOfMonth) {
        receitaMes += value;
      }
      // Receita da Semana
      if (txDate >= startOfWeek) {
        receitaSemana += value;
      }
      // Receita do Dia
      if (txDate >= startOfDay) {
        receitaDia += value;
      }
    } else if (tx.tipo === "saida") {
      // Despesas (Mês corrente)
      if (txDate >= startOfMonth) {
        despesas += value;
      }
    }
  });

  // Lucro Líquido = Receita do Mês - Despesas do Mês
  lucroLiquido = receitaMes - despesas;

  // Formatadores
  const fmt = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  document.getElementById("statsReceitaMes").innerText = fmt(receitaMes);
  document.getElementById("statsReceitaSemana").innerText = fmt(receitaSemana);
  document.getElementById("statsReceitaDia").innerText = fmt(receitaDia);
  document.getElementById("statsDespesas").innerText = fmt(despesas);
  document.getElementById("statsLucroLiquido").innerText = fmt(lucroLiquido);
  document.getElementById("statsPendentes").innerText = fmt(pendentes);

  // Alterações de porcentagens dinâmicas
  document.getElementById("statsSubLucro").innerHTML = `Retorno líquido de <strong>${receitaMes > 0 ? Math.round((lucroLiquido / receitaMes) * 100) : 0}%</strong>`;
}

// ==========================================================================
// FILTROS AVANÇADOS E TABELA DE LANÇAMENTOS
// ==========================================================================
function applyFilters() {
  const clientFilter = document.getElementById("fltCliente").value;
  const catFilter = document.getElementById("fltCategoria").value;
  const statusFilter = document.getElementById("fltStatus").value;
  const periodFilter = document.getElementById("fltPeriodo").value;

  const now = new Date();

  filteredData = financeiroData.filter(tx => {
    // 1. Filtro de Cliente
    if (clientFilter && tx.cliente_id !== clientFilter) return false;

    // 2. Filtro de Categoria
    if (catFilter && tx.categoria !== catFilter) return false;

    // 3. Filtro de Status
    if (statusFilter && tx.status !== statusFilter) return false;

    // 4. Filtro de Período
    const txDate = new Date(tx.data_registro);
    if (periodFilter === "diario") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (txDate < start) return false;
    } else if (periodFilter === "semanal") {
      const start = new Date(now);
      start.setDate(now.getDate() - 7);
      if (txDate < start) return false;
    } else if (periodFilter === "mensal") {
      const start = new Date(now);
      start.setDate(now.getDate() - 30);
      if (txDate < start) return false;
    }

    return true;
  });

  // Atualizar contadores do Dashboard
  updateDashboardMetrics();

  // Renderizar tabela e gráficos
  renderTransactionsTable();
  renderRevenueLineChart();
  renderDistributionChart();
}

function renderTransactionsTable() {
  const tbody = document.getElementById("transactionsTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (filteredData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; padding: 30px; color: var(--text-muted); font-style:italic;">
          ✨ Nenhuma colheita sintonizada nestes filtros.
        </td>
      </tr>
    `;
    return;
  }

  const categoryNameMap = {
    atendimento: "Atendimento",
    pergunta_baralho: "Pergunta ao Baralho",
    servico: "Serviço Especial",
    gasto_pessoal: "Gasto Pessoal",
    plataforma: "Taxas Plataforma",
    outros: "Outros"
  };

  const statusNameMap = {
    pago: "Pago",
    pendente: "Pendente",
    cancelado: "Cancelado",
    reembolsado: "Reembolsado"
  };

  filteredData.forEach(tx => {
    const tr = document.createElement("tr");
    
    const isEntrada = tx.tipo === "entrada";
    const valFmt = tx.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const dateFmt = new Date(tx.data_registro).toLocaleDateString();
    
    const catLabel = categoryNameMap[tx.categoria] || tx.categoria;
    const statusLabel = statusNameMap[tx.status] || tx.status;
    const clientName = tx.cliente_nome || "Nenhuma";
    const descText = tx.descricao || catLabel;

    tr.innerHTML = `
      <td>
        <div class="trans-desc-wrapper">
          <div class="trans-icon-circle ${tx.tipo}">
            <i class="fas ${isEntrada ? 'fa-arrow-up' : 'fa-arrow-down'}"></i>
          </div>
          <div>
            <div style="font-weight:600; color:var(--text-primary);">${descText}</div>
            <div style="font-size:0.7rem; color:var(--text-muted);">${catLabel}</div>
          </div>
        </div>
      </td>
      <td>
        <i class="fas fa-user-circle" style="color:var(--text-muted); margin-right:4px;"></i> ${clientName}
      </td>
      <td>${dateFmt}</td>
      <td>
        <span class="status-badge ${tx.status}">${statusLabel}</span>
      </td>
      <td>
        <span class="trans-value-text ${tx.tipo}">
          ${isEntrada ? '+' : '-'} ${valFmt}
        </span>
      </td>
      <td>
        <div class="trans-actions" style="justify-content:center;">
          <button class="btn-trans-edit" onclick="editTransaction('${tx.id}')" title="Editar movimentação"><i class="fas fa-edit"></i></button>
          <button class="btn-trans-del" onclick="deleteTransaction('${tx.id}')" title="Excluir movimentação"><i class="fas fa-trash-alt"></i></button>
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

// ==========================================================================
// RENDERIZAÇÃO DE GRÁFICOS DINÂMICOS (VETORIAIS - SVG NATIVO)
// ==========================================================================

// 1. Gráfico de Crescimento Mensal (SVG Line Chart)
function renderRevenueLineChart() {
  const container = document.getElementById("revenueLineChartContainer");
  if (!container) return;

  container.innerHTML = "";

  // Coleta os últimos 6 meses
  const points = MONTHLY_HISTORICAL_REVENUE;
  const width = container.clientWidth || 550;
  const height = 220;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Encontra valores mínimos e máximos para escala do gráfico
  const maxVal = Math.max(...points.map(p => p.valor)) * 1.1; // 10% margem de topo
  const minVal = 0;

  // Função para converter dados reais em coordenadas da tela (X, Y)
  const getX = (index) => paddingLeft + (index / (points.length - 1)) * chartWidth;
  const getY = (value) => height - paddingBottom - ((value - minVal) / (maxVal - minVal)) * chartHeight;

  // Constrói o caminho de linhas de faturamento do SVG
  let pathD = "";
  let areaD = ""; // Preenchimento por baixo do gráfico (gradiente)

  points.forEach((p, index) => {
    const x = getX(index);
    const y = getY(p.valor);

    if (index === 0) {
      pathD = `M ${x} ${y}`;
      areaD = `M ${x} ${height - paddingBottom} L ${x} ${y}`;
    } else {
      pathD += ` L ${x} ${y}`;
      areaD += ` L ${x} ${y}`;
    }

    if (index === points.length - 1) {
      areaD += ` L ${x} ${height - paddingBottom} Z`;
    }
  });

  // Montar strings de texto para o eixo Y
  let gridLinesHTML = "";
  const ticksY = 4;
  for (let i = 0; i <= ticksY; i++) {
    const val = minVal + (i / ticksY) * (maxVal - minVal);
    const y = getY(val);
    gridLinesHTML += `
      <line x1="${paddingLeft}" y1="${y}" x2="${width - paddingRight}" y2="${y}" stroke="var(--card-border)" stroke-dasharray="3,3" opacity="0.5" />
      <text x="${paddingLeft - 10}" y="${y + 4}" font-size="9" fill="var(--text-muted)" text-anchor="end">R$ ${Math.round(val)}</text>
    `;
  }

  // Montar strings de texto para o eixo X
  let axisXHTML = "";
  points.forEach((p, index) => {
    const x = getX(index);
    axisXHTML += `
      <text x="${x}" y="${height - 10}" font-size="9.5" fill="var(--text-muted)" text-anchor="middle">${p.mes}</text>
      <circle cx="${x}" cy="${getY(p.valor)}" r="4.5" fill="var(--gold-color)" class="chart-dot" fill-opacity="0.8" 
              onclick="showChartTooltip(event, '${p.mes}', ${p.valor})" />
    `;
  });

  // Criar elemento SVG inteiro
  const svgHTML = `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="100%">
      <defs>
        <!-- Gradiente dourado místico para a linha -->
        <linearGradient id="goldLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#C7A27A" />
          <stop offset="50%" stop-color="#E0924B" />
          <stop offset="100%" stop-color="#6E5AAB" />
        </linearGradient>
        <!-- Gradiente de preenchimento glassmorphism abaixo -->
        <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#C7A27A" stop-opacity="0.15" />
          <stop offset="100%" stop-color="#C7A27A" stop-opacity="0.0" />
        </linearGradient>
      </defs>
      
      <!-- Linhas de Grid -->
      ${gridLinesHTML}
      
      <!-- Área preenchida com gradiente -->
      <path d="${areaD}" fill="url(#areaGrad)" />
      
      <!-- Caminho da Linha de Receita -->
      <path d="${pathD}" fill="none" stroke="url(#goldLineGrad)" stroke-width="3" stroke-linecap="round" />
      
      <!-- Eixos X e Nós interativos -->
      ${axisXHTML}
    </svg>
  `;

  container.innerHTML = svgHTML;
}

function showChartTooltip(event, label, val) {
  const tooltip = document.getElementById("chartTooltip");
  if (!tooltip) return;

  tooltip.innerHTML = `<strong>${label}</strong>: ${val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`;
  tooltip.style.display = "block";
  tooltip.style.left = `${event.pageX + 10}px`;
  tooltip.style.top = `${event.pageY - 40}px`;

  // Auto esconder em 3 segundos
  setTimeout(() => {
    tooltip.style.display = "none";
  }, 3000);
}

// 2. Gráfico de Categorias e Distribuição (Horizontal Progress)
function renderDistributionChart() {
  const container = document.getElementById("distributionChartContainer");
  if (!container) return;

  container.innerHTML = "";

  // Agrega valores por categoria de transação
  const catSums = {
    atendimento: 0,
    pergunta_baralho: 0,
    servico: 0,
    gasto_pessoal: 0,
    plataforma: 0,
    outros: 0
  };

  let totalEntradas = 0;

  financeiroData.forEach(tx => {
    if (tx.status === "cancelado") return;
    if (tx.tipo === "entrada") {
      catSums[tx.categoria] += Number(tx.valor);
      totalEntradas += Number(tx.valor);
    }
  });

  const categoryLabels = {
    atendimento: { label: "Atendimentos", color: "#C7A27A" },
    pergunta_baralho: { label: "Perguntas Baralho", color: "#6E5AAB" },
    servico: { label: "Serviços Especiais", color: "#2EC4B6" },
    outros: { label: "Outros", color: "#E0924B" }
  };

  // Renderizar barras horizontais premium no container para exibição estelar
  let barsHTML = '<div style="width:100%; display:flex; flex-direction:column; gap:12px; padding-top:10px;">';

  let hasData = false;

  for (const [key, meta] of Object.entries(categoryLabels)) {
    const sum = catSums[key] || 0;
    const percentage = totalEntradas > 0 ? Math.round((sum / totalEntradas) * 100) : 0;
    if (sum > 0) hasData = true;

    barsHTML += `
      <div>
        <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-secondary); margin-bottom:4px;">
          <span>${meta.label}</span>
          <span style="font-weight:600; color:var(--text-primary);">${sum.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} (${percentage}%)</span>
        </div>
        <div style="width:100%; height:8px; background:rgba(255,255,255,0.03); border-radius:10px; overflow:hidden; border:1px solid var(--card-border);">
          <div style="width:${percentage}%; height:100%; background:${meta.color}; border-radius:10px; box-shadow: 0 0 8px ${meta.color};"></div>
        </div>
      </div>
    `;
  }

  barsHTML += "</div>";

  if (!hasData) {
    container.innerHTML = `
      <div class="chat-empty-state">
        <i class="fas fa-chart-pie"></i>
        <p>Aguardando registros de faturamento para desenhar o mapa de distribuição.</p>
      </div>
    `;
  } else {
    container.innerHTML = barsHTML;
  }
}

// ==========================================================================
// FORMULÁRIO DE LANÇAMENTO MANUAL (MODAL DE CADASTRO E EDIÇÃO)
// ==========================================================================
function openTransactionModal() {
  document.getElementById("modalTxTitle").innerHTML = `<i class="fas fa-plus"></i> Novo Lançamento`;
  document.getElementById("frmTransaction").reset();
  document.getElementById("txId").value = "";
  
  // Set data padrão para hoje
  const now = new Date();
  document.getElementById("txData").value = now.toISOString().split("T")[0];

  onTxTipoChanged();
  document.getElementById("transactionModal").classList.add("active");
}

function closeTransactionModal() {
  document.getElementById("transactionModal").classList.remove("active");
}

// Trata mudança do tipo de fluxo (saída não possui cliente associado)
function onTxTipoChanged() {
  const tipo = document.getElementById("txTipo").value;
  const clienteGroup = document.getElementById("txClienteGroup");
  const catSelect = document.getElementById("txCategoria");

  if (tipo === "saida") {
    clienteGroup.style.display = "none";
    document.getElementById("txCliente").value = "";
    
    // Selecionar despesa por padrão
    catSelect.value = "gasto_pessoal";
  } else {
    clienteGroup.style.display = "block";
    catSelect.value = "atendimento";
  }
}

// Submissão do lançamento financeiro (Criar ou Editar)
async function handleTransactionSubmit(event) {
  event.preventDefault();

  const id = document.getElementById("txId").value;
  const tipo = document.getElementById("txTipo").value;
  const categoria = document.getElementById("txCategoria").value;
  const valor = parseFloat(document.getElementById("txValor").value);
  const data = document.getElementById("txData").value;
  const clienteId = document.getElementById("txCliente").value;
  const status = document.getElementById("txStatus").value;
  const descricao = document.getElementById("txDescricao").value.trim();

  if (isNaN(valor) || valor <= 0) return;

  // Busca o nome do cliente correspondente
  let clienteNome = "Nenhuma";
  if (clienteId) {
    const clientSelect = document.getElementById("txCliente");
    clienteNome = clientSelect.options[clientSelect.selectedIndex].text;
  }

  const isConnected = await testSupabaseConnection();

  const txData = {
    cartomante_id: isConnected ? (await getCartomanteId()) : "mock-cartomante",
    cliente_id: clienteId || null,
    tipo,
    categoria,
    valor,
    status,
    origem: "manual",
    descricao,
    data_registro: new Date(data).toISOString()
  };

  if (isConnected) {
    if (id) {
      // Editar Supabase
      const { error } = await supabase
        .from("financeiro")
        .update(txData)
        .eq("id", id);
      
      if (error) console.error("Erro ao editar no Supabase:", error);
    } else {
      // Criar Supabase
      const { error } = await supabase
        .from("financeiro")
        .insert([txData]);

      if (error) console.error("Erro ao inserir no Supabase:", error);
    }
    
    await fetchRealFinances();
  } else {
    // Editar/Criar local
    if (id) {
      const idx = financeiroData.findIndex(tx => tx.id === id);
      if (idx !== -1) {
        financeiroData[idx] = {
          ...financeiroData[idx],
          ...txData,
          cliente_nome: clienteNome
        };
      }
    } else {
      financeiroData.push({
        id: `tx-manual-${Date.now()}`,
        ...txData,
        cliente_nome: clienteNome
      });
    }

    localStorage.setItem("cartomante_finances_db", JSON.stringify(financeiroData));
    populateClientsDropdown();
    applyFilters();
  }

  closeTransactionModal();
}

async function getCartomanteId() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
  } catch (e) {
    return null;
  }
}

// Excluir Movimentação
async function deleteTransaction(txId) {
  const confirmDel = confirm("Deseja realmente apagar esta movimentação financeira de forma definitiva?");
  if (!confirmDel) return;

  const isConnected = await testSupabaseConnection();

  if (isConnected) {
    const { error } = await supabase
      .from("financeiro")
      .delete()
      .eq("id", txId);

    if (error) {
      console.error("Erro ao deletar no Supabase:", error);
      return;
    }
    await fetchRealFinances();
  } else {
    // Local
    financeiroData = financeiroData.filter(tx => tx.id !== txId);
    localStorage.setItem("cartomante_finances_db", JSON.stringify(financeiroData));
    populateClientsDropdown();
    applyFilters();
  }
}

// Editar Movimentação (Preenche formulário no modal)
function editTransaction(txId) {
  const tx = financeiroData.find(t => t.id === txId);
  if (!tx) return;

  document.getElementById("modalTxTitle").innerHTML = `<i class="fas fa-edit"></i> Editar Lançamento`;
  document.getElementById("txId").value = tx.id;
  document.getElementById("txTipo").value = tx.tipo;
  document.getElementById("txCategoria").value = tx.categoria;
  document.getElementById("txValor").value = tx.valor;
  
  // Format data para YYYY-MM-DD
  const dt = new Date(tx.data_registro);
  document.getElementById("txData").value = dt.toISOString().split("T")[0];
  
  onTxTipoChanged();
  document.getElementById("txCliente").value = tx.cliente_id || "";
  document.getElementById("txStatus").value = tx.status;
  document.getElementById("txDescricao").value = tx.descricao || "";

  document.getElementById("transactionModal").classList.add("active");
}

// ==========================================================================
// CONFIGURAÇÕES DO PIN E SEGURANÇA SECUNDÁRIA
// ==========================================================================
function openPinConfigModal() {
  document.getElementById("cfgPinAtivo").checked = securityConfig.pin_ativo;
  document.getElementById("cfgNovoPin").value = securityConfig.pin;
  onPinActiveToggle();
  
  document.getElementById("pinConfigModal").classList.add("active");
}

function closePinConfigModal() {
  document.getElementById("pinConfigModal").classList.remove("active");
}

function onPinActiveToggle() {
  const checked = document.getElementById("cfgPinAtivo").checked;
  const fields = document.getElementById("cfgPinFields");
  if (checked) {
    fields.style.display = "flex";
  } else {
    fields.style.display = "none";
  }
}

async function handlePinConfigSubmit(event) {
  event.preventDefault();

  const ativo = document.getElementById("cfgPinAtivo").checked;
  const pinVal = document.getElementById("cfgNovoPin").value;

  if (ativo && (!pinVal || pinVal.length !== 4 || isNaN(pinVal))) {
    alert("Por favor, defina um PIN numérico composto por exatamente 4 dígitos.");
    return;
  }

  securityConfig.pin_ativo = ativo;
  if (ativo) {
    securityConfig.pin = pinVal;
  }

  const isConnected = await testSupabaseConnection();

  if (isConnected) {
    const user_id = await getCartomanteId();
    const { error } = await supabase
      .from("configuracoes_chat")
      .update({
        senha_financeira: securityConfig.pin,
        senha_financeira_ativa: securityConfig.pin_ativo,
        updated_at: new Date().toISOString()
      })
      .eq("cartomante_id", user_id);

    if (error) console.error("Erro ao salvar segurança no Supabase:", error);
  } else {
    // Gravar local
    localStorage.setItem("cartomante_finance_security", JSON.stringify(securityConfig));
  }

  updateSecurityUI();
  closePinConfigModal();
  alert("Configurações de segurança financeira gravadas com sucesso.");
}

// ==========================================================================
// GESTÃO FINANCEIRA E ADMINISTRATIVA DE PEDIDOS DE SERVIÇOS (FLUXO MANUAL)
// ==========================================================================
let pedidosData = [];
let filteredPedidos = [];
let currentOrderForBlock = null;

const MOCK_INITIAL_PEDIDOS = [
  {
    id: "ord-1",
    cliente_id: "c1-uuid-helena",
    cliente_nome: "Helena de Souza",
    cartomante_id: "cartomante-luana",
    servico_id: "srv-1",
    servico_titulo: "Tiragem Completa de Amor",
    servico_preco: 80.00,
    meio_pagamento: "PIX",
    status: "pagamento_informado",
    created_at: new Date(Date.now() - 3600000 * 5).toISOString()
  },
  {
    id: "ord-2",
    cliente_id: "c2-uuid-gabriel",
    cliente_nome: "Gabriel Medeiros",
    cartomante_id: "cartomante-luana",
    servico_id: "srv-2",
    servico_titulo: "Ritual de Abertura de Caminhos Financeiros",
    servico_preco: 120.00,
    meio_pagamento: "Transferência",
    status: "aguardando_pagamento",
    created_at: new Date(Date.now() - 3600000 * 24).toISOString()
  }
];

window.switchFinanceTab = function(tabName) {
  const btnMov = document.getElementById("tab-movimentacoes-btn");
  const btnPed = document.getElementById("tab-pedidos-btn");
  const btnAud = document.getElementById("tab-auditoria-btn");
  const panelMov = document.getElementById("panel-movimentacoes");
  const panelPed = document.getElementById("panel-pedidos");
  const panelAud = document.getElementById("panel-auditoria");

  if (!panelMov || !panelPed) return;

  btnMov.classList.remove("active");
  btnPed.classList.remove("active");
  if (btnAud) btnAud.classList.remove("active");
  
  panelMov.classList.add("hidden");
  panelPed.classList.add("hidden");
  if (panelAud) panelAud.classList.add("hidden");

  btnMov.style.color = "var(--text-secondary)";
  btnPed.style.color = "var(--text-secondary)";
  if (btnAud) btnAud.style.color = "var(--text-secondary)";

  if (tabName === "movimentacoes") {
    btnMov.classList.add("active");
    btnMov.style.color = "var(--gold-color)";
    panelMov.classList.remove("hidden");
  } else if (tabName === "pedidos") {
    btnPed.classList.add("active");
    btnPed.style.color = "var(--gold-color)";
    panelPed.classList.remove("hidden");
    applyPedidoFilters();
  } else if (tabName === "auditoria") {
    if (btnAud) {
      btnAud.classList.add("active");
      btnAud.style.color = "var(--gold-color)";
    }
    if (panelAud) {
      panelAud.classList.remove("hidden");
    }
    loadAuditoriaTab();
  }
};

async function getCartomanteId() {
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    return user ? user.id : "cartomante-luana";
  }
  return "cartomante-luana";
}

async function fetchRealPedidos() {
  const isConnected = await testSupabaseConnection();
  if (!isConnected) return;

  try {
    const user_id = await getCartomanteId();
    if (!user_id) return;

    const { data, error } = await supabase
      .from("pedidos_servicos")
      .select(`
        *,
        clientes (
          id,
          nome_completo
        )
      `)
      .eq("cartomante_id", user_id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      pedidosData = data.map(o => ({
        id: o.id,
        cliente_id: o.cliente_id,
        cliente_nome: o.clientes ? o.clientes.nome_completo : "Consulente",
        servico_id: o.servico_id,
        servico_titulo: o.servico_titulo,
        servico_preco: Number(o.servico_preco),
        meio_pagamento: o.meio_pagamento,
        status: o.status,
        created_at: o.created_at,
        cartomante_id: o.cartomante_id,
        nota_cliente: o.nota_cliente,
        hash_transacao: o.hash_transacao,
        comprovante_url: o.comprovante_url,
        data_envio_pagamento: o.data_envio_pagamento
      }));
    }
  } catch (e) {
    console.error("Erro ao carregar pedidos reais:", e);
  }
}

function loadDemonstrativePedidos() {
  const stored = localStorage.getItem("cartomante_pedidos_servicos");
  if (stored) {
    pedidosData = JSON.parse(stored);
  } else {
    pedidosData = MOCK_INITIAL_PEDIDOS;
    localStorage.setItem("cartomante_pedidos_servicos", JSON.stringify(pedidosData));
  }
}

window.applyPedidoFilters = function() {
  const statusFilter = document.getElementById("fltPedidoStatus").value;

  filteredPedidos = pedidosData.filter(o => {
    if (statusFilter && o.status !== statusFilter) return false;
    return true;
  });

  renderPedidosTable();
};

function renderPedidosTable() {
  const tbody = document.getElementById("pedidosTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (filteredPedidos.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; padding: 30px; color: var(--text-muted); font-style:italic;">
          ✨ Nenhum pedido de serviço sintonizado nestes filtros.
        </td>
      </tr>
    `;
    return;
  }

  const statusLabels = {
    "aguardando_pagamento": "Aguardando pagamento",
    "pagamento_informado": "Pagamento informado",
    "pagamento_confirmado": "Confirmado",
    "pagamento_pendente": "Pendente",
    "bloqueado_temporariamente": "Bloqueado",
    "cancelado": "Cancelado"
  };

  const statusColors = {
    "aguardando_pagamento": "#f1c40f",
    "pagamento_informado": "#3498db",
    "pagamento_confirmado": "#2ecc71",
    "pagamento_pendente": "#e63946",
    "bloqueado_temporariamente": "#ff8888",
    "cancelado": "#95a5a6"
  };

  filteredPedidos.forEach(o => {
    const tr = document.createElement("tr");
    const valFmt = Number(o.servico_preco).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const dateFmt = new Date(o.created_at).toLocaleDateString('pt-BR') + " " + new Date(o.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const labelStatus = statusLabels[o.status] || o.status;
    const colorStatus = statusColors[o.status] || "#fff";

    tr.innerHTML = `
      <td>
        <i class="fas fa-user-circle" style="color:var(--text-muted); margin-right:4px;"></i> ${o.cliente_nome}
      </td>
      <td style="font-weight:600; color:var(--text-primary);">${o.servico_titulo}</td>
      <td style="font-weight:bold; color:var(--gold-color);">${valFmt}</td>
      <td>
        <span class="status-badge" style="background:${colorStatus}15; color:${colorStatus}; border: 1px solid ${colorStatus}30; padding: 3px 8px; border-radius: 4px; font-size: 0.72rem; font-weight:600; text-transform:uppercase;">${labelStatus}</span>
      </td>
      <td>${dateFmt}</td>
      <td>
        <div class="trans-actions" style="justify-content:center; gap: 8px;">
          <button class="glass-button" style="padding: 4px 10px; font-size: 0.72rem; border-color: var(--gold-color);" onclick="openOrderDetail('${o.id}')" title="Ver Detalhes do Pedido">
            <i class="fas fa-eye"></i> Detalhes
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.openOrderDetail = async function(orderId) {
  const o = pedidosData.find(x => x.id === orderId);
  if (!o) return;

  currentOrderForBlock = o;

  document.getElementById("detailPedidoId").value = o.id;
  document.getElementById("detailClienteId").value = o.cliente_id;
  document.getElementById("lblDetailCliente").innerText = o.cliente_nome;
  document.getElementById("lblDetailServico").innerText = o.servico_titulo;
  document.getElementById("lblDetailValor").innerText = Number(o.servico_preco).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  document.getElementById("lblDetailMeio").innerText = o.meio_pagamento || "PIX";
  
  const statusLabels = {
    "aguardando_pagamento": "Aguardando pagamento",
    "pagamento_informado": "Pagamento informado",
    "pagamento_confirmado": "Confirmado",
    "pagamento_pendente": "Pendente",
    "bloqueado_temporariamente": "Bloqueado",
    "cancelado": "Cancelado"
  };
  const statusColors = {
    "aguardando_pagamento": "#f1c40f",
    "pagamento_informado": "#3498db",
    "pagamento_confirmado": "#2ecc71",
    "pagamento_pendente": "#e63946",
    "bloqueado_temporariamente": "#ff8888",
    "cancelado": "#95a5a6"
  };
  const lblStatus = document.getElementById("lblDetailStatus");
  lblStatus.innerText = statusLabels[o.status] || o.status;
  lblStatus.style.color = statusColors[o.status] || "#fff";

  document.getElementById("lblDetailData").innerText = new Date(o.created_at).toLocaleDateString('pt-BR') + " às " + new Date(o.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // Preencher dados de defesa do cliente
  const defenseSection = document.getElementById("detailDefenseSection");
  const lblNota = document.getElementById("lblDetailNotaCliente");
  const lblHash = document.getElementById("lblDetailHashTransacao");
  const lblComp = document.getElementById("lblDetailComprovanteUrl");
  
  if (defenseSection && lblNota && lblHash && lblComp) {
    if (o.nota_cliente || o.hash_transacao || o.comprovante_url) {
      defenseSection.style.display = "block";
      lblNota.innerText = o.nota_cliente || "Nenhuma";
      lblHash.innerText = o.hash_transacao || "Não informado";
      
      if (o.comprovante_url) {
        lblComp.innerHTML = `<a href="${o.comprovante_url}" target="_blank" class="gold-link" style="color:var(--gold-color); text-decoration:underline;"><i class="fas fa-external-link-alt"></i> Visualizar Comprovante</a>`;
      } else {
        lblComp.innerText = "Não anexado";
      }
    } else {
      defenseSection.style.display = "none";
    }
  }

  const actionContainer = document.getElementById("orderActionsContainer");
  actionContainer.innerHTML = "";

  const isConnected = supabase ? await testSupabaseConnection() : false;
  
  let isBlocked = false;
  if (isConnected) {
    try {
      const { data } = await supabase
        .from("cartomante_clientes")
        .select("status, bloqueado")
        .eq("cartomante_id", o.cartomante_id)
        .eq("cliente_id", o.cliente_id)
        .maybeSingle();
      if (data) isBlocked = data.status === "pendente" && data.bloqueado;
    } catch(e){}
  } else {
    const vinculos = JSON.parse(localStorage.getItem("cartomante_clientes_vinculos") || "[]");
    const match = vinculos.find(v => v.cartomante_id === o.cartomante_id && v.cliente_id === o.cliente_id);
    if (match) isBlocked = match.status === "pendente" && match.bloqueado;
  }

  if (o.status !== "pagamento_confirmado" && o.status !== "cancelado") {
    actionContainer.innerHTML += `
      <button onclick="confirmarPagamentoPedido('${o.id}')" class="glass-button" style="border-color:#2ecc71; color:#2ecc71; justify-content:center; padding:10px; font-weight:600;">
        <i class="fas fa-check"></i> Sim, pagamento chegou
      </button>
    `;
    
    if (o.status !== "pagamento_pendente" && o.status !== "bloqueado_temporariamente") {
      actionContainer.innerHTML += `
        <button onclick="marcarPagamentoNaoRecebido('${o.id}')" class="glass-button" style="border-color:#e63946; color:#e63946; justify-content:center; padding:10px;">
          <i class="fas fa-times"></i> Não, pagamento não chegou
        </button>
      `;
    }
  }

  if (o.status === "pagamento_pendente" || o.status === "bloqueado_temporariamente") {
    if (isBlocked) {
      actionContainer.innerHTML += `
        <button onclick="removerBloqueioCliente('${o.id}', '${o.cliente_id}')" class="glass-button" style="border-color:#f1c40f; color:#f1c40f; justify-content:center; padding:10px;">
          <i class="fas fa-unlock"></i> Remover Bloqueio do Consulente
        </button>
      `;
    } else {
      actionContainer.innerHTML += `
        <button onclick="bloquearCliente('${o.id}', '${o.cliente_id}')" class="glass-button" style="border-color:#ff8888; color:#ff8888; justify-content:center; padding:10px;">
          <i class="fas fa-ban"></i> Bloquear Consulente Temporariamente
        </button>
      `;
    }
  }

  document.getElementById("orderDetailModal").style.display = "block";
};

window.closeOrderDetailModal = function() {
  document.getElementById("orderDetailModal").style.display = "none";
  currentOrderForBlock = null;
};

window.confirmarPagamentoPedido = async function(pedidoId) {
  if (!confirm("Confirmar que o pagamento chegou de forma integral e compensado?")) return;

  const o = pedidosData.find(x => x.id === pedidoId);
  if (!o) return;

  const isConnected = supabase ? await testSupabaseConnection() : false;
  
  if (isConnected) {
    try {
      const user_id = await getCartomanteId();
      if (!user_id) return;

      await supabase.from("pedidos_servicos").update({ status: "pagamento_confirmado", updated_at: new Date().toISOString() }).eq("id", pedidoId);
      
      await supabase.from("financeiro").insert({
        cartomante_id: user_id,
        cliente_id: o.cliente_id,
        tipo: "entrada",
        categoria: "servico",
        valor: o.servico_preco,
        status: "pago",
        origem: "automatico",
        referencia_id: pedidoId,
        descricao: `Contratação de Serviço: ${o.servico_titulo}`
      });

      await supabase.from("cartomante_clientes").update({ status: "ativo", bloqueado: false }).eq("cartomante_id", user_id).eq("cliente_id", o.cliente_id);

      const { data: clientObj } = await supabase.from("clientes").select("user_id").eq("id", o.cliente_id).maybeSingle();
      if (clientObj && clientObj.user_id) {
        await supabase.from("notificacoes").insert({
          user_id: clientObj.user_id,
          titulo: "Pagamento Confirmado!",
          mensagem: `Seu pagamento do serviço ${o.servico_titulo} foi confirmado pela cartomante.`,
          tipo: "pagamento",
          lida: false
        });
      }
    } catch(e) {
      console.error(e);
    }
  } else {
    const idx = pedidosData.findIndex(x => x.id === pedidoId);
    if (idx !== -1) {
      pedidosData[idx].status = "pagamento_confirmado";
      pedidosData[idx].updated_at = new Date().toISOString();
      localStorage.setItem("cartomante_pedidos_servicos", JSON.stringify(pedidosData));
    }

    const finances = JSON.parse(localStorage.getItem("cartomante_finances_db") || "[]");
    finances.push({
      id: "tx-local-" + Date.now(),
      cliente_id: o.cliente_id,
      cliente_nome: o.cliente_nome,
      tipo: "entrada",
      categoria: "servico",
      valor: o.servico_preco,
      status: "pago",
      origem: "automatico",
      referencia_id: pedidoId,
      descricao: `Contratação de Serviço: ${o.servico_titulo}`,
      data_registro: new Date().toISOString()
    });
    localStorage.setItem("cartomante_finances_db", JSON.stringify(finances));

    const vinculos = JSON.parse(localStorage.getItem("cartomante_clientes_vinculos") || "[]");
    const vIdx = vinculos.findIndex(v => v.cartomante_id === o.cartomante_id && v.cliente_id === o.cliente_id);
    if (vIdx !== -1) {
      vinculos[vIdx].status = "ativo";
      vinculos[vIdx].bloqueado = false;
      localStorage.setItem("cartomante_clientes_vinculos", JSON.stringify(vinculos));
    }

    const notifs = JSON.parse(localStorage.getItem("cartomante_notificacoes") || "[]");
    notifs.unshift({
      id: "notif-local-" + Date.now(),
      user_id: o.cliente_id,
      titulo: "Pagamento Confirmado!",
      mensagem: `Seu pagamento do serviço ${o.servico_titulo} foi confirmado pela cartomante.`,
      tipo: "pagamento",
      lida: false,
      created_at: new Date().toISOString()
    });
    localStorage.setItem("cartomante_notificacoes", JSON.stringify(notifs));
  }

  const user_id = isConnected ? (await getCartomanteId()) : "cartomante-luana";
  if (typeof window.logSecurityAction === "function") {
    await window.logSecurityAction(
      user_id,
      o.cliente_id,
      "Aprovação de Pagamento",
      `Pagamento do serviço "${o.servico_titulo}" de R$ ${Number(o.servico_preco).toFixed(2).replace('.', ',')} foi confirmado pela cartomante.`,
      "pagamento_confirmado",
      !!o.comprovante_url,
      "Pagamento chegou integralmente"
    );
  }

  alert("Pagamento confirmado com sucesso! O serviço foi liberado para atendimento.");
  closeOrderDetailModal();
  
  if (isConnected) {
    await fetchRealFinances();
    await fetchRealPedidos();
  } else {
    loadDemonstrativeFinances();
    loadDemonstrativePedidos();
  }
};

window.marcarPagamentoNaoRecebido = async function(pedidoId) {
  const o = pedidosData.find(x => x.id === pedidoId);
  if (!o) return;

  const isConnected = supabase ? await testSupabaseConnection() : false;

  if (isConnected) {
    try {
      const user_id = await getCartomanteId();
      if (!user_id) return;

      await supabase.from("pedidos_servicos").update({ status: "pagamento_pendente", updated_at: new Date().toISOString() }).eq("id", pedidoId);
      
      await supabase.from("cartomante_clientes").update({ status: "pendente" }).eq("cartomante_id", user_id).eq("cliente_id", o.cliente_id);

    } catch (e) {
      console.error(e);
    }
  } else {
    const idx = pedidosData.findIndex(x => x.id === pedidoId);
    if (idx !== -1) {
      pedidosData[idx].status = "pagamento_pendente";
      pedidosData[idx].updated_at = new Date().toISOString();
      localStorage.setItem("cartomante_pedidos_servicos", JSON.stringify(pedidosData));
    }

    const vinculos = JSON.parse(localStorage.getItem("cartomante_clientes_vinculos") || "[]");
    const vIdx = vinculos.findIndex(v => v.cartomante_id === o.cartomante_id && v.cliente_id === o.cliente_id);
    if (vIdx !== -1) {
      vinculos[vIdx].status = "pendente";
      localStorage.setItem("cartomante_clientes_vinculos", JSON.stringify(vinculos));
    }
  }

  closeOrderDetailModal();
  document.getElementById("confirmBlockModal").style.display = "block";
};

document.addEventListener("DOMContentLoaded", () => {
  const yesBtn = document.getElementById("btnConfirmBlockYes");
  const noBtn = document.getElementById("btnConfirmBlockNo");
  
  if (yesBtn) {
    yesBtn.onclick = async () => {
      if (!currentOrderForBlock) return;
      await processarBloqueioCliente(currentOrderForBlock.id, currentOrderForBlock.cliente_id, true);
      document.getElementById("confirmBlockModal").style.display = "none";
    };
  }

  if (noBtn) {
    noBtn.onclick = async () => {
      if (!currentOrderForBlock) return;
      await processarBloqueioCliente(currentOrderForBlock.id, currentOrderForBlock.cliente_id, false);
      document.getElementById("confirmBlockModal").style.display = "none";
    };
  }
});

async function processarBloqueioCliente(pedidoId, clienteId, bloquear) {
  const isConnected = supabase ? await testSupabaseConnection() : false;
  
  if (isConnected) {
    try {
      const user_id = await getCartomanteId();
      if (!user_id) return;

      if (bloquear) {
        await supabase.from("pedidos_servicos").update({ status: "bloqueado_temporariamente", updated_at: new Date().toISOString() }).eq("id", pedidoId);
        await supabase.from("cartomante_clientes").update({ status: "pendente", bloqueado: true }).eq("cartomante_id", user_id).eq("cliente_id", clienteId);
      } else {
        await supabase.from("pedidos_servicos").update({ status: "pagamento_pendente", updated_at: new Date().toISOString() }).eq("id", pedidoId);
        await supabase.from("cartomante_clientes").update({ status: "pendente", bloqueado: false }).eq("cartomante_id", user_id).eq("cliente_id", clienteId);
      }
    } catch(e){
      console.error(e);
    }
  } else {
    const idx = pedidosData.findIndex(x => x.id === pedidoId);
    if (idx !== -1) {
      pedidosData[idx].status = bloquear ? "bloqueado_temporariamente" : "pagamento_pendente";
      pedidosData[idx].updated_at = new Date().toISOString();
      localStorage.setItem("cartomante_pedidos_servicos", JSON.stringify(pedidosData));
    }

    const vinculos = JSON.parse(localStorage.getItem("cartomante_clientes_vinculos") || "[]");
    const vIdx = vinculos.findIndex(v => v.cartomante_id === currentOrderForBlock.cartomante_id && v.cliente_id === clienteId);
    if (vIdx !== -1) {
      vinculos[vIdx].status = "pendente";
      vinculos[vIdx].bloqueado = bloquear;
      localStorage.setItem("cartomante_clientes_vinculos", JSON.stringify(vinculos));
    }
  }

  const user_id = isConnected ? (await getCartomanteId()) : "cartomante-luana";
  const o = pedidosData.find(x => x.id === pedidoId);
  if (typeof window.logSecurityAction === "function" && o) {
    const statusLog = bloquear ? "bloqueado_temporariamente" : "pagamento_pendente";
    const acaoLog = bloquear ? "Recusa com Bloqueio" : "Recusa sem Bloqueio";
    const detalhesLog = bloquear 
      ? `Pagamento do serviço "${o.servico_titulo}" de R$ ${Number(o.servico_preco).toFixed(2).replace('.', ',')} não foi identificado. O consulente foi bloqueado temporariamente.`
      : `Pagamento do serviço "${o.servico_titulo}" de R$ ${Number(o.servico_preco).toFixed(2).replace('.', ',')} não foi identificado. O consulente foi marcado apenas com pendência financeira, sem bloqueio.`;

    await window.logSecurityAction(
      user_id,
      clienteId,
      acaoLog,
      detalhesLog,
      statusLog,
      !!o.comprovante_url,
      bloquear ? "Bloqueio temporário ativado" : "Apenas pendência financeira ativada"
    );
  }

  alert(bloquear ? "O consulente foi bloqueado para novos pedidos e interações temporariamente." : "O consulente foi marcado apenas com pendência financeira, sem bloqueios.");
  
  if (isConnected) {
    await fetchRealFinances();
    await fetchRealPedidos();
  } else {
    loadDemonstrativeFinances();
    loadDemonstrativePedidos();
  }
}

window.bloquearCliente = async function(pedidoId, clienteId) {
  if (!confirm("Deseja bloquear temporariamente este cliente para novas consultas, perguntas e serviços?")) return;
  await processarBloqueioCliente(pedidoId, clienteId, true);
  closeOrderDetailModal();
};

window.removerBloqueioCliente = async function(pedidoId, clienteId) {
  if (!confirm("Deseja remover o acesso restrito (bloqueio) deste cliente?")) return;
  await processarBloqueioCliente(pedidoId, clienteId, false);
  closeOrderDetailModal();
};

window.loadAuditoriaTab = async function() {
  const tbody = document.getElementById("auditoriaTableBody");
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="5" style="text-align:center; padding: 20px;">
        <i class="fas fa-circle-notch fa-spin"></i> Carregando registros de auditoria...
      </td>
    </tr>
  `;

  const isConnected = await testSupabaseConnection();
  let logs = [];

  if (isConnected) {
    try {
      const user_id = await getCartomanteId();
      const { data, error } = await supabase
        .from("historico_acoes")
        .select(`
          *,
          clientes (
            id,
            nome_completo
          )
        `)
        .eq("cartomante_id", user_id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        logs = data.map(l => ({
          created_at: l.created_at,
          acao: l.acao,
          cliente_nome: l.clientes ? l.clientes.nome_completo : "Nenhum",
          comprovante_anexado: l.comprovante_anexado,
          observacao_cartomante: l.observacao_cartomante,
          detalhes: l.detalhes
        }));
      }
    } catch (e) {
      console.warn("Erro ao buscar historico_acoes do Supabase:", e);
    }
  }

  if (logs.length === 0) {
    // Carregar local
    let localLogs = JSON.parse(localStorage.getItem("cartomante_historico_acoes") || "[]");
    
    // Se estiver vazio, inicializa com alguns logs mockados para demonstração
    if (localLogs.length === 0) {
      localLogs = [
        {
          id: "log-1",
          cartomante_id: "cartomante-luana",
          cliente_id: null,
          acao: "Abertura de Sistema",
          detalhes: "Santuário do Fluxo Lunar foi aberto e carregado com sucesso.",
          status_pedido: null,
          comprovante_anexado: false,
          observacao_cartomante: "Iniciação do Portal",
          created_at: new Date(Date.now() - 3600000 * 24).toISOString()
        },
        {
          id: "log-2",
          cartomante_id: "cartomante-luana",
          cliente_id: "c1-uuid-helena",
          acao: "Aprovação de Pagamento",
          detalhes: "Pagamento do serviço 'Tiragem de Mandala Astrológica' de R$ 180,00 foi confirmado.",
          status_pedido: "pagamento_confirmado",
          comprovante_anexado: true,
          observacao_cartomante: "Comprovante válido recebido por PIX",
          created_at: new Date(Date.now() - 3600000 * 12).toISOString()
        }
      ];
      localStorage.setItem("cartomante_historico_acoes", JSON.stringify(localLogs));
    }

    // Mapear nomes de clientes locais
    const storedClients = JSON.parse(localStorage.getItem("demo_clientes") || "[]");
    logs = localLogs.map(l => {
      let cNome = "Nenhum";
      if (l.cliente_id) {
        if (l.cliente_id === "c1-uuid-helena") cNome = "Helena de Souza";
        else if (l.cliente_id === "c2-uuid-gabriel") cNome = "Gabriel Medeiros";
        else if (l.cliente_id === "c3-uuid-valentina") cNome = "Valentina Rocha";
        else {
          const matched = storedClients.find(c => c.id === l.cliente_id);
          cNome = matched ? matched.nome_completo : "Consulente";
        }
      }
      return {
        created_at: l.created_at,
        acao: l.acao,
        cliente_nome: cNome,
        comprovante_anexado: l.comprovante_anexado,
        observacao_cartomante: l.observacao_cartomante,
        detalhes: l.detalhes
      };
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  tbody.innerHTML = "";

  if (logs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center; padding: 30px; color: var(--text-muted); font-style:italic;">
          Nenhum registro de auditoria encontrado.
        </td>
      </tr>
    `;
    return;
  }

  logs.forEach(l => {
    const tr = document.createElement("tr");
    const dateFmt = new Date(l.created_at).toLocaleString('pt-BR');
    
    let compHTML = `<span style="color:var(--text-muted); font-size:0.75rem;">Sem anexo</span>`;
    if (l.comprovante_anexado) {
      compHTML = `<span class="status-badge pago" style="font-size:0.7rem;"><i class="fas fa-paperclip"></i> Comprovante</span>`;
    }
    
    if (l.observacao_cartomante) {
      compHTML += `<div style="font-size:0.7rem; color:var(--text-secondary); margin-top:2px;">Obs: ${l.observacao_cartomante}</div>`;
    }

    tr.innerHTML = `
      <td style="font-size:0.75rem; white-space:nowrap; color:var(--text-secondary);">${dateFmt}</td>
      <td style="font-weight:600; color:var(--gold-color);">${l.acao}</td>
      <td><i class="fas fa-user-circle" style="color:var(--text-muted); margin-right:4px;"></i> ${l.cliente_nome}</td>
      <td>${compHTML}</td>
      <td style="font-size:0.8rem; color:var(--text-primary); max-width:250px; word-wrap:break-word;">${l.detalhes}</td>
    `;
    tbody.appendChild(tr);
  });
};

window.openAjusteModal = function() {
  const select = document.getElementById("ajusteClienteId");
  if (select) {
    // Preencher select de clientes a partir do estado existente
    let optionsHTML = '<option value="">Nenhum</option>';
    
    // Extrair clientes das transações ou pedidos
    const clientMap = {};
    financeiroData.forEach(tx => {
      if (tx.cliente_id && tx.cliente_nome && tx.cliente_nome !== "Nenhuma") {
        clientMap[tx.cliente_id] = tx.cliente_nome;
      }
    });
    pedidosData.forEach(p => {
      if (p.cliente_id && p.cliente_nome) {
        clientMap[p.cliente_id] = p.cliente_nome;
      }
    });

    for (const [id, nome] of Object.entries(clientMap)) {
      optionsHTML += `<option value="${id}">${nome}</option>`;
    }
    select.innerHTML = optionsHTML;
  }

  document.getElementById("ajusteForm").reset();
  const modal = document.getElementById("ajusteModal");
  if (modal) modal.style.display = "block";
};

window.closeAjusteModal = function() {
  const modal = document.getElementById("ajusteModal");
  if (modal) modal.style.display = "none";
};

window.saveAjuste = async function(event) {
  event.preventDefault();

  const clienteId = document.getElementById("ajusteClienteId").value || null;
  const acao = document.getElementById("ajusteAcao").value.trim();
  const detalhes = document.getElementById("ajusteDetalhes").value.trim();

  if (!acao || !detalhes) return;

  const isConnected = await testSupabaseConnection();
  const user_id = isConnected ? (await getCartomanteId()) : "cartomante-luana";

  window.closeAjusteModal();

  if (typeof window.logSecurityAction === "function") {
    await window.logSecurityAction(
      user_id,
      clienteId,
      acao,
      detalhes,
      null,
      false,
      "Entrada de ajuste manual na auditoria"
    );
    alert("Entrada de ajuste registrada na auditoria imutável com sucesso!");
    await window.loadAuditoriaTab();
  } else {
    alert("Erro ao acessar a função de log de segurança.");
  }
};
