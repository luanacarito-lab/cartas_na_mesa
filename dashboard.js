// dashboard.js – Atualização dinâmica e integração do Painel Principal
// --------------------------------------------------------------------------
// Inicialização do Supabase Client
let supabase = window.supabaseClient;

// Dados Mockados para Fallback
const MOCK_DASHBOARD_DATA = {
  cartomante_name: "Luana Carito",
  atendimentos_hoje: 3,
  proximos_atendimentos: [
    { nome: "Helena de Souza", servico: "Leitura de Tarô Terapêutico", hora: "14:00" },
    { nome: "Gabriel Medeiros", servico: "Alinhamento de Chakras", hora: "16:30" }
  ],
  perguntas_pendentes: 1,
  pagamentos_pendentes: "R$ 120,00",
  clientes_recentes: [
    { nome: "Helena de Souza", data: "30/05/2026", status: "Ativa" },
    { nome: "Gabriel Medeiros", data: "28/05/2026", status: "Pendente" }
  ],
  alertas: [
    { texto: "🔮 Valentina Rocha enviou uma Pergunta ao Baralho!", tipo: "urgente" }
  ]
};

// Global State
let loggedUser = null;

// INICIALIZAÇÃO DA PÁGINA
document.addEventListener("DOMContentLoaded", async () => {
  const isConnected = await window.testSupabaseConnection();

  if (isConnected && supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      loggedUser = user;
      await loadRealDashboardStats(user);
      await checkOnboardingStatus(user);
      await loadNotifications(user);
      subscribeNotifications(user);
    } else {
      window.location.href = "login.html";
    }
  } else {
    loadDemonstrativeDashboardStats();
    loadDemoNotifications();
  }
});

// Verifica se a conexão com o Supabase está respondendo
async function testSupabaseConnection() {
  return await window.testSupabaseConnection();
}

// Carregar Dados Demonstrativos Mockados
function loadDemonstrativeDashboardStats() {
  const nameEl = document.getElementById("cartomante-name");
  if (nameEl) nameEl.innerText = MOCK_DASHBOARD_DATA.cartomante_name;

  const countsEl = document.getElementById("atendimentos-hoje");
  if (countsEl) countsEl.innerText = MOCK_DASHBOARD_DATA.atendimentos_hoje;

  const listEl = document.getElementById("proximos-atendimentos");
  if (listEl) {
    listEl.innerHTML = MOCK_DASHBOARD_DATA.proximos_atendimentos.map(at => `
      <li>
        <i class="fas fa-clock" style="color: var(--gold-color); margin-right: 8px;"></i>
        <strong>${at.hora}</strong> – <a href="agenda.html" style="color: var(--gold-color); text-decoration: none; font-weight: 600;"><i class="fas fa-comments"></i> ${at.nome}</a> (${at.servico})
      </li>
    `).join("");
  }

  const questionsEl = document.getElementById("perguntas-pendentes");
  if (questionsEl) questionsEl.innerText = MOCK_DASHBOARD_DATA.perguntas_pendentes;

  const paymentsEl = document.getElementById("pagamentos-pendentes");
  if (paymentsEl) paymentsEl.innerText = MOCK_DASHBOARD_DATA.pagamentos_pendentes;

  const clientsEl = document.getElementById("clientes-recentes");
  if (clientsEl) {
    clientsEl.innerHTML = MOCK_DASHBOARD_DATA.clientes_recentes.map(cli => `
      <li>
        <i class="fas fa-user-circle" style="margin-right: 8px;"></i>
        <a href="clients.html" style="color: var(--gold-color); text-decoration: none; font-weight: 600;"><i class="fas fa-comments"></i> ${cli.nome}</a> – Sintonizada em ${cli.data} (${cli.status})
      </li>
    `).join("");
  }

  const agendaEl = document.getElementById("agenda-do-dia");
  if (agendaEl) {
    agendaEl.innerHTML = MOCK_DASHBOARD_DATA.proximos_atendimentos.map(at => `
      <li>
        <span style="font-weight: 600; color: var(--gold-color); margin-right:15px;">${at.hora}</span>
        <span>Leitura para <a href="agenda.html" style="color: var(--gold-color); text-decoration: none; font-weight: 600;">${at.nome}</a></span>
      </li>
    `).join("");
  }

  const alertsEl = document.getElementById("alertas-importantes");
  if (alertsEl) {
    alertsEl.innerHTML = MOCK_DASHBOARD_DATA.alertas.map(al => `
      <li style="border-left: 3px solid ${al.tipo === 'urgente' ? '#e63946' : 'var(--gold-color)'}; padding-left: 10px;">
        ${al.texto}
      </li>
    `).join("");
  }
}

// Carregar Estatísticas Reais
async function loadRealDashboardStats(user) {
  try {
    const nameEl = document.getElementById("cartomante-name");
    if (nameEl) nameEl.innerText = user.user_metadata?.nome_profissional || user.user_metadata?.nome_completo || "Cartomante";

    // 1. Perguntas Pendentes
    const { count: pendingQuestions } = await supabase
      .from("perguntas_baralho")
      .select("*", { count: "exact", head: true })
      .eq("cartomante_id", user.id)
      .in("status", ["enviada", "aguardando_pagamento"]);
    
    const questionsEl = document.getElementById("perguntas-pendentes");
    if (questionsEl) questionsEl.innerText = pendingQuestions || 0;

    // 2. Pagamentos Pendentes
    const { data: pendingPayments } = await supabase
      .from("financeiro")
      .select("valor")
      .eq("cartomante_id", user.id)
      .eq("status", "pendente");

    const sumPayments = pendingPayments ? pendingPayments.reduce((acc, curr) => acc + Number(curr.valor), 0) : 0;
    const paymentsEl = document.getElementById("pagamentos-pendentes");
    if (paymentsEl) {
      paymentsEl.innerText = sumPayments.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }

    // 3. Atendimentos de Hoje
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const { data: agendaEvents } = await supabase
      .from("agenda_eventos")
      .select("id, inicio, cliente_id")
      .eq("cartomante_id", user.id)
      .gte("inicio", todayStart.toISOString())
      .lte("inicio", todayEnd.toISOString())
      .order("inicio", { ascending: true });

    const countsEl = document.getElementById("atendimentos-hoje");
    if (countsEl) countsEl.innerText = agendaEvents ? agendaEvents.length : 0;

    // Injetar Agenda do Dia
    const agendaEl = document.getElementById("agenda-do-dia");
    if (agendaEl) {
      agendaEl.innerHTML = "";
      if (agendaEvents && agendaEvents.length > 0) {
        for (const ev of agendaEvents) {
          const { data: cli } = await supabase.from("clientes").select("nome_completo").eq("id", ev.cliente_id).maybeSingle();
          const horaStr = new Date(ev.inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const li = document.createElement("li");
          li.innerHTML = `
            <span style="font-weight: 600; color: var(--gold-color); margin-right:15px;">${horaStr}</span>
            <span>Leitura para <a href="agenda.html" style="color: var(--gold-color); text-decoration: none; font-weight: 600;">${cli?.nome_completo || "Consulente"}</a></span>
          `;
          agendaEl.appendChild(li);
        }
      } else {
        agendaEl.innerHTML = `<li style="font-style:italic; color:var(--text-muted); font-size:0.8rem;"><i class="fas fa-ghost"></i> Nenhum atendimento hoje.</li>`;
      }
    }

    // 4. Clientes Recentes
    const { data: links } = await supabase
      .from("cartomante_clientes")
      .select("cliente_id, created_at")
      .eq("cartomante_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3);

    const clientsEl = document.getElementById("clientes-recentes");
    if (clientsEl) {
      clientsEl.innerHTML = "";
      if (links && links.length > 0) {
        for (const l of links) {
          const { data: cli } = await supabase.from("clientes").select("nome_completo").eq("id", l.cliente_id).maybeSingle();
          const li = document.createElement("li");
          li.innerHTML = `
            <i class="fas fa-user-circle" style="margin-right: 8px;"></i>
            <a href="clients.html" style="color: var(--gold-color); text-decoration: none; font-weight: 600;">${cli?.nome_completo || "Consulente"}</a> – Sintonizada em ${new Date(l.created_at).toLocaleDateString()}
          `;
          clientsEl.appendChild(li);
        }
      } else {
        clientsEl.innerHTML = `<li style="font-style:italic; color:var(--text-muted); font-size:0.8rem;"><i class="fas fa-user-slash"></i> Nenhuma consulente sintonizada ainda.</li>`;
      }
    }

    // Injetar Próximos Atendimentos
    const upcomingListEl = document.getElementById("proximos-atendimentos");
    const { data: upcomingEvents } = await supabase
      .from("agenda_eventos")
      .select("inicio, cliente_id")
      .eq("cartomante_id", user.id)
      .gt("inicio", new Date().toISOString())
      .order("inicio", { ascending: true })
      .limit(3);

    if (upcomingListEl) {
      upcomingListEl.innerHTML = "";
      if (upcomingEvents && upcomingEvents.length > 0) {
        for (const ev of upcomingEvents) {
          const { data: cli } = await supabase.from("clientes").select("nome_completo").eq("id", ev.cliente_id).maybeSingle();
          const dataStr = new Date(ev.inicio).toLocaleDateString();
          const horaStr = new Date(ev.inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const li = document.createElement("li");
          li.innerHTML = `
            <i class="fas fa-clock" style="color: var(--gold-color); margin-right: 8px;"></i>
            <strong>${dataStr} às ${horaStr}</strong> – <a href="agenda.html" style="color: var(--gold-color); text-decoration: none; font-weight: 600;">${cli?.nome_completo || "Consulente"}</a>
          `;
          upcomingListEl.appendChild(li);
        }
      } else {
        upcomingListEl.innerHTML = `<li style="font-style:italic; color:var(--text-muted); font-size:0.8rem;">Nenhum atendimento agendado.</li>`;
      }
    }

  } catch (error) {
    console.error("Erro ao carregar painel real:", error);
    loadDemonstrativeDashboardStats();
  }
}

// --------------------------------------------------
// FLUXO DE ONBOARDING OPCIONAL DA CARTOMANTE
// --------------------------------------------------
async function checkOnboardingStatus(user) {
  if (!supabase) return;

  // Se já fechou o onboarding, não mostrar
  if (localStorage.getItem(`onboarding_dismissed_${user.id}`) === "true") return;

  // Carregar dados de perfil, serviços e mural para avaliar
  const { data: perfil } = await supabase.from("perfis_publicos").select("*").eq("cartomante_id", user.id).maybeSingle();
  const { count: servicesCount } = await supabase.from("servicos_publicos").select("*", { count: "exact", head: true }).eq("cartomante_id", user.id);
  const { count: postsCount } = await supabase.from("mural_postagens").select("*", { count: "exact", head: true }).eq("cartomante_id", user.id);
  const { data: config } = await supabase.from("configuracoes_chat").select("max_perguntas_diarias").eq("cartomante_id", user.id).maybeSingle();

  // Condições de etapas completadas
  const stepPerfil = perfil && perfil.bio && !perfil.bio.includes("Nova oraculista");
  const stepFoto = perfil && perfil.foto_url && !perfil.foto_url.includes("default-avatar");
  const stepServicos = servicesCount > 0;
  const stepPreco = config && config.max_perguntas_diarias > 0;
  const stepMural = postsCount > 0;

  // Se tudo já estiver sintonizado, nem exibe o banner
  if (stepPerfil && stepFoto && stepServicos && stepPreco && stepMural) return;

  // Exibir o banner
  const banner = document.getElementById("onboardingBanner");
  if (banner) banner.classList.remove("hidden");

  const stepsList = document.getElementById("onboardingStepsList");
  if (stepsList) {
    stepsList.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px; font-size:0.75rem; color:${stepPerfil ? '#2ecc71' : 'var(--text-secondary)'};">
        <i class="fas ${stepPerfil ? 'fa-check-circle' : 'fa-circle-notch'}"></i>
        <span>1. Bio do Perfil</span>
      </div>
      <div style="display:flex; align-items:center; gap:8px; font-size:0.75rem; color:${stepFoto ? '#2ecc71' : 'var(--text-secondary)'};">
        <i class="fas ${stepFoto ? 'fa-check-circle' : 'fa-circle-notch'}"></i>
        <span>2. Foto Customizada</span>
      </div>
      <div style="display:flex; align-items:center; gap:8px; font-size:0.75rem; color:${stepServicos ? '#2ecc71' : 'var(--text-secondary)'};">
        <i class="fas ${stepServicos ? 'fa-check-circle' : 'fa-circle-notch'}"></i>
        <span>3. Serviços Ofertados</span>
      </div>
      <div style="display:flex; align-items:center; gap:8px; font-size:0.75rem; color:${stepMural ? '#2ecc71' : 'var(--text-secondary)'};">
        <i class="fas ${stepMural ? 'fa-check-circle' : 'fa-circle-notch'}"></i>
        <span>4. Mensagem no Mural</span>
      </div>
      <div style="grid-column: span 2; margin-top:5px;">
        <a href="settings.html" class="glass-button" style="font-size:0.72rem; padding:6px 12px; border-color:var(--gold-color);"><i class="fas fa-cog"></i> Configurar Templo</a>
      </div>
    `;
  }
}

window.dismissOnboarding = function() {
  if (loggedUser) {
    localStorage.setItem(`onboarding_dismissed_${loggedUser.id}`, "true");
  }
  const banner = document.getElementById("onboardingBanner");
  if (banner) banner.classList.add("hidden");
};

// --------------------------------------------------
// CENTRAL DE NOTIFICAÇÕES (POPOVER)
// --------------------------------------------------
window.toggleNotificationsMenu = function() {
  const menu = document.getElementById("notificationsMenu");
  if (menu) menu.classList.toggle("hidden");
};

// Fechar menu ao clicar fora
document.addEventListener("click", (e) => {
  const container = document.getElementById("notificationContainer");
  const menu = document.getElementById("notificationsMenu");
  if (container && !container.contains(e.target) && menu) {
    menu.classList.add("hidden");
  }
});

async function loadNotifications(user) {
  if (!supabase) return;

  const { data: list, error } = await supabase
    .from("notificacoes")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Erro ao carregar notificações:", error);
    return;
  }

  renderNotifications(list || []);
}

function renderNotifications(list) {
  const container = document.getElementById("notifListContainer");
  const badge = document.getElementById("notifBadge");
  if (!container) return;

  container.innerHTML = "";
  const unreadCount = list.filter(n => !n.lida).length;

  if (badge) {
    if (unreadCount > 0) {
      badge.textContent = unreadCount;
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }
  }

  if (list.length === 0) {
    container.innerHTML = `<p style="font-size:0.78rem; font-style:italic; color:var(--text-muted); text-align:center; padding:15px 0; margin:0;">Nenhum aviso no momento.</p>`;
    return;
  }

  list.forEach(n => {
    const item = document.createElement("div");
    item.style.padding = "10px";
    item.style.borderRadius = "8px";
    item.style.background = n.lida ? "rgba(255, 255, 255, 0.01)" : "rgba(199, 162, 122, 0.08)";
    item.style.border = "1px solid rgba(255, 255, 255, 0.03)";
    item.style.fontSize = "0.78rem";
    item.style.display = "flex";
    item.style.flexDirection = "column";
    item.style.gap = "4px";

    let icon = "fa-bell";
    if (n.tipo === "mensagem") icon = "fa-comments";
    else if (n.tipo === "pergunta") icon = "fa-crown";
    else if (n.tipo === "pagamento") icon = "fa-wallet";
    else if (n.tipo === "atendimento") icon = "fa-calendar-check";

    item.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; font-weight:600; color:var(--gold-color);">
        <span><i class="fas ${icon}" style="margin-right:5px;"></i> ${n.titulo}</span>
        ${!n.lida ? `<button onclick="markAsRead('${n.id}')" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:0.65rem;" title="Marcar como lida"><i class="fas fa-check"></i></button>` : ''}
      </div>
      <div style="color:var(--text-secondary); line-height:1.3;">${n.mensagem}</div>
      <div style="font-size:0.65rem; color:var(--text-muted); margin-top:2px;">${new Date(n.created_at).toLocaleDateString()} ${new Date(n.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
    `;
    container.appendChild(item);
  });
}

window.markAsRead = async function(id) {
  if (!supabase || !loggedUser) return;
  await supabase.from("notificacoes").update({ lida: true }).eq("id", id);
  await loadNotifications(loggedUser);
};

window.markAllNotificationsAsRead = async function() {
  if (!supabase || !loggedUser) return;
  await supabase.from("notificacoes").update({ lida: true }).eq("user_id", loggedUser.id);
  await loadNotifications(loggedUser);
};

// Inscrever-se em tempo real para receber notificações na hora
function subscribeNotifications(user) {
  if (!supabase) return;
  supabase
    .channel(`public:notificacoes_${user.id}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notificacoes", filter: `user_id=eq.${user.id}` },
      async () => {
        await loadNotifications(user);
        // Tocar som místico se fizer sentido ou emitir feedback visual
      }
    )
    .subscribe();
}

// Demo Notifications (Fallback)
function loadDemoNotifications() {
  renderNotifications([
    { id: "1", titulo: "Pergunta pendente", mensagem: "Valentina Rocha enviou uma Pergunta ao Baralho.", tipo: "pergunta", lida: false, created_at: new Date().toISOString() }
  ]);
}
