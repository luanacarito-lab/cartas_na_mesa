// agenda.js – Motor Cronológico e Gerenciador de Consultas
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
  console.warn("Supabase não disponível. Rodando Agenda em Modo Demonstrativo.");
}

// ==========================================================================
// ESTADO INTERNO E MOCK DE CONTINGÊNCIA
// ==========================================================================
let agendaEventos = [];
let currentDate = new Date(2026, 4, 30); // 30 de Maio de 2026 (Data padrão do sistema)
let selectedDate = new Date(2026, 4, 30);
let activeTab = "diaria";

const MOCK_INITIAL_EVENTS = [
  // Passadas
  {
    id: "evt-past-1",
    cliente_nome: "Helena de Souza",
    servico: "Tiragem de Mandala Astrológica",
    data: "2026-05-20",
    hora: "10:00",
    notas: "Mandala anual de aniversário.",
    status: "concluido"
  },
  {
    id: "evt-past-2",
    cliente_nome: "Gabriel Medeiros",
    servico: "Limpeza Energética de Aura",
    data: "2026-05-28",
    hora: "15:00",
    notas: "Sentia cansaço e bloqueios nos chakras.",
    status: "concluido"
  },
  // Hoje
  {
    id: "evt-today-1",
    cliente_nome: "Helena de Souza",
    servico: "Leitura de Tarô Terapêutico",
    data: "2026-05-30",
    hora: "14:00",
    notas: "Questões afetivas profundas.",
    status: "confirmado"
  },
  {
    id: "evt-today-2",
    cliente_nome: "Gabriel Medeiros",
    servico: "Alinhamento de Chakras & Cristais",
    data: "2026-05-30",
    hora: "16:30",
    notas: "Alinhamento geral trimestral.",
    status: "confirmado"
  },
  {
    id: "evt-today-3",
    cliente_nome: "Valentina Rocha",
    servico: "Consulta Geral com Baralho Cigano",
    data: "2026-05-30",
    hora: "18:00",
    notas: "Foco em dúvidas sobre carreira material.",
    status: "confirmado"
  },
  // Marcadas para Depois (Futuras)
  {
    id: "evt-future-1",
    cliente_nome: "Helena de Souza",
    servico: "Leitura de Tarô Terapêutico",
    data: "2026-06-02",
    hora: "15:00",
    notas: "Acompanhamento da tiragem anterior.",
    status: "confirmado"
  },
  {
    id: "evt-future-2",
    cliente_nome: "Valentina Rocha",
    servico: "Ritual de Abertura de Caminhos",
    data: "2026-06-05",
    hora: "14:00",
    notas: "Conexão especial com cristais de ametista.",
    status: "confirmado"
  }
];

const MOCK_CLIENTS_LIST = [
  { id: "c1-uuid-helena", nome_completo: "Helena de Souza" },
  { id: "c2-uuid-gabriel", nome_completo: "Gabriel Medeiros" },
  { id: "c3-uuid-valentina", nome_completo: "Valentina Rocha" }
];

// ==========================================================================
// INICIALIZAÇÃO DA PÁGINA
// ==========================================================================
document.addEventListener("DOMContentLoaded", async () => {
  // Inicializa estrelas cintilantes do design system
  if (typeof generateStars === "function") {
    generateStars();
  }

  // Carrega eventos do Supabase ou locais
  const isConnected = await testSupabaseConnection();
  if (isConnected) {
    await fetchRealEvents();
    await populateClientsDropdownReal();
  } else {
    loadDemonstrativeEvents();
    populateClientsDropdownMock();
  }

  // Renderiza Calendário e Painéis
  renderCalendar();
  updateEventsDisplay();
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

// Carrega eventos mockados (com persistência em LocalStorage)
function loadDemonstrativeEvents() {
  const stored = localStorage.getItem("cartomante_agenda_eventos");
  if (stored) {
    agendaEventos = JSON.parse(stored);
  } else {
    agendaEventos = [...MOCK_INITIAL_EVENTS];
    localStorage.setItem("cartomante_agenda_eventos", JSON.stringify(agendaEventos));
  }
}

// Preenche seletor de clientes na modal em modo Mock
function populateClientsDropdownMock() {
  const select = document.getElementById("agendaCliente");
  if (!select) return;

  // Preserva a opção padrão
  select.innerHTML = '<option value="">Selecione a consulente...</option>';
  
  MOCK_CLIENTS_LIST.forEach(cli => {
    const opt = document.createElement("option");
    opt.value = cli.nome_completo;
    opt.innerText = cli.nome_completo;
    select.appendChild(opt);
  });
}

// Preenche seletor de clientes na modal em modo Real
async function populateClientsDropdownReal() {
  const select = document.getElementById("agendaCliente");
  if (!select) return;

  select.innerHTML = '<option value="">Selecione a consulente...</option>';
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: clients } = await supabase
      .from("clientes")
      .select("id, nome_completo")
      .eq("cartomante_id", user.id);

    if (clients) {
      clients.forEach(cli => {
        const opt = document.createElement("option");
        opt.value = cli.nome_completo; // Pode associar ID se preferir, usamos nome_completo para consistência do mock
        opt.innerText = cli.nome_completo;
        select.appendChild(opt);
      });
    }
  } catch (e) {
    console.error("Erro ao carregar lista de clientes para a agenda:", e);
    populateClientsDropdownMock();
  }
}

// Carregar eventos reais do Supabase
async function fetchRealEvents() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      loadDemonstrativeEvents();
      return;
    }

    const { data, error } = await supabase
      .from("agenda_eventos")
      .select(`
        id,
        data_inicio,
        data_fim,
        servico,
        status,
        notas,
        clientes (
          nome_completo
        )
      `)
      .eq("cartomante_id", user.id);

    if (error) throw error;

    if (data) {
      agendaEventos = data.map(evt => {
        const start = new Date(evt.data_inicio);
        const formatData = start.toISOString().split("T")[0];
        const formatHora = start.toTimeString().substring(0, 5);
        return {
          id: evt.id,
          cliente_nome: evt.clientes?.nome_completo || "Reservado",
          servico: evt.servico,
          data: formatData,
          hora: formatHora,
          notas: evt.notas || "",
          status: evt.status
        };
      });
    }
  } catch (e) {
    console.warn("Erro ao buscar eventos do Supabase. Usando LocalStorage backup.", e);
    loadDemonstrativeEvents();
  }
}

// ==========================================================================
// RENDERIZAÇÃO DO CALENDÁRIO MENSAL
// ==========================================================================
const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

function renderCalendar() {
  const activeMonthYearLabel = document.getElementById("activeMonthYear");
  const calendarGrid = document.getElementById("calendarGrid");
  if (!calendarGrid || !activeMonthYearLabel) return;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  activeMonthYearLabel.innerText = `${MONTH_NAMES[month]} ${year}`;
  calendarGrid.innerHTML = "";

  // Dias da semana headers
  const daysOfWeek = ["D", "S", "T", "Q", "Q", "S", "S"];
  daysOfWeek.forEach(day => {
    const header = document.createElement("div");
    header.className = "cal-day-name";
    header.innerText = day;
    calendarGrid.appendChild(header);
  });

  // Primeiro dia do mês e número de dias
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  // Preenche células vazias antes do primeiro dia
  for (let i = 0; i < firstDay; i++) {
    const emptyCell = document.createElement("div");
    emptyCell.className = "cal-day empty";
    calendarGrid.appendChild(emptyCell);
  }

  // Preenche dias do mês
  for (let day = 1; day <= totalDays; day++) {
    const cell = document.createElement("div");
    cell.className = "cal-day";
    cell.innerText = day;

    const thisDate = new Date(year, month, day);
    
    // Verifica se é a data selecionada
    if (thisDate.toDateString() === selectedDate.toDateString()) {
      cell.classList.add("active");
    }

    // Verifica se possui atendimentos nesta data
    const dateStr = thisDate.toISOString().split("T")[0];
    const hasEvents = agendaEventos.some(evt => evt.data === dateStr && evt.status !== 'cancelado');
    if (hasEvents && !cell.classList.contains("active")) {
      cell.style.boxShadow = "inset 0 0 5px rgba(199, 162, 122, 0.4)";
      cell.style.color = "var(--gold-color)";
      cell.style.fontWeight = "600";
    }

    cell.onclick = () => {
      selectedDate = thisDate;
      renderCalendar();
      
      // Atualiza aba ativa para "diária" ao clicar em um dia específico
      switchAgendaTab("diaria");
      updateEventsDisplay();
    };

    calendarGrid.appendChild(cell);
  }
}

function prevMonth() {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
}

function nextMonth() {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
}

// ==========================================================================
// RENDERIZAÇÃO DA LISTAGEM DE COMPROMISSOS (TABS)
// ==========================================================================
function switchAgendaTab(tab) {
  activeTab = tab;
  
  // Atualiza classes ativas dos botões
  document.getElementById("tabDaily").classList.remove("active");
  document.getElementById("tabFuture").classList.remove("active");
  document.getElementById("tabPast").classList.remove("active");

  document.getElementById("contentDiaria").style.display = "none";
  document.getElementById("contentFuturas").style.display = "none";
  document.getElementById("contentPassadas").style.display = "none";

  if (tab === "diaria") {
    document.getElementById("tabDaily").classList.add("active");
    document.getElementById("contentDiaria").style.display = "block";
  } else if (tab === "futuras") {
    document.getElementById("tabFuture").classList.add("active");
    document.getElementById("contentFuturas").style.display = "block";
  } else if (tab === "passadas") {
    document.getElementById("tabPast").classList.add("active");
    document.getElementById("contentPassadas").style.display = "block";
  }

  updateEventsDisplay();
}

function updateEventsDisplay() {
  const selectedDateStr = selectedDate.toISOString().split("T")[0];
  
  // Atualiza data exibida na aba do dia
  const activeDateDisplay = document.getElementById("activeDateDisplay");
  if (activeDateDisplay) {
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    activeDateDisplay.innerText = `${day}/${month}`;
  }

  // Conta consultas futuras e passadas
  const systemDate = new Date(2026, 4, 30); // 30 de Maio de 2026
  
  const futureCount = agendaEventos.filter(evt => new Date(evt.data) > systemDate && evt.status !== 'cancelado').length;
  const pastCount = agendaEventos.filter(evt => new Date(evt.data) < systemDate && evt.status !== 'cancelado').length;

  document.getElementById("futureCount").innerText = futureCount;
  document.getElementById("pastCount").innerText = pastCount;

  // 1. Renderiza aba DIÁRIA
  const dailyTimeline = document.getElementById("dailyTimeline");
  if (dailyTimeline) {
    dailyTimeline.innerHTML = "";
    
    // Filtra compromissos do dia selecionado
    const todayEvents = agendaEventos
      .filter(evt => evt.data === selectedDateStr && evt.status !== 'cancelado')
      .sort((a, b) => a.hora.localeCompare(b.hora));

    if (todayEvents.length === 0) {
      dailyTimeline.innerHTML = `
        <div class="empty-agenda-state">
          <i class="fas fa-calendar-times" style="font-size:1.8rem; margin-bottom:10px; display:block; color:var(--text-muted);"></i>
          Nenhum agendamento sintonizado para esta data mística.
        </div>
      `;
    } else {
      todayEvents.forEach(evt => {
        const item = document.createElement("div");
        item.className = "agenda-event-item";
        item.innerHTML = `
          <div class="agenda-event-left">
            <div class="agenda-event-time-badge">${evt.hora}</div>
            <div class="agenda-event-info">
              <span class="agenda-event-title">
                <a href="chat.html?client=${encodeURIComponent(evt.cliente_nome)}" style="color: var(--gold-color); text-decoration: none; font-weight: 600;" title="Iniciar chat com ${evt.cliente_nome}">
                  <i class="fas fa-comments"></i> ${evt.cliente_nome}
                </a>
              </span>
              <span class="agenda-event-service">${evt.servico} ${evt.notas ? `<em>(${evt.notas})</em>` : ''}</span>
            </div>
          </div>
          <div class="agenda-event-actions">
            <button class="btn-trans-del" onclick="deleteAppointment('${evt.id}')" title="Cancelar agendamento"><i class="fas fa-trash"></i></button>
          </div>
        `;
        dailyTimeline.appendChild(item);
      });
    }
  }

  // 2. Renderiza aba FUTURAS
  const futureList = document.getElementById("futureEventsList");
  if (futureList) {
    futureList.innerHTML = "";
    const futureEvents = agendaEventos
      .filter(evt => new Date(evt.data) > systemDate && evt.status !== 'cancelado')
      .sort((a, b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora));

    if (futureEvents.length === 0) {
      futureList.innerHTML = `
        <div class="empty-agenda-state">
          Nenhuma consulta marcada para depois no livro cósmico.
        </div>
      `;
    } else {
      futureEvents.forEach(evt => {
        const item = document.createElement("div");
        item.className = "agenda-event-item";
        
        const dataArr = evt.data.split("-");
        const formattedData = `${dataArr[2]}/${dataArr[1]}/${dataArr[0]}`;

        item.innerHTML = `
          <div class="agenda-event-left">
            <div class="agenda-event-time-badge" style="font-size:0.75rem; text-align:center; padding: 4px 8px;">
              ${formattedData}<br/>${evt.hora}
            </div>
            <div class="agenda-event-info">
              <span class="agenda-event-title">
                <a href="chat.html?client=${encodeURIComponent(evt.cliente_nome)}" style="color: var(--gold-color); text-decoration: none; font-weight: 600;">
                  <i class="fas fa-comments"></i> ${evt.cliente_nome}
                </a>
              </span>
              <span class="agenda-event-service">${evt.servico} ${evt.notas ? `<em>(${evt.notas})</em>` : ''}</span>
            </div>
          </div>
          <div class="agenda-event-actions">
            <button class="btn-trans-del" onclick="deleteAppointment('${evt.id}')" title="Cancelar"><i class="fas fa-trash"></i></button>
          </div>
        `;
        futureList.appendChild(item);
      });
    }
  }

  // 3. Renderiza aba PASSADAS
  const pastList = document.getElementById("pastEventsList");
  if (pastList) {
    pastList.innerHTML = "";
    const pastEvents = agendaEventos
      .filter(evt => new Date(evt.data) < systemDate && evt.status !== 'cancelado')
      .sort((a, b) => b.data.localeCompare(a.data) || b.hora.localeCompare(a.hora)); // Mais recentes primeiro

    if (pastEvents.length === 0) {
      pastList.innerHTML = `
        <div class="empty-agenda-state">
          Nenhum registro de consultas passadas encontrado.
        </div>
      `;
    } else {
      pastEvents.forEach(evt => {
        const item = document.createElement("div");
        item.className = "agenda-event-item";
        item.style.opacity = "0.75"; // Efeito esmaecido para passadas

        const dataArr = evt.data.split("-");
        const formattedData = `${dataArr[2]}/${dataArr[1]}/${dataArr[0]}`;

        item.innerHTML = `
          <div class="agenda-event-left">
            <div class="agenda-event-time-badge" style="font-size:0.75rem; text-align:center; padding: 4px 8px; background: rgba(255,255,255,0.05); color: var(--text-secondary);">
              ${formattedData}<br/>${evt.hora}
            </div>
            <div class="agenda-event-info">
              <span class="agenda-event-title">
                <a href="chat.html?client=${encodeURIComponent(evt.cliente_nome)}" style="color: var(--gold-color); text-decoration: none; font-weight: 600;">
                  <i class="fas fa-comments"></i> ${evt.cliente_nome}
                </a>
              </span>
              <span class="agenda-event-service">${evt.servico} ${evt.notas ? `<em>(${evt.notas})</em>` : ''}</span>
            </div>
          </div>
          <div class="agenda-event-actions">
            <span class="status-badge pago" style="font-size: 0.6rem; padding: 1px 6px;">Concluída</span>
          </div>
        `;
        pastList.appendChild(item);
      });
    }
  }
}

// ==========================================================================
// MODAL & CADASTRO DE AGENDAMENTOS MANUAL
// ==========================================================================
function openAgendaModal() {
  document.getElementById("frmAgenda").reset();
  
  // Seta a data selecionada como padrão na modal
  const selectedDateStr = selectedDate.toISOString().split("T")[0];
  document.getElementById("agendaData").value = selectedDateStr;
  
  document.getElementById("agendaModal").classList.add("active");
}

function closeAgendaModal() {
  document.getElementById("agendaModal").classList.remove("active");
}

// Trata submissão do agendamento
async function handleAgendaSubmit(event) {
  event.preventDefault();

  const clienteNome = document.getElementById("agendaCliente").value;
  const servico = document.getElementById("agendaServico").value;
  const data = document.getElementById("agendaData").value;
  const hora = document.getElementById("agendaHora").value;
  const notas = document.getElementById("agendaNotas").value.trim();

  if (!clienteNome || !servico || !data || !hora) return;

  const newEvent = {
    id: "evt-man-" + Date.now(),
    cliente_nome: clienteNome,
    servico: servico,
    data: data,
    hora: hora,
    notas: notas,
    status: "confirmado"
  };

  const isConnected = await testSupabaseConnection();
  if (isConnected) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Busca ID da cliente pelo nome
      const { data: clientObj } = await supabase
        .from("clientes")
        .select("id")
        .eq("nome_completo", clienteNome)
        .limit(1)
        .single();

      if (user && clientObj) {
        const startISO = new Date(`${data}T${hora}:00`).toISOString();
        const endISO = new Date(new Date(`${data}T${hora}:00`).getTime() + 3600000).toISOString(); // 1 hora de consulta
        
        const { error } = await supabase
          .from("agenda_eventos")
          .insert({
            cartomante_id: user.id,
            cliente_id: clientObj.id,
            data_inicio: startISO,
            data_fim: endISO,
            servico: servico,
            status: "confirmado",
            notas: notas
          });

        if (error) throw error;
        await fetchRealEvents();
      }
    } catch (e) {
      console.error("Erro ao gravar agendamento real no Supabase:", e);
      // Fallback local
      agendaEventos.push(newEvent);
      localStorage.setItem("cartomante_agenda_eventos", JSON.stringify(agendaEventos));
    }
  } else {
    // Modo local mockado
    agendaEventos.push(newEvent);
    localStorage.setItem("cartomante_agenda_eventos", JSON.stringify(agendaEventos));
  }

  closeAgendaModal();
  renderCalendar();
  updateEventsDisplay();
}

// Deleta agendamento
async function deleteAppointment(id) {
  if (!confirm("Deseja realmente cancelar este agendamento espiritual?")) return;

  const isConnected = await testSupabaseConnection();
  if (isConnected) {
    try {
      const { error } = await supabase
        .from("agenda_eventos")
        .update({ status: "cancelado" })
        .eq("id", id);

      if (error) throw error;
      await fetchRealEvents();
    } catch (e) {
      console.error("Erro ao cancelar no Supabase:", e);
      // Fallback local
      agendaEventos = agendaEventos.map(evt => evt.id === id ? { ...evt, status: "cancelado" } : evt);
      localStorage.setItem("cartomante_agenda_eventos", JSON.stringify(agendaEventos));
    }
  } else {
    // Local mock
    agendaEventos = agendaEventos.map(evt => evt.id === id ? { ...evt, status: "cancelado" } : evt);
    localStorage.setItem("cartomante_agenda_eventos", JSON.stringify(agendaEventos));
  }

  renderCalendar();
  updateEventsDisplay();
}
