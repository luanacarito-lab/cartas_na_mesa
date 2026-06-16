// assets/js/agenda.js – Motor Cronológico e Gerenciador de Consultas Real
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
let currentDate = new Date(2026, 4, 30); // 30 de Maio de 2026 (Data inicial padrão)
let selectedDate = new Date(2026, 4, 30);
let currentView = "month"; // month, week, day
let clientesList = [];

const MOCK_INITIAL_EVENTS = [
  {
    id: "evt-past-1",
    cliente_nome: "Helena de Souza",
    servico: "Tiragem de Mandala Astrológica",
    inicio: "2026-05-20T10:00:00",
    fim: "2026-05-20T11:00:00",
    tipo: "atendimento",
    notas: "Mandala anual de aniversário.",
    status: "confirmado"
  },
  {
    id: "evt-past-2",
    cliente_nome: "Gabriel Medeiros",
    servico: "Limpeza Energética de Aura",
    inicio: "2026-05-28T15:00:00",
    fim: "2026-05-28T16:00:00",
    tipo: "atendimento",
    notas: "Sentia cansaço e bloqueios nos chakras.",
    status: "confirmado"
  },
  {
    id: "evt-today-1",
    cliente_nome: "Helena de Souza",
    servico: "Leitura de Tarô Terapêutico",
    inicio: "2026-05-30T14:00:00",
    fim: "2026-05-30T15:00:00",
    tipo: "atendimento",
    notas: "Questões afetivas profundas.",
    status: "confirmado"
  },
  {
    id: "evt-today-2",
    cliente_nome: "Gabriel Medeiros",
    servico: "Alinhamento de Chakras & Cristais",
    inicio: "2026-05-30T16:30:00",
    fim: "2026-05-30T17:30:00",
    tipo: "atendimento",
    notas: "Alinhamento geral trimestral.",
    status: "confirmado"
  },
  {
    id: "evt-today-3",
    cliente_nome: "Valentina Rocha",
    servico: "Consulta Geral com Baralho Cigano",
    inicio: "2026-05-30T18:00:00",
    fim: "2026-05-30T19:00:00",
    tipo: "atendimento",
    notas: "Foco em dúvidas sobre carreira material.",
    status: "confirmado"
  },
  {
    id: "evt-future-1",
    cliente_nome: "Helena de Souza",
    servico: "Leitura de Tarô Terapêutico",
    inicio: "2026-06-02T15:00:00",
    fim: "2026-06-02T16:00:00",
    tipo: "atendimento",
    notas: "Acompanhamento da tiragem anterior.",
    status: "confirmado"
  },
  {
    id: "evt-future-2",
    cliente_nome: "Valentina Rocha",
    servico: "Ritual de Abertura de Caminhos",
    inicio: "2026-06-05T14:00:00",
    fim: "2026-06-05T15:00:00",
    tipo: "atendimento",
    notas: "Conexão especial com cristais de ametista.",
    status: "confirmado"
  },
  {
    id: "evt-folga-1",
    cliente_nome: null,
    servico: null,
    inicio: "2026-05-31T09:00:00",
    fim: "2026-05-31T12:00:00",
    tipo: "folga",
    notas: "Folga de descanso matinal",
    status: "confirmado"
  }
];

const MOCK_CLIENTS_LIST = [
  { id: "c1-uuid-helena", nome_completo: "Helena de Souza" },
  { id: "c2-uuid-gabriel", nome_completo: "Gabriel Medeiros" },
  { id: "c3-uuid-valentina", nome_completo: "Valentina Rocha" }
];

// Nomes de meses traduzidos
const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const WEEK_DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

// ==========================================================================
// INICIALIZAÇÃO DA PÁGINA
// ==========================================================================
document.addEventListener("DOMContentLoaded", async () => {
  if (typeof generateStars === "function") {
    generateStars();
  }

  // Verificar parâmetros da URL para filtrar views
  const urlParams = new URLSearchParams(window.location.search);
  const paramView = urlParams.get("view");
  if (paramView === "day") {
    currentView = "day";
  } else if (paramView === "week") {
    currentView = "week";
  }

  const isConnected = await testSupabaseConnection();
  if (isConnected) {
    await fetchRealEvents();
    await populateClientsDropdownReal();
  } else {
    loadDemonstrativeEvents();
    populateClientsDropdownMock();
  }

  initViewTabs();
  renderCalendar();
});

// Verifica se a conexão com o Supabase está respondendo
async function testSupabaseConnection() {
  if (!supabase || SUPABASE_URL.includes("YOUR_PROJECT_REF")) return false;
  try {
    const { data, error } = await supabase.from("clientes").select("id").limit(1);
    return error ? false : true;
  } catch (e) {
    return false;
  }
}

function loadDemonstrativeEvents() {
  const stored = localStorage.getItem("cartomante_agenda_eventos");
  if (stored) {
    agendaEventos = JSON.parse(stored);
  } else {
    agendaEventos = MOCK_INITIAL_EVENTS.map(evt => {
      const match = MOCK_CLIENTS_LIST.find(c => c.nome_completo === evt.cliente_nome);
      return {
        ...evt,
        cliente_id: match ? match.id : null
      };
    });
    localStorage.setItem("cartomante_agenda_eventos", JSON.stringify(agendaEventos));
  }
}

function populateClientsDropdownMock() {
  const select = document.getElementById("agendaCliente");
  if (!select) return;
  select.innerHTML = '<option value="">Selecione a consulente...</option>';
  MOCK_CLIENTS_LIST.forEach(cli => {
    const opt = document.createElement("option");
    opt.value = cli.nome_completo;
    opt.innerText = cli.nome_completo;
    select.appendChild(opt);
  });
}

async function populateClientsDropdownReal() {
  const select = document.getElementById("agendaCliente");
  if (!select) return;
  select.innerHTML = '<option value="">Selecione a consulente...</option>';
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Buscar clientes vinculados a essa cartomante
    const { data: links } = await supabase
      .from("cartomante_clientes")
      .select("cliente_id")
      .eq("cartomante_id", user.id);

    if (links && links.length > 0) {
      const clientIds = links.map(l => l.cliente_id);
      const { data: clients } = await supabase
        .from("clientes")
        .select("id, nome_completo")
        .in("id", clientIds);

      if (clients) {
        clients.forEach(cli => {
          const opt = document.createElement("option");
          opt.value = cli.nome_completo;
          opt.innerText = cli.nome_completo;
          select.appendChild(opt);
        });
      }
    }
  } catch (e) {
    console.error("Erro ao carregar lista de clientes real:", e);
    populateClientsDropdownMock();
  }
}

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
        inicio,
        fim,
        tipo,
        servico,
        status,
        notas,
        cliente_id,
        clientes (
          nome_completo
        )
      `)
      .eq("cartomante_id", user.id);

    if (error) throw error;

    if (data) {
      agendaEventos = data.map(evt => ({
        id: evt.id,
        cliente_nome: evt.clientes?.nome_completo || null,
        cliente_id: evt.cliente_id,
        servico: evt.servico,
        inicio: evt.inicio,
        fim: evt.fim,
        tipo: evt.tipo || "atendimento",
        notas: evt.notas || "",
        status: evt.status
      }));
    }
  } catch (e) {
    console.warn("Erro ao buscar eventos Supabase. Usando LocalStorage backup.", e);
    loadDemonstrativeEvents();
  }
}

function initViewTabs() {
  const views = ["month", "week", "day"];
  views.forEach(v => {
    const btn = document.getElementById(`btnView${v.charAt(0).toUpperCase() + v.slice(1)}`);
    if (btn) {
      btn.onclick = () => switchCalendarView(v);
    }
  });
}

window.switchCalendarView = function(view) {
  currentView = view;
  
  // Atualiza botões
  document.querySelectorAll(".tab-view-btn").forEach(btn => btn.classList.remove("active"));
  const activeBtn = document.getElementById(`btnView${view.charAt(0).toUpperCase() + view.slice(1)}`);
  if (activeBtn) activeBtn.classList.add("active");

  // Ocultar visões
  document.getElementById("calendarMonthView").style.display = view === "month" ? "block" : "none";
  document.getElementById("calendarWeekView").style.display = view === "week" ? "block" : "none";
  document.getElementById("calendarDayView").style.display = view === "day" ? "block" : "none";

  renderCalendar();
};

window.navigateCalendar = function(direction) {
  if (currentView === "month") {
    currentDate.setMonth(currentDate.getMonth() + direction);
  } else if (currentView === "week") {
    currentDate.setDate(currentDate.getDate() + (direction * 7));
  } else if (currentView === "day") {
    currentDate.setDate(currentDate.getDate() + direction);
    selectedDate = new Date(currentDate);
  }
  renderCalendar();
};

window.goToToday = function() {
  currentDate = new Date(2026, 4, 30); // Vai para a data padrão do sistema
  selectedDate = new Date(2026, 4, 30);
  renderCalendar();
};

// ==========================================================================
// RENDERIZAÇÃO DO CALENDÁRIO
// ==========================================================================
function renderCalendar() {
  const periodLabel = document.getElementById("calendarPeriodLabel");
  if (!periodLabel) return;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  if (currentView === "month") {
    periodLabel.innerText = `${MONTH_NAMES[month]} de ${year}`;
    renderMonthView();
  } else if (currentView === "week") {
    const startOfWeek = getStartOfWeek(currentDate);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    periodLabel.innerText = `${startOfWeek.getDate()} a ${endOfWeek.getDate()} de ${MONTH_NAMES[endOfWeek.getMonth()]} de ${endOfWeek.getFullYear()}`;
    renderWeekView();
  } else if (currentView === "day") {
    const day = currentDate.getDate();
    periodLabel.innerText = `${WEEK_DAYS[currentDate.getDay()]}, ${day} de ${MONTH_NAMES[month]} de ${year}`;
    renderDayView();
  }
}

// 1. RENDER MONTH VIEW
function renderMonthView() {
  const grid = document.getElementById("calendarMonthGrid");
  if (!grid) return;
  grid.innerHTML = "";

  // Cabeçalhos dos dias da semana
  WEEK_DAYS.forEach(day => {
    const header = document.createElement("div");
    header.className = "calendar-day-header-cell";
    header.innerText = day.substring(0, 3);
    grid.appendChild(header);
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const lastDay = new Date(year, month + 1, 0).getDate();

  // Dias do mês anterior para preenchimento
  const prevLastDay = new Date(year, month, 0).getDate();
  for (let i = firstDayIndex; i > 0; i--) {
    const cell = document.createElement("div");
    cell.className = "calendar-month-cell other-month";
    const dayNum = prevLastDay - i + 1;
    cell.innerHTML = `<div class="calendar-month-cell-num">${dayNum}</div>`;
    grid.appendChild(cell);
  }

  // Dias do mês atual
  for (let day = 1; day <= lastDay; day++) {
    const cell = document.createElement("div");
    const cellDate = new Date(year, month, day);
    const isToday = cellDate.toDateString() === new Date(2026, 4, 30).toDateString(); // Simula "hoje" na data do sistema

    cell.className = `calendar-month-cell ${isToday ? 'today-cell' : ''}`;
    
    // Ação ao clicar na célula
    cell.onclick = (e) => {
      // Se clicou em um badge de evento, não abre o modal de criação
      if (e.target.classList.contains("calendar-event-badge")) return;
      selectedDate = cellDate;
      openAgendaModalWithDate(cellDate);
    };

    // Número do dia
    const numDiv = document.createElement("div");
    numDiv.className = "calendar-month-cell-num";
    numDiv.innerText = day;
    cell.appendChild(numDiv);

    // Filtrar eventos deste dia
    const dateStr = cellDate.toISOString().split("T")[0];
    const dayEvents = agendaEventos.filter(evt => {
      if (evt.status === "cancelado") return false;
      const evtDateStr = new Date(evt.inicio).toISOString().split("T")[0];
      return evtDateStr === dateStr;
    });

    // Inserir badges dos eventos
    dayEvents.forEach(evt => {
      const badge = document.createElement("span");
      badge.className = `calendar-event-badge evt-${evt.tipo}`;
      const title = evt.tipo === "atendimento" ? evt.cliente_nome : (evt.notas || evt.tipo);
      const timeStr = new Date(evt.inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      badge.innerText = `[${timeStr}] ${title}`;
      badge.onclick = (e) => {
        e.stopPropagation();
        openAgendaDetailsModal(evt);
      };
      cell.appendChild(badge);
    });

    grid.appendChild(cell);
  }
}

// Helper para pegar início da semana (Domingo)
function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
}

// 2. RENDER WEEK VIEW
function renderWeekView() {
  const grid = document.getElementById("calendarWeekGrid");
  if (!grid) return;
  grid.innerHTML = "";

  // Célula vazia no canto superior esquerdo (cruzamento do cabeçalho de horas e dias)
  const emptyCorner = document.createElement("div");
  emptyCorner.className = "calendar-day-header-cell";
  emptyCorner.innerText = "Hora";
  grid.appendChild(emptyCorner);

  const startOfWeek = getStartOfWeek(currentDate);

  // Cabeçalhos dos dias da semana com data
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(startOfWeek);
    dayDate.setDate(dayDate.getDate() + i);
    weekDates.push(dayDate);

    const header = document.createElement("div");
    header.className = "calendar-day-header-cell";
    header.innerHTML = `${WEEK_DAYS[i].substring(0, 3)} ${dayDate.getDate()}/${dayDate.getMonth() + 1}`;
    grid.appendChild(header);
  }

  // Coluna de horas à esquerda
  const timeCol = document.createElement("div");
  timeCol.className = "calendar-time-col";
  for (let hour = 8; hour <= 21; hour++) {
    const hourCell = document.createElement("div");
    hourCell.className = "calendar-time-cell";
    hourCell.innerText = `${String(hour).padStart(2, '0')}:00`;
    timeCol.appendChild(hourCell);
  }
  grid.appendChild(timeCol);

  // Colunas de dias da semana contendo eventos posicionados
  weekDates.forEach(dayDate => {
    const dayCol = document.createElement("div");
    dayCol.className = "calendar-week-day-col";
    
    // Inserir linhas de hora horizontais de background
    for (let hour = 8; hour <= 21; hour++) {
      const line = document.createElement("div");
      line.className = "calendar-hour-line";
      line.style.top = `${(hour - 8) * 60}px`;
      dayCol.appendChild(line);
    }

    // Clique na coluna para adicionar evento
    dayCol.onclick = (e) => {
      if (e.target !== dayCol) return;
      const rect = dayCol.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      const clickedHour = 8 + Math.floor(clickY / 60);
      const clickedDate = new Date(dayDate);
      clickedDate.setHours(clickedHour, 0, 0, 0);
      selectedDate = clickedDate;
      openAgendaModalWithDateTime(clickedDate);
    };

    // Filtrar e renderizar eventos deste dia
    const dateStr = dayDate.toISOString().split("T")[0];
    const dayEvents = agendaEventos.filter(evt => {
      if (evt.status === "cancelado") return false;
      const evtDateStr = new Date(evt.inicio).toISOString().split("T")[0];
      return evtDateStr === dateStr;
    });

    dayEvents.forEach(evt => {
      const start = new Date(evt.inicio);
      const end = new Date(evt.fim);
      
      const startHour = start.getHours() + (start.getMinutes() / 60);
      const endHour = end.getHours() + (end.getMinutes() / 60);

      // Limitar entre 08:00 e 22:00
      const visibleStart = Math.max(8, startHour);
      const visibleEnd = Math.min(22, endHour);

      if (visibleStart < visibleEnd) {
        const topPx = (visibleStart - 8) * 60;
        const heightPx = (visibleEnd - visibleStart) * 60;

        const eventBlock = document.createElement("div");
        eventBlock.className = `calendar-grid-event-block evt-${evt.tipo}`;
        eventBlock.style.top = `${topPx}px`;
        eventBlock.style.height = `${heightPx}px`;

        const title = evt.tipo === "atendimento" ? evt.cliente_nome : (evt.notas || evt.tipo);
        const timeStr = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

        eventBlock.innerHTML = `
          <span class="event-time">${timeStr}</span>
          <span style="font-weight:700;">${title}</span>
        `;
        eventBlock.onclick = (e) => {
          e.stopPropagation();
          openAgendaDetailsModal(evt);
        };
        dayCol.appendChild(eventBlock);
      }
    });

    grid.appendChild(dayCol);
  });
}

// 3. RENDER DAY VIEW
function renderDayView() {
  const grid = document.getElementById("calendarDayGrid");
  if (!grid) return;
  grid.innerHTML = "";

  // Coluna de horas à esquerda
  const timeCol = document.createElement("div");
  timeCol.className = "calendar-time-col";
  for (let hour = 8; hour <= 21; hour++) {
    const hourCell = document.createElement("div");
    hourCell.className = "calendar-time-cell";
    hourCell.innerText = `${String(hour).padStart(2, '0')}:00`;
    timeCol.appendChild(hourCell);
  }
  grid.appendChild(timeCol);

  // Coluna do dia selecionado
  const dayCol = document.createElement("div");
  dayCol.className = "calendar-week-day-col";
  
  // Inserir linhas de hora horizontais
  for (let hour = 8; hour <= 21; hour++) {
    const line = document.createElement("div");
    line.className = "calendar-hour-line";
    line.style.top = `${(hour - 8) * 60}px`;
    dayCol.appendChild(line);
  }

  dayCol.onclick = (e) => {
    if (e.target !== dayCol) return;
    const rect = dayCol.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const clickedHour = 8 + Math.floor(clickY / 60);
    const clickedDate = new Date(currentDate);
    clickedDate.setHours(clickedHour, 0, 0, 0);
    selectedDate = clickedDate;
    openAgendaModalWithDateTime(clickedDate);
  };

  // Filtrar eventos deste dia
  const dateStr = currentDate.toISOString().split("T")[0];
  const dayEvents = agendaEventos.filter(evt => {
    if (evt.status === "cancelado") return false;
    const evtDateStr = new Date(evt.inicio).toISOString().split("T")[0];
    return evtDateStr === dateStr;
  });

  dayEvents.forEach(evt => {
    const start = new Date(evt.inicio);
    const end = new Date(evt.fim);
    
    const startHour = start.getHours() + (start.getMinutes() / 60);
    const endHour = end.getHours() + (end.getMinutes() / 60);

    const visibleStart = Math.max(8, startHour);
    const visibleEnd = Math.min(22, endHour);

    if (visibleStart < visibleEnd) {
      const topPx = (visibleStart - 8) * 60;
      const heightPx = (visibleEnd - visibleStart) * 60;

      const eventBlock = document.createElement("div");
      eventBlock.className = `calendar-grid-event-block evt-${evt.tipo}`;
      eventBlock.style.top = `${topPx}px`;
      eventBlock.style.height = `${heightPx}px`;

      const title = evt.tipo === "atendimento" ? `${evt.cliente_nome} (${evt.servico})` : (evt.notas || evt.tipo);
      const timeStr = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

      eventBlock.innerHTML = `
        <span class="event-time" style="font-size:0.75rem;">${timeStr}</span>
        <span style="font-weight:700; font-size:0.85rem;">${title}</span>
        ${evt.notas ? `<span style="font-size:0.7rem; font-weight:normal; opacity:0.85;">Obs: ${evt.notas}</span>` : ''}
      `;
      eventBlock.onclick = (e) => {
        e.stopPropagation();
        openAgendaDetailsModal(evt);
      };
      dayCol.appendChild(eventBlock);
    }
  });

  grid.appendChild(dayCol);
}

// ==========================================================================
// MODAL DE NOVO/EDITAR AGENDAMENTO
// ==========================================================================
window.openAgendaModal = function() {
  document.getElementById("agendaEventoId").value = "";
  document.getElementById("agendaModalTitle").innerHTML = '<i class="fas fa-calendar-plus"></i> Sintonizar Agendamento';
  document.getElementById("frmAgenda").reset();
  
  // Data selecionada como padrão
  const dateStr = selectedDate.toISOString().split("T")[0];
  document.getElementById("agendaData").value = dateStr;
  
  // Hora de início aproximada
  const startHourStr = String(selectedDate.getHours() || 14).padStart(2, '0') + ":00";
  const endHourStr = String((selectedDate.getHours() || 14) + 1).padStart(2, '0') + ":00";
  document.getElementById("agendaHoraInicio").value = startHourStr;
  document.getElementById("agendaHoraFim").value = endHourStr;

  toggleAgendaTipoFields("atendimento");
  document.getElementById("agendaModal").classList.add("active");
};

function openAgendaModalWithDate(date) {
  selectedDate = new Date(date);
  window.openAgendaModal();
}

function openAgendaModalWithDateTime(dateTime) {
  selectedDate = new Date(dateTime);
  window.openAgendaModal();
}

window.closeAgendaModal = function() {
  document.getElementById("agendaModal").classList.remove("active");
};

window.toggleAgendaTipoFields = function(tipo) {
  const atFields = document.getElementById("atendimentoFields");
  const titleGroup = document.getElementById("tituloCustomGroup");
  
  if (tipo === "atendimento") {
    atFields.classList.remove("hidden");
    titleGroup.classList.add("hidden");
    document.getElementById("agendaCliente").required = true;
  } else {
    atFields.classList.add("hidden");
    titleGroup.classList.remove("hidden");
    document.getElementById("agendaCliente").required = false;
  }
};

// ==========================================================================
// SUBMISSÃO DO AGENDAMENTO (CRIAR E EDITAR)
// ==========================================================================
window.handleAgendaSubmit = async function(event) {
  event.preventDefault();

  const id = document.getElementById("agendaEventoId").value;
  const tipo = document.getElementById("agendaTipo").value;
  const dateStr = document.getElementById("agendaData").value;
  const startStr = document.getElementById("agendaHoraInicio").value;
  const endStr = document.getElementById("agendaHoraFim").value;
  const notas = document.getElementById("agendaNotas").value.trim();

  let clienteNome = null;
  let servico = null;
  let customTitle = null;

  if (tipo === "atendimento") {
    clienteNome = document.getElementById("agendaCliente").value;
    servico = document.getElementById("agendaServico").value;
    if (!clienteNome || !servico) return alert("Favor selecionar cliente e serviço.");
  } else {
    customTitle = document.getElementById("agendaTituloCustom").value.trim() || tipo;
  }

  const startISO = new Date(`${dateStr}T${startStr}:00`).toISOString();
  const endISO = new Date(`${dateStr}T${endStr}:00`).toISOString();

  const isConnected = await testSupabaseConnection();
  if (isConnected) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let clientObj = null;
      if (tipo === "atendimento") {
        const { data: c } = await supabase
          .from("clientes")
          .select("id")
          .eq("nome_completo", clienteNome)
          .limit(1)
          .single();
        clientObj = c;
      }

      if (id) {
        // UPDATE
        const { error } = await supabase
          .from("agenda_eventos")
          .update({
            tipo,
            cliente_id: clientObj ? clientObj.id : null,
            servico: tipo === "atendimento" ? servico : customTitle,
            inicio: startISO,
            fim: endISO,
            notas
          })
          .eq("id", id);
        if (error) throw error;
      } else {
        // INSERT
        const { error } = await supabase
          .from("agenda_eventos")
          .insert({
            cartomante_id: user.id,
            tipo,
            cliente_id: clientObj ? clientObj.id : null,
            servico: tipo === "atendimento" ? servico : customTitle,
            inicio: startISO,
            fim: endISO,
            status: "confirmado",
            notas
          });
        if (error) throw error;
      }
      await fetchRealEvents();
    } catch (e) {
      console.error("Erro ao sincronizar evento real com Supabase:", e);
      saveLocalEvent(id, tipo, clienteNome, servico, customTitle, startISO, endISO, notas);
    }
  } else {
    // Modo Offline local
    saveLocalEvent(id, tipo, clienteNome, servico, customTitle, startISO, endISO, notas);
  }

  closeAgendaModal();
  renderCalendar();
};

function saveLocalEvent(id, tipo, clienteNome, servico, customTitle, startISO, endISO, notas) {
  if (id) {
    // UPDATE local
    agendaEventos = agendaEventos.map(evt => {
      if (evt.id === id) {
        return {
          ...evt,
          tipo,
          cliente_nome: tipo === "atendimento" ? clienteNome : null,
          servico: tipo === "atendimento" ? servico : customTitle,
          inicio: startISO,
          fim: endISO,
          notas
        };
      }
      return evt;
    });
  } else {
    // INSERT local
    const newEvent = {
      id: "evt-man-" + Date.now(),
      cliente_nome: tipo === "atendimento" ? clienteNome : null,
      servico: tipo === "atendimento" ? servico : customTitle,
      inicio: startISO,
      fim: endISO,
      tipo,
      notas,
      status: "confirmado"
    };
    agendaEventos.push(newEvent);
  }
  localStorage.setItem("cartomante_agenda_eventos", JSON.stringify(agendaEventos));
}

// ==========================================================================
// MODAL DE DETALHES E AÇÕES DE EVENTO
// ==========================================================================
let activeEventInDetails = null;

window.openAgendaDetailsModal = function(evt) {
  activeEventInDetails = evt;
  
  const titleEl = document.getElementById("detailsTitle");
  const badgeEl = document.getElementById("detailsBadge");
  const consulenteRow = document.getElementById("detailsConsulenteRow");
  const servicoRow = document.getElementById("detailsServicoRow");
  const timeRangeEl = document.getElementById("detailsTimeRange");
  const notasEl = document.getElementById("detailsNotas");
  const actionsContainer = document.getElementById("detailsActions");

  const title = evt.tipo === "atendimento" ? evt.cliente_nome : (evt.servico || evt.tipo);
  titleEl.innerText = title;
  
  badgeEl.className = `calendar-event-badge evt-${evt.tipo}`;
  badgeEl.innerText = evt.tipo.toUpperCase().replace("_", " ");

  if (evt.tipo === "atendimento") {
    consulenteRow.style.display = "block";
    document.getElementById("detailsConsulente").innerText = evt.cliente_nome;
    
    servicoRow.style.display = "block";
    document.getElementById("detailsServico").innerText = evt.servico;
  } else {
    consulenteRow.style.display = "none";
    servicoRow.style.display = "none";
  }

  const start = new Date(evt.inicio);
  const end = new Date(evt.fim);
  const dateStr = start.toLocaleDateString();
  const timeStr = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} às ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  timeRangeEl.innerHTML = `<i class="fas fa-clock" style="color:var(--gold-color); margin-right:5px;"></i> ${dateStr} das ${timeStr}`;

  notasEl.innerText = evt.notes || evt.notas || "Nenhuma observação cadastrada.";

  // Renderizar botões de ação dinamicamente
  actionsContainer.innerHTML = "";
  
  if (evt.status === "pendente") {
    actionsContainer.innerHTML = `
      <button class="glass-button" style="border-color:#2ec4b6; color:#2ec4b6;" onclick="acceptSolicitation('${evt.id}')">
        <i class="fas fa-check"></i> Aceitar
      </button>
      <button class="glass-button" style="border-color:#e63946; color:#e63946;" onclick="rejectSolicitation('${evt.id}')">
        <i class="fas fa-times"></i> Recusar
      </button>
    `;
  } else {
    actionsContainer.innerHTML = `
      <button class="glass-button" style="border-color:var(--gold-color); flex:1;" onclick="editEventFromDetails()">
        <i class="fas fa-edit"></i> Editar
      </button>
      <button class="glass-button" style="border-color:#e63946; color:#e63946; flex:1;" onclick="deleteEventFromDetails()">
        <i class="fas fa-trash"></i> Cancelar
      </button>
    `;
  }

  document.getElementById("agendaDetailsModal").classList.add("active");
};

window.closeAgendaDetailsModal = function() {
  document.getElementById("agendaDetailsModal").classList.remove("active");
};

window.editEventFromDetails = function() {
  if (!activeEventInDetails) return;
  const evt = activeEventInDetails;
  closeAgendaDetailsModal();

  document.getElementById("agendaEventoId").value = evt.id;
  document.getElementById("agendaModalTitle").innerHTML = '<i class="fas fa-edit"></i> Sintonizar Agendamento';
  
  document.getElementById("agendaTipo").value = evt.tipo;
  toggleAgendaTipoFields(evt.tipo);

  if (evt.tipo === "atendimento") {
    document.getElementById("agendaCliente").value = evt.cliente_nome || "";
    document.getElementById("agendaServico").value = evt.servico || "";
  } else {
    document.getElementById("agendaTituloCustom").value = evt.servico || "";
  }

  const start = new Date(evt.inicio);
  const end = new Date(evt.fim);

  document.getElementById("agendaData").value = start.toISOString().split("T")[0];
  document.getElementById("agendaHoraInicio").value = start.toTimeString().substring(0, 5);
  document.getElementById("agendaHoraFim").value = end.toTimeString().substring(0, 5);
  
  document.getElementById("agendaNotas").value = evt.notes || evt.notas || "";

  document.getElementById("agendaModal").classList.add("active");
};

window.deleteEventFromDetails = async function() {
  if (!activeEventInDetails) return;
  const id = activeEventInDetails.id;
  
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
      agendaEventos = agendaEventos.map(evt => evt.id === id ? { ...evt, status: "cancelado" } : evt);
      localStorage.setItem("cartomante_agenda_eventos", JSON.stringify(agendaEventos));
    }
  } else {
    agendaEventos = agendaEventos.map(evt => evt.id === id ? { ...evt, status: "cancelado" } : evt);
    localStorage.setItem("cartomante_agenda_eventos", JSON.stringify(agendaEventos));
  }

  closeAgendaDetailsModal();
  renderCalendar();
};

window.acceptSolicitation = async function(id) {
  const evt = agendaEventos.find(x => x.id === id);
  if (evt && evt.cliente_id) {
    const isConnected = await testSupabaseConnection();
    let currentCartomanteId = "cartomante-luana";
    if (isConnected) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) currentCartomanteId = user.id;
      } catch(e){}
    }
    const hasGlobalPendency = await checkClientGlobalPendency(evt.cliente_id, currentCartomanteId);
    if (hasGlobalPendency) {
      if (!confirm("Este cliente possui pendência financeira ativa com outro cartomante. Deseja continuar mesmo assim?")) {
        alert("No momento, este atendimento não pôde ser iniciado. Verifique suas pendências ou tente novamente mais tarde.");
        await rejectSolicitation(id, true);
        return;
      }
    }
  }

  const isConnected = await testSupabaseConnection();
  if (isConnected) {
    try {
      const { error } = await supabase
        .from("agenda_eventos")
        .update({ status: "confirmado" })
        .eq("id", id);
      if (error) throw error;
      await fetchRealEvents();
    } catch (e) {
      console.error("Erro ao aceitar solicitação no Supabase:", e);
      agendaEventos = agendaEventos.map(evt => evt.id === id ? { ...evt, status: "confirmado" } : evt);
      localStorage.setItem("cartomante_agenda_eventos", JSON.stringify(agendaEventos));
    }
  } else {
    agendaEventos = agendaEventos.map(evt => evt.id === id ? { ...evt, status: "confirmado" } : evt);
    localStorage.setItem("cartomante_agenda_eventos", JSON.stringify(agendaEventos));
  }

  closeAgendaDetailsModal();
  renderCalendar();
};

window.rejectSolicitation = async function(id, autoReject = false) {
  if (!autoReject && !confirm("Deseja recusar esta solicitação de atendimento?")) return;
  const isConnected = await testSupabaseConnection();
  if (isConnected) {
    try {
      const { error } = await supabase
        .from("agenda_eventos")
        .update({ status: "recusado" })
        .eq("id", id);
      if (error) throw error;
      await fetchRealEvents();
    } catch (e) {
      console.error("Erro ao recusar no Supabase:", e);
      agendaEventos = agendaEventos.map(evt => evt.id === id ? { ...evt, status: "recusado" } : evt);
      localStorage.setItem("cartomante_agenda_eventos", JSON.stringify(agendaEventos));
    }
  } else {
    agendaEventos = agendaEventos.map(evt => evt.id === id ? { ...evt, status: "recusado" } : evt);
    localStorage.setItem("cartomante_agenda_eventos", JSON.stringify(agendaEventos));
  }

  closeAgendaDetailsModal();
  renderCalendar();
};
