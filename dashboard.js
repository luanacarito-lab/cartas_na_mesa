// dashboard.js – Atualização dinâmica e integração do Painel Principal
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
  console.warn("Supabase não configurado. Dashboard rodando em Modo Demonstrativo Local.", e);
}

// Dados Mockados para o Painel Principal (Caso o Supabase não esteja conectado)
const MOCK_DASHBOARD_DATA = {
  cartomante_name: "Luana Carito",
  atendimentos_hoje: 3,
  proximos_atendimentos: [
    { nome: "Helena de Souza", servico: "Leitura de Tarô Terapêutico", hora: "14:00" },
    { nome: "Gabriel Medeiros", servico: "Alinhamento de Chakras & Cristais", hora: "16:30" },
    { nome: "Valentina Rocha", servico: "Consulta Geral com Baralho Cigano", hora: "18:00" }
  ],
  perguntas_pendentes: 2,
  pagamentos_pendentes: "R$ 170,00",
  clientes_recentes: [
    { nome: "Helena de Souza", data: "30/05/2026", status: "Ativa" },
    { nome: "Gabriel Medeiros", data: "28/05/2026", status: "Pendente" },
    { nome: "Valentina Rocha", data: "25/05/2026", status: "Novo" }
  ],
  alertas: [
    { texto: "🔮 Valentina Rocha enviou uma Pergunta ao Baralho de Urgência Alta!", tipo: "urgente" },
    { texto: "💰 Gabriel Medeiros tem um pagamento de R$ 120,00 pendente há 2 dias.", tipo: "alerta" }
  ]
};

// ==========================================================================
// INICIALIZAÇÃO DA PÁGINA
// ==========================================================================
document.addEventListener("DOMContentLoaded", async () => {
  const isSupabaseConnected = await testSupabaseConnection();

  if (isSupabaseConnected) {
    console.log("Supabase detectado no Dashboard. Carregando estatísticas do banco de dados...");
    await loadRealDashboardStats();
  } else {
    console.log("Supabase não conectado. Carregando dados demonstrativos no Dashboard...");
    loadDemonstrativeDashboardStats();
  }
});

// Verifica se a conexão com o Supabase está respondendo
async function testSupabaseConnection() {
  if (!supabase || SUPABASE_URL.includes("YOUR_PROJECT_REF")) return false;
  try {
    const { data, error } = await supabase.from("conversas").select("id").limit(1);
    return error ? false : true;
  } catch (e) {
    return false;
  }
}

// Carregar Dados Demonstrativos Mockados
function loadDemonstrativeDashboardStats() {
  // 1. Nome da Cartomante
  const nameEl = document.getElementById("cartomante-name");
  if (nameEl) nameEl.innerText = MOCK_DASHBOARD_DATA.cartomante_name;

  // 2. Atendimentos de Hoje
  const countsEl = document.getElementById("atendimentos-hoje");
  if (countsEl) countsEl.innerText = MOCK_DASHBOARD_DATA.atendimentos_hoje;

  // 3. Próximos Atendimentos
  const listEl = document.getElementById("proximos-atendimentos");
  if (listEl) {
    listEl.innerHTML = MOCK_DASHBOARD_DATA.proximos_atendimentos.map(at => `
      <li>
        <i class="fas fa-clock" style="color: var(--gold-color); margin-right: 8px;"></i>
        <strong>${at.hora}</strong> – <a href="chat.html?client=${encodeURIComponent(at.nome)}" style="color: var(--gold-color); text-decoration: none; font-weight: 600; transition: color var(--transition-fast);" onmouseover="this.style.color='var(--text-primary)'" onmouseout="this.style.color='var(--gold-color)'"><i class="fas fa-comments"></i> ${at.nome}</a> (${at.servico})
      </li>
    `).join("");
  }

  // 4. Perguntas Pendentes
  const questionsEl = document.getElementById("perguntas-pendentes");
  if (questionsEl) questionsEl.innerText = MOCK_DASHBOARD_DATA.perguntas_pendentes;

  // 5. Pagamentos Pendentes
  const paymentsEl = document.getElementById("pagamentos-pendentes");
  if (paymentsEl) paymentsEl.innerText = MOCK_DASHBOARD_DATA.pagamentos_pendentes;

  // 6. Clientes Recentes
  const clientsEl = document.getElementById("clientes-recentes");
  if (clientsEl) {
    clientsEl.innerHTML = MOCK_DASHBOARD_DATA.clientes_recentes.map(cli => `
      <li>
        <i class="fas fa-user-circle" style="margin-right: 8px;"></i>
        <a href="chat.html?client=${encodeURIComponent(cli.nome)}" style="color: var(--gold-color); text-decoration: none; font-weight: 600; transition: color var(--transition-fast);" onmouseover="this.style.color='var(--text-primary)'" onmouseout="this.style.color='var(--gold-color)'"><i class="fas fa-comments"></i> ${cli.nome}</a> – Sintonizada em ${cli.data} (${cli.status})
      </li>
    `).join("");
  }

  // 7. Agenda do Dia (Duplica próximos atendimentos de forma linda)
  const agendaEl = document.getElementById("agenda-do-dia");
  if (agendaEl) {
    agendaEl.innerHTML = MOCK_DASHBOARD_DATA.proximos_atendimentos.map(at => `
      <li>
        <span style="font-weight: 600; color: var(--gold-color); margin-right:15px;">${at.hora}</span>
        <span>Leitura para <a href="chat.html?client=${encodeURIComponent(at.nome)}" style="color: var(--gold-color); text-decoration: none; font-weight: 600;"><i class="fas fa-comments"></i> ${at.nome}</a></span>
      </li>
    `).join("");
  }

  // 8. Alertas Importantes
  const alertsEl = document.getElementById("alertas-importantes");
  if (alertsEl) {
    alertsEl.innerHTML = MOCK_DASHBOARD_DATA.alertas.map(al => `
      <li style="border-left: 3px solid ${al.tipo === 'urgente' ? '#e63946' : 'var(--gold-color)'}; padding-left: 10px;">
        ${al.texto}
      </li>
    `).join("");
  }
}

// Carregar Dados Reais do Supabase
async function loadRealDashboardStats() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      loadDemonstrativeDashboardStats();
      return;
    }

    // 1. Nome da Cartomante
    const nameEl = document.getElementById("cartomante-name");
    if (nameEl) nameEl.innerText = user.user_metadata?.nome_completo || "Cartomante";

    // 2. Buscar perguntas do baralho enviadas/pendentes do banco
    const { count: pendingQuestionsCount } = await supabase
      .from("perguntas_baralho")
      .select("*", { count: "exact", head: true })
      .eq("cartomante_id", user.id)
      .in("status", ["enviada", "aguardando_pagamento"]);

    const questionsEl = document.getElementById("perguntas-pendentes");
    if (questionsEl) questionsEl.innerText = pendingQuestionsCount || 0;

    // 3. Buscar pagamentos pendentes do financeiro do banco
    const { data: pendingPayments } = await supabase
      .from("financeiro")
      .select("valor")
      .eq("cartomante_id", user.id)
      .eq("status", "pendente");

    let sumPayments = 0;
    if (pendingPayments) {
      sumPayments = pendingPayments.reduce((acc, curr) => acc + Number(curr.valor), 0);
    }

    const paymentsEl = document.getElementById("pagamentos-pendentes");
    if (paymentsEl) {
      paymentsEl.innerText = sumPayments.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }

    // 4. Buscar atendimentos de hoje (da tabela de eventos, se houver)
    // Se a tabela agenda_eventos existir, podemos buscar, caso contrário cai no mock
    let appointmentsCount = 0;
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const { count } = await supabase
        .from("agenda_eventos")
        .select("*", { count: "exact", head: true })
        .eq("cartomante_id", user.id)
        .gte("data_inicio", todayStart.toISOString())
        .lte("data_inicio", todayEnd.toISOString());

      appointmentsCount = count || 0;
    } catch (e) {
      appointmentsCount = MOCK_DASHBOARD_DATA.atendimentos_hoje;
    }

    const countsEl = document.getElementById("atendimentos-hoje");
    if (countsEl) countsEl.innerText = appointmentsCount;

    // 5. Buscar clientes recentes
    const { data: recentClients } = await supabase
      .from("clientes")
      .select("nome_completo, created_at")
      .eq("cartomante_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3);

    const clientsEl = document.getElementById("clientes-recentes");
    if (clientsEl && recentClients && recentClients.length > 0) {
      clientsEl.innerHTML = recentClients.map(cli => `
        <li>
          <i class="fas fa-user-circle" style="margin-right: 8px;"></i>
          <strong>${cli.nome_completo}</strong> – Cadastrada em ${new Date(cli.created_at).toLocaleDateString()}
        </li>
      `).join("");
    } else {
      // Fallback
      loadDemonstrativeDashboardStats();
    }

  } catch (error) {
    console.error("Erro geral no carregamento do Dashboard real:", error);
    loadDemonstrativeDashboardStats();
  }
}
