// client_area.js - Controle principal da Área do Consulente (Cliente) com Abas Expandidas
// ----------------------------------------------------------------------------------
const SUPABASE_URL = (window.ENV && window.ENV.SUPABASE_URL) || "https://YOUR_PROJECT_REF.supabase.co";
const SUPABASE_ANON_KEY = (window.ENV && window.ENV.SUPABASE_ANON_KEY) || "YOUR_PUBLIC_ANON_KEY";

// Initialize Supabase client
let supabase = null;
try {
  supabase = supabaseCreateClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) {
  console.warn("Erro ao inicializar Supabase no client_area.js", e);
}

// Helper to create Supabase client via CDN
function supabaseCreateClient(url, key) {
  if (typeof window.supabase !== "undefined") {
    return window.supabase.createClient(url, key);
  }
  return null;
}

// Global state
let loggedClient = null;
let cartomantesList = [];
let conversasList = [];

// Tab switching controller
window.switchClientTab = async function(tabId) {
  document.querySelectorAll('.client-menu-item').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelectorAll('.tab-section').forEach(sec => {
    sec.classList.remove('active');
    sec.classList.add('hidden');
  });

  // Activate menu button
  const matchingBtn = document.getElementById(`menu-${tabId}`);
  if (matchingBtn) matchingBtn.classList.add('active');

  const matchingSec = document.getElementById(`tab-${tabId}`);
  if (matchingSec) {
    matchingSec.classList.remove('hidden');
    matchingSec.classList.add('active');
  }

  // Load tab-specific data dynamically
  if (loggedClient) {
    switch (tabId) {
      case "inicio":
        await loadInicioTab();
        break;
      case "cartomantes":
        await fetchCartomantes();
        break;
      case "chat":
        await loadChatTab();
        break;
      case "perguntas":
        await loadPerguntasTab();
        break;
      case "atendimentos":
        await loadAtendimentosTab();
        break;
      case "arquivos":
        await loadArquivosTab();
        break;
      case "servicos-contratados":
        await loadServicosContratadosTab();
        break;
    }
  }
};

// Check authentication on load
async function checkAuthAndLoadProfile() {
  const isConnected = supabase ? await testSupabaseConnection() : false;
  if (!isConnected) {
    console.warn("Supabase indisponível. Carregando modo demonstrativo na área do cliente.");
    const demoClient = localStorage.getItem("demo_logged_client");
    if (demoClient) {
      loggedClient = JSON.parse(demoClient);
    } else {
      loggedClient = {
        id: "demo-client-1",
        nome_completo: "Consulente de Teste",
        email: "cliente@templo.com",
        celular: "(11) 99999-9999",
        foto_url: "assets/img/default-avatar.png",
        religiao: "Espiritualista"
      };
      localStorage.setItem("demo_logged_client", JSON.stringify(loggedClient));
    }
    
    const nameBadge = document.getElementById("clientNameBadge");
    if (nameBadge) nameBadge.textContent = loggedClient.nome_completo;
    populateProfileForm(loggedClient);
    await loadInicioTab();
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  // Load client
  const { data: client, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar perfil do cliente:", error);
  }

  if (!client) {
    window.location.href = "login.html";
    return;
  }

  loggedClient = client;

  // Name badge
  const nameBadge = document.getElementById("clientNameBadge");
  if (nameBadge) nameBadge.textContent = client.nome_completo;

  // Populate profile form
  populateProfileForm(client);

  // Load initial tab
  await loadInicioTab();
}

// Populate profile fields
function populateProfileForm(client) {
  setValue("profile_nome", client.nome_completo);
  setValue("profile_celular", client.celular);
  setValue("profile_nascimento", client.data_nascimento);
  setValue("profile_religiao", client.religiao);
  setValue("profile_sexo", client.sexo);
  setValue("profile_pronome", client.pronome);
  setValue("profile_estado_civil", client.estado_civil);
  setValue("profile_guia", client.guia_espiritual);
  setValue("profile_pai_mae", client.pai_mae_cabeca);
  setValue("profile_tradicao", client.tradicao_espiritual);
  setValue("profile_foto_url", client.foto_url);

  toggleReligiousExtras(client.religiao);
}

function setValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val || "";
}

function toggleReligiousExtras(religiao) {
  const extras = document.getElementById("profileReligiaoExtras");
  if (!extras) return;
  const show = ["Umbanda", "Candomblé", "Quimbanda", "Wicca", "Xamanismo", "Espiritualista"].includes(religiao);
  if (show) {
    extras.classList.remove("hidden");
  } else {
    extras.classList.add("hidden");
  }
}

// Reactively show extra spiritual fields
const profileReligiao = document.getElementById("profile_religiao");
if (profileReligiao) {
  profileReligiao.addEventListener("change", () => {
    toggleReligiousExtras(profileReligiao.value);
  });
}

// Save profile update
const profileForm = document.getElementById("clientProfileForm");
if (profileForm) {
  profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!supabase || !loggedClient) return;

    const saveBtn = document.getElementById("saveProfileBtn");
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Atualizando...';
    }

    const religiaoVal = document.getElementById("profile_religiao").value;
    const isMistic = ["Umbanda", "Candomblé", "Quimbanda", "Wicca", "Xamanismo", "Espiritualista"].includes(religiaoVal);

    const updatedData = {
      nome_completo: document.getElementById("profile_nome").value.trim(),
      celular: document.getElementById("profile_celular").value.trim(),
      data_nascimento: document.getElementById("profile_nascimento").value || null,
      religiao: religiaoVal || null,
      sexo: document.getElementById("profile_sexo").value || null,
      pronome: document.getElementById("profile_pronome").value.trim() || null,
      estado_civil: document.getElementById("profile_estado_civil").value.trim() || null,
      guia_espiritual: isMistic ? document.getElementById("profile_guia").value.trim() || null : null,
      pai_mae_cabeca: isMistic ? document.getElementById("profile_pai_mae").value.trim() || null : null,
      tradicao_espiritual: isMistic ? document.getElementById("profile_tradicao").value.trim() || null : null,
      foto_url: document.getElementById("profile_foto_url").value.trim() || "assets/img/default-avatar.png",
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from("clientes")
      .update(updatedData)
      .eq("id", loggedClient.id);

    if (error) {
      alert("Erro ao atualizar dados: " + error.message);
    } else {
      alert("Ficha espiritual atualizada com sucesso!");
      loggedClient = { ...loggedClient, ...updatedData };
      const nameBadge = document.getElementById("clientNameBadge");
      if (nameBadge) nameBadge.textContent = loggedClient.nome_completo;

      try {
        // Obter cartomantes vinculadas para salvar histórico e notificações
        const { data: vinculos } = await supabase
          .from("cartomante_clientes")
          .select("cartomante_id, cartomantes(id, user_id)")
          .eq("cliente_id", loggedClient.id);

        if (vinculos && vinculos.length > 0) {
          for (const v of vinculos) {
            const cId = v.cartomantes?.id || v.cartomante_id;
            const uId = v.cartomantes?.user_id;

            // Registrar no Histórico de Ações
            await supabase.from("historico_acoes").insert([{
              cartomante_id: cId,
              cliente_id: loggedClient.id,
              acao: "Alteração de Ficha Cadastral",
              detalhes: `O consulente ${updatedData.nome_completo} atualizou sua ficha cadastral/espiritual.`
            }]);

            // Enviar Notificação para o user_id da Cartomante
            if (uId) {
              await supabase.from("notificacoes").insert([{
                user_id: uId,
                titulo: "Ficha Cadastral Atualizada",
                mensagem: `O consulente ${updatedData.nome_completo} atualizou os dados da sua ficha cadastral/espiritual.`,
                tipo: "sistema"
              }]);
            }
          }
        }
      } catch (err) {
        console.warn("Erro ao gerar logs/notificações de cadastro:", err);
      }
    }

    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="fas fa-save"></i> Atualizar Minha Ficha';
    }
  });
}

// --------------------------------------------------
// TAB 1: INÍCIO (DASHBOARD ACOLHEDOR DO CLIENTE)
// --------------------------------------------------
async function loadInicioTab() {
  if (!supabase || !loggedClient) return;

  // 1. Carregar Conversas Recentes (limit 3)
  const { data: convs, error: convErr } = await supabase
    .from("conversas")
    .select("id, cartomante_id, created_at")
    .eq("cliente_id", loggedClient.id)
    .order("created_at", { ascending: false })
    .limit(3);

  const chatsDiv = document.getElementById("overviewChats");
  if (chatsDiv) {
    chatsDiv.innerHTML = "";
    if (convs && convs.length > 0) {
      for (const c of convs) {
        // Buscar nome da cartomante
        const { data: cart } = await supabase
          .from("cartomantes")
          .select("nome, foto_url")
          .eq("user_id", c.cartomante_id)
          .maybeSingle();

        const card = document.createElement("a");
        card.href = `client_chat.html?cid=${c.id}`;
        card.className = "chat-list-item";
        card.innerHTML = `
          <div style="display:flex; align-items:center; gap:12px;">
            <img src="${cart?.foto_url || "assets/img/default-avatar.png"}" style="width:40px; height:40px; border-radius:50%; object-fit:cover; border:1px solid var(--gold-color);"/>
            <div>
              <div style="font-weight:600; font-size:0.9rem; color:var(--gold-color);">${cart?.nome || "Oraculista"}</div>
              <div style="font-size:0.75rem; color:var(--text-muted);">Clique para continuar a consulta</div>
            </div>
          </div>
          <i class="fas fa-chevron-right" style="color:var(--text-muted); font-size:0.8rem;"></i>
        `;
        chatsDiv.appendChild(card);
      }
    } else {
      chatsDiv.innerHTML = `<p style="font-size:0.8rem; color:var(--text-secondary); font-style:italic; margin:0;">Nenhum diálogo místico ativo. Encontre uma cartomante no catálogo!</p>`;
    }
  }

  // 2. Carregar Perguntas ao Baralho Pendentes
  const { data: questions } = await supabase
    .from("perguntas_baralho")
    .select("id, pergunta_principal, status, conversa_id")
    .eq("cliente_id", loggedClient.id)
    .in("status", ["enviada", "aguardando_pagamento", "paga"])
    .order("created_at", { ascending: false })
    .limit(3);

  const qDiv = document.getElementById("overviewQuestions");
  if (qDiv) {
    qDiv.innerHTML = "";
    if (questions && questions.length > 0) {
      questions.forEach(q => {
        const item = document.createElement("a");
        item.href = `client_chat.html?cid=${q.conversa_id}`;
        item.className = "chat-list-item";
        
        let statusText = q.status === "enviada" ? "Enviada" : (q.status === "paga" ? "Sintonizando" : "Aguardando Troca");
        let badgeStyle = q.status === "paga" ? "color:#2ecc71;" : "color:#f1c40f;";

        item.innerHTML = `
          <div>
            <div style="font-size:0.85rem; font-weight:600; color:var(--text-primary);">${q.pergunta_principal}</div>
            <div style="font-size:0.72rem; ${badgeStyle} font-weight:500;"><i class="fas fa-circle" style="font-size:0.5rem; margin-right:5px;"></i> ${statusText}</div>
          </div>
          <i class="fas fa-chevron-right" style="color:var(--text-muted); font-size:0.8rem;"></i>
        `;
        qDiv.appendChild(item);
      });
    } else {
      qDiv.innerHTML = `<p style="font-size:0.8rem; color:var(--text-secondary); font-style:italic; margin:0;">Nenhuma pergunta pendente de resposta.</p>`;
    }
  }

  // 3. Carregar Agendamento Próximo
  const { data: agenda } = await supabase
    .from("agenda_eventos")
    .select("inicio, cartomante_id")
    .eq("cliente_id", loggedClient.id)
    .gt("inicio", new Date().toISOString())
    .order("inicio", { ascending: true })
    .limit(1)
    .maybeSingle();

  const agendDiv = document.getElementById("overviewAgendamento");
  if (agendDiv) {
    agendDiv.innerHTML = "";
    if (agenda) {
      const { data: cart } = await supabase
        .from("cartomantes")
        .select("nome")
        .eq("user_id", agenda.cartomante_id)
        .maybeSingle();

      const dataStr = new Date(agenda.inicio).toLocaleDateString('pt-BR');
      const horaStr = new Date(agenda.inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      agendDiv.innerHTML = `
        <div class="chat-list-item" style="flex-direction:column; align-items:flex-start; gap:10px;">
          <div style="font-size:0.85rem; font-weight:600; color:var(--gold-color);"><i class="far fa-calendar-check" style="margin-right:8px;"></i> ${dataStr} às ${horaStr}</div>
          <div style="font-size:0.75rem; color:var(--text-secondary);">Consulta agendada com <strong>${cart?.nome || "Oraculista"}</strong></div>
        </div>
      `;
    } else {
      agendDiv.innerHTML = `<p style="font-size:0.8rem; color:var(--text-secondary); font-style:italic; margin:0;">Nenhuma leitura agendada para os próximos dias.</p>`;
    }
  }
}

// --------------------------------------------------
// TAB 2: CARTOMANTES (BUSCA E CATÁLOGO)
// --------------------------------------------------
async function testSupabaseConnection() {
  if (!supabase || SUPABASE_URL.includes("YOUR_PROJECT_REF")) return false;
  try {
    const { data, error } = await supabase.from("clientes").select("id").limit(1);
    return error ? false : true;
  } catch (e) {
    return false;
  }
}

async function fetchCartomantes() {
  const isConnected = supabase ? await testSupabaseConnection() : false;
  if (!isConnected) {
    console.warn("Supabase indisponível no catálogo. Carregando modo demonstrativo.");
    loadDemoCartomantes();
    return;
  }

  const { data, error } = await supabase
    .from("cartomantes")
    .select("*")
    .order("nome", { ascending: true });

  if (error) {
    console.error("Erro ao carregar oraculistas:", error);
    loadDemoCartomantes();
    return;
  }

  cartomantesList = data || [];
  
  // Buscar os perfis públicos e configurações de chat
  for (const c of cartomantesList) {
    const { data: perfil } = await supabase
      .from("perfis_publicos")
      .select("slug, redes_sociais")
      .eq("cartomante_id", c.user_id)
      .maybeSingle();
    c.slug = perfil?.slug;
    c.categorias = perfil?.redes_sociais?.categorias || [];

    // Buscar configurações de chat do banco de dados
    const { data: config } = await supabase
      .from("configuracoes_chat")
      .select("modo_esgotamento, horario_inicio, horario_fim, pausa_automatica")
      .eq("cartomante_id", c.user_id)
      .maybeSingle();
    c.config = config || { modo_esgotamento: false, horario_inicio: "09:00", horario_fim: "21:00", pausa_automatica: false };
  }

  renderCartomantes(cartomantesList);
}

function loadDemoCartomantes() {
  cartomantesList = [
    {
      user_id: "cartomante-luana",
      nome: "Luana Carito",
      funcao: "Sacerdotisa / Oraculista",
      foto_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop",
      bio: "Sacerdotisa dos caminhos, sintonizando sua frequência com a luz do oráculo para revelar segredos da alma.",
      slug: "luana-carito",
      categorias: ["Tarot", "Baralho Cigano", "Espiritualidade"],
      config: { modo_esgotamento: false, horario_inicio: "09:00", horario_fim: "21:00", pausa_automatica: false }
    },
    {
      user_id: "cartomante-morgana",
      nome: "Morgana das Runas",
      funcao: "Runóloga / Bruxa Wicca",
      foto_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop",
      bio: "Conexão com os sussurros de Odin e a magia das runas antigas. Tiragens para caminhos e decisões difíceis.",
      slug: "morgana-runas",
      categorias: ["Oráculos", "Wicca", "Terapias Holísticas"],
      config: { modo_esgotamento: true, horario_inicio: "10:00", horario_fim: "18:00", pausa_automatica: false }
    },
    {
      user_id: "cartomante-solange",
      nome: "Solange Astrologia",
      funcao: "Astróloga / Terapeuta",
      foto_url: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=150&auto=format&fit=crop",
      bio: "Estudo dos astros e revolução solar. Alinhando a órbita da sua vida às influências celestes.",
      slug: "solange-astros",
      categorias: ["Astrologia", "Numerologia"],
      config: { modo_esgotamento: false, horario_inicio: "09:00", horario_fim: "17:00", pausa_automatica: true }
    }
  ];
  renderCartomantes(cartomantesList);
}

function renderCartomantes(list) {
  const container = document.getElementById("cartomanteList");
  if (!container) return;

  container.innerHTML = "";
  if (list.length === 0) {
    container.innerHTML = `<p style="font-family:var(--font-classic); font-style:italic; color:var(--text-secondary);">Nenhuma oraculista sintonizada.</p>`;
    return;
  }

  list.forEach(c => {
    const card = document.createElement("div");
    card.className = "cartomante-card";
    
    const catsHTML = c.categorias?.map(cat => `<span class="category-badge" style="font-size:0.65rem; padding:2px 6px;">${cat}</span>`).join(" ") || "";

    // Determinar Status de Atendimento Dinâmico
    let status = "online";
    let statusText = "Online";
    let badgeClass = "badge-online";
    let buttonText = "Conversar";
    let buttonClass = "btn-conversar-online";
    let buttonDisabled = "";

    const cfg = c.config || { modo_esgotamento: false, horario_inicio: "09:00", horario_fim: "21:00", pausa_automatica: false };
    
    // Validar horário de atendimento
    const now = new Date();
    const nowHHMM = String(now.getHours()).padStart(2, '0') + ":" + String(now.getMinutes()).padStart(2, '0');
    const isWorkingHours = nowHHMM >= cfg.horario_inicio && nowHHMM <= cfg.horario_fim;
    
    if (cfg.pausa_automatica || !isWorkingHours) {
      status = "offline";
      statusText = "Offline";
      badgeClass = "badge-offline";
      buttonText = "Indisponível";
      buttonClass = "btn-conversar-offline";
      buttonDisabled = "disabled";
    } else if (cfg.modo_esgotamento) {
      status = "ocupado";
      statusText = "Fila de Espera";
      badgeClass = "badge-ocupado";
      buttonText = "Fila de Espera";
      buttonClass = "btn-conversar-ocupado";
    }

    const badgeHTML = `<span class="mystic-status-badge ${badgeClass}"><span class="pulse-dot"></span> ${statusText}</span>`;

    card.innerHTML = `
      <div style="display:flex; gap:12px; align-items:center; justify-content:space-between; width:100%;">
        <div style="display:flex; gap:12px; align-items:center;">
          <img src="${c.foto_url || "assets/img/default-avatar.png"}" alt="${c.nome}" class="cartomante-photo" style="width:55px; height:55px; border-radius:50%; object-fit:cover; border:2px solid var(--gold-color);" />
          <div>
            <h3 style="font-family:var(--font-decorative); color:var(--gold-color); font-size:1.05rem; margin:0;">${c.nome}</h3>
            <span style="font-size:0.75rem; color:var(--text-muted);">${c.funcao || "Oraculista"}</span>
          </div>
        </div>
        <div>
          ${badgeHTML}
        </div>
      </div>
      <div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:10px;">
        ${catsHTML}
      </div>
      <p style="font-family:var(--font-classic); font-size:0.8rem; color:var(--text-secondary); line-height:1.4; margin:8px 0 12px 0; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; text-overflow:ellipsis; height:36px;">
        "${c.bio}"
      </p>
      <div style="display:flex; gap:10px; margin-top:auto; flex-wrap: wrap;">
        <a href="public_profile.html?slug=${c.slug || "luana-carito"}" class="glass-button" style="flex:1; justify-content:center; font-size:0.72rem; padding:8px; min-width: 80px;"><i class="fas fa-eye"></i> Templo</a>
        <button onclick="openBookingForCartomante('${c.user_id}', '${c.nome.replace(/'/g, "\\'")}')" class="glass-button" style="flex:1; justify-content:center; font-size:0.72rem; padding:8px; min-width: 80px; border-color: rgba(255,255,255,0.15);"><i class="fas fa-calendar-check"></i> Agendar</button>
        <button onclick="${status !== 'offline' ? `startConversa('${c.user_id}')` : ''}" class="glass-button ${buttonClass}" style="flex:1.2; justify-content:center; font-size:0.72rem; padding:8px; min-width: 100px;" ${buttonDisabled}><i class="fas fa-comments"></i> ${buttonText}</button>
      </div>
    `;
    container.appendChild(card);
  });
}

// Search filter
const searchInput = document.getElementById("searchCartomante");
if (searchInput) {
  searchInput.addEventListener("input", () => {
    const term = searchInput.value.toLowerCase().trim();
    if (!term) {
      renderCartomantes(cartomantesList);
      return;
    }

    const filtered = cartomantesList.filter(c => 
      c.nome.toLowerCase().includes(term) || 
      (c.funcao && c.funcao.toLowerCase().includes(term)) ||
      (c.bio && c.bio.toLowerCase().includes(term)) ||
      (c.categorias && c.categorias.some(cat => cat.toLowerCase().includes(term)))
    );
    renderCartomantes(filtered);
  });
}

// --------------------------------------------------
// TAB 3: CHAT / HISTÓRICO DE CONVERSAS
// --------------------------------------------------
async function loadChatTab() {
  if (!supabase || !loggedClient) return;

  const { data: convs, error } = await supabase
    .from("conversas")
    .select("id, cartomante_id, created_at")
    .eq("cliente_id", loggedClient.id)
    .order("created_at", { ascending: false });

  const container = document.getElementById("chatHistoryList");
  if (!container) return;

  container.innerHTML = "";
  if (error || !convs || convs.length === 0) {
    container.innerHTML = `
      <div class="chat-empty-state" style="padding: 40px; text-align: center; color: var(--text-secondary);">
        <i class="fas fa-comments" style="font-size: 2rem; color: var(--gold-color); margin-bottom: 10px;"></i>
        <p style="font-family: var(--font-classic); font-style: italic;">Nenhuma conversa iniciada. Encontre oraculistas no catálogo de templos.</p>
      </div>
    `;
    return;
  }

  for (const c of convs) {
    const { data: cart } = await supabase
      .from("cartomantes")
      .select("nome, foto_url, funcao")
      .eq("user_id", c.cartomante_id)
      .maybeSingle();

    const item = document.createElement("a");
    item.href = `client_chat.html?cid=${c.id}`;
    item.className = "chat-list-item";
    
    item.innerHTML = `
      <div style="display:flex; align-items:center; gap:15px;">
        <img src="${cart?.foto_url || "assets/img/default-avatar.png"}" style="width:50px; height:50px; border-radius:50%; object-fit:cover; border:1px solid var(--gold-color);"/>
        <div>
          <div style="font-weight:600; font-size:0.95rem; color:var(--gold-color);">${cart?.nome || "Oraculista"}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">${cart?.funcao || "Oraculista"}</div>
        </div>
      </div>
      <span class="glass-button" style="font-size:0.75rem; padding:6px 12px; border-color:var(--gold-color);">Conversar <i class="fas fa-arrow-right" style="margin-left:5px;"></i></span>
    `;
    container.appendChild(item);
  }
}

// --------------------------------------------------
// TAB 4: PERGUNTAS AO BARALHO (CENTRAL)
// --------------------------------------------------
async function loadPerguntasTab() {
  if (!supabase || !loggedClient) return;

  const { data: questions, error } = await supabase
    .from("perguntas_baralho")
    .select("id, pergunta_principal, status, valor, created_at, conversa_id, cartomante_id")
    .eq("cliente_id", loggedClient.id)
    .order("created_at", { ascending: false });

  const container = document.getElementById("perguntasList");
  if (!container) return;

  container.innerHTML = "";
  if (error || !questions || questions.length === 0) {
    container.innerHTML = `
      <div class="chat-empty-state" style="padding: 40px; text-align: center; color: var(--text-secondary);">
        <i class="fas fa-crown" style="font-size: 2.2rem; color: var(--gold-color); margin-bottom: 10px;"></i>
        <p style="font-family: var(--font-classic); font-style: italic;">Nenhuma Pergunta ao Baralho enviada ainda.</p>
      </div>
    `;
    return;
  }

  for (const q of questions) {
    const { data: cart } = await supabase
      .from("cartomantes")
      .select("nome")
      .eq("user_id", q.cartomante_id)
      .maybeSingle();

    const card = document.createElement("a");
    card.href = `client_chat.html?cid=${q.conversa_id}`;
    card.className = "chat-list-item";
    
    let statusLabel = "";
    let colorStyle = "";
    switch (q.status) {
      case "enviada": statusLabel = "Enviada"; colorStyle = "color:#3498db;"; break;
      case "aguardando_pagamento": statusLabel = "Aguardando Troca"; colorStyle = "color:#f1c40f;"; break;
      case "paga": statusLabel = "Paga / Sintonizando"; colorStyle = "color:#2ecc71;"; break;
      case "respondida": statusLabel = "Respondida"; colorStyle = "color:#9b59b6;"; break;
      case "cancelada": statusLabel = "Cancelada"; colorStyle = "color:#e74c3c;"; break;
    }

    const dataStr = new Date(q.created_at).toLocaleDateString('pt-BR');

    card.innerHTML = `
      <div style="flex:1;">
        <div style="font-size:0.88rem; font-weight:600; color:var(--gold-color); margin-bottom:4px;">"${q.pergunta_principal}"</div>
        <div style="font-size:0.75rem; color:var(--text-secondary);">Para: <strong>${cart?.nome || "Oraculista"}</strong> • Enviado em: ${dataStr}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:0.72rem; ${colorStyle} font-weight:600; text-transform:uppercase;">${statusLabel}</div>
        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">R$ ${q.valor.toFixed(2).replace('.', ',')}</div>
      </div>
    `;
    container.appendChild(card);
  }
}

// --------------------------------------------------
// TAB 5: ATENDIMENTOS (AGENDAMENTOS)
// --------------------------------------------------
async function loadAtendimentosTab() {
  if (!loggedClient) return;

  const container = document.getElementById("atendimentosList");
  if (!container) return;

  container.innerHTML = "";

  const isConnected = supabase ? await testSupabaseConnection() : false;
  let appointments = [];

  if (isConnected) {
    try {
      const { data, error } = await supabase
        .from("agenda_eventos")
        .select("id, inicio, fim, cartomante_id, status")
        .eq("cliente_id", loggedClient.id)
        .order("inicio", { ascending: false });
      if (!error) {
        appointments = data || [];
      }
    } catch (e) {
      console.warn("Erro ao carregar agendamentos do Supabase:", e);
    }
  }

  if (appointments.length === 0) {
    const localDb = JSON.parse(localStorage.getItem("cartomante_agenda_eventos") || "[]");
    appointments = localDb.filter(e => e.cliente_id === loggedClient.id);
  }

  if (appointments.length === 0) {
    container.innerHTML = `
      <div class="chat-empty-state" style="padding: 40px; text-align: center; color: var(--text-secondary);">
        <i class="fas fa-calendar-check" style="font-size: 2rem; color: var(--gold-color); margin-bottom: 10px;"></i>
        <p style="font-family: var(--font-classic); font-style: italic;">Você não possui nenhum horário de agendamento registrado.</p>
      </div>
    `;
    return;
  }

  for (const e of appointments) {
    let cartomanteNome = "Oraculista";
    if (isConnected) {
      try {
        const { data: cart } = await supabase
          .from("cartomantes")
          .select("nome")
          .eq("user_id", e.cartomante_id)
          .maybeSingle();
        if (cart) cartomanteNome = cart.nome;
      } catch(e){}
    } else {
      const storedCartomantes = JSON.parse(localStorage.getItem("demo_cartomantes") || "[]");
      const localCart = storedCartomantes.find(c => c.user_id === e.cartomante_id);
      cartomanteNome = localCart ? localCart.nome : "Luana Carito";
    }

    const dataStr = new Date(e.inicio).toLocaleDateString('pt-BR');
    const horaStr = new Date(e.inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isFuture = new Date(e.inicio) > new Date();

    const card = document.createElement("div");
    card.className = "chat-list-item";
    card.style.flexDirection = "column";
    card.style.alignItems = "flex-start";
    card.style.gap = "8px";

    let statusLabel = "";
    let statusColor = "";
    let detailText = `Consulta Ritualística com <strong>${cartomanteNome}</strong>`;

    if (e.status === "recusado") {
      statusLabel = "Indisponível";
      statusColor = "#ff8888";
      detailText = `<span style="color:#ff8888; font-family: var(--font-classic); font-style: italic;">No momento, este atendimento não pôde ser iniciado. Verifique suas pendências ou tente novamente mais tarde.</span>`;
    } else {
      statusLabel = isFuture ? 'Confirmado' : 'Realizado';
      statusColor = isFuture ? '#2ecc71' : '#a29bfe';
    }

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; width:100%; align-items:center; flex-wrap:wrap; gap:10px;">
        <div>
          <div style="font-weight:600; font-size:0.9rem; color:var(--gold-color);"><i class="far fa-calendar-alt"></i> ${dataStr} às ${horaStr}</div>
          <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:2px;">${detailText}</div>
        </div>
        <span style="font-size:0.72rem; font-weight:600; text-transform:uppercase; color:${statusColor};">${statusLabel}</span>
      </div>
    `;
    container.appendChild(card);
  }
}

// --------------------------------------------------
// TAB 6: ARQUIVOS RECEBIDOS (GALERIA)
// --------------------------------------------------
async function loadArquivosTab() {
  if (!supabase || !loggedClient) return;

  // Buscar todas as conversas do cliente
  const { data: convs } = await supabase
    .from("conversas")
    .select("id")
    .eq("cliente_id", loggedClient.id);

  const container = document.getElementById("arquivosGallery");
  if (!container) return;

  container.innerHTML = "";

  if (!convs || convs.length === 0) {
    container.innerHTML = `<p style="font-family:var(--font-classic); font-style:italic; color:var(--text-secondary);">Nenhum arquivo recebido.</p>`;
    return;
  }

  const convIds = convs.map(c => c.id);

  // Buscar mensagens com arquivo nestas conversas
  const { data: messages, error } = await supabase
    .from("mensagens")
    .select("arquivo_url, arquivo_nome, arquivo_tipo, created_at, conversa_id")
    .in("conversa_id", convIds)
    .not("arquivo_url", "is", null);

  if (error || !messages || messages.length === 0) {
    container.innerHTML = `
      <div style="grid-column: span 3; text-align: center; padding: 40px; color: var(--text-secondary);">
        <i class="fas fa-photo-film" style="font-size: 2.2rem; color: var(--gold-color); margin-bottom: 10px; display:block;"></i>
        <p style="font-family: var(--font-classic); font-style: italic;">Nenhuma revelação em imagem, áudio ou PDF enviada pelas oraculistas ainda.</p>
      </div>
    `;
    return;
  }

  messages.forEach(m => {
    const card = document.createElement("div");
    card.className = "file-gallery-card glass-panel";

    let icon = "fa-file";
    if (m.arquivo_tipo === "imagem") icon = "fa-image";
    else if (m.arquivo_tipo === "audio") icon = "fa-volume-high";
    else if (m.arquivo_tipo === "pdf") icon = "fa-file-pdf";

    const dataStr = new Date(m.created_at).toLocaleDateString('pt-BR');

    card.innerHTML = `
      <i class="fas ${icon} file-gallery-icon"></i>
      <div style="font-size:0.75rem; font-weight:600; color:var(--text-primary); text-overflow:ellipsis; overflow:hidden; white-space:nowrap; width:100%;" title="${m.arquivo_nome}">${m.arquivo_nome || "Arquivo"}</div>
      <div style="font-size:0.65rem; color:var(--text-muted);">${dataStr}</div>
      <a href="${m.arquivo_url}" target="_blank" class="glass-button" style="font-size:0.68rem; padding:4px; margin-top:5px; justify-content:center; border-color:var(--gold-color);">
        <i class="fas fa-download"></i> Acessar
      </a>
    `;
    container.appendChild(card);
  });
}

window.startConversa = async function(cartomanteUserId) {
  if (!loggedClient) return;

  const isBlocked = await checkClientBlocked(cartomanteUserId);
  if (isBlocked) {
    window.showClientBlockedModal();
    return;
  }

  const isConnected = supabase ? await testSupabaseConnection() : false;
  if (!isConnected) {
    alert("Chat indisponível no modo offline.");
    return;
  }

  try {
    const { data: conversa } = await supabase
      .from("conversas")
      .select("id")
      .eq("cartomante_id", cartomanteUserId)
      .eq("cliente_id", loggedClient.id)
      .maybeSingle();

    if (conversa) {
      window.location.href = `client_chat.html?cid=${conversa.id}`;
    } else {
      const { data: newConv } = await supabase
        .from("conversas")
        .insert({
          cartomante_id: cartomanteUserId,
          cliente_id: loggedClient.id
        })
        .select()
        .single();

      // Associar na tabela cartomante_clientes
      await supabase
        .from("cartomante_clientes")
        .insert({
          cartomante_id: cartomanteUserId,
          cliente_id: loggedClient.id,
          status: "ativo"
        })
        .select()
        .maybeSingle();

      window.location.href = `client_chat.html?cid=${newConv.id}`;
    }
  } catch (err) {
    console.error("Erro ao iniciar conversa:", err);
  }
};

window.handleLogout = async function() {
  if (!supabase) return;
  await supabase.auth.signOut();
  window.location.href = "login.html";
};

// Init
window.addEventListener("load", async () => {
  initBookingSystem();
  await checkAuthAndLoadProfile();
});

// --- LÓGICA DO AGENDADOR COOPERATIVO (ESTILO NUTRILUAR) ---
let bookingDate = new Date();
let selectedBookingDate = null;
let selectedBookingHour = null;
let bookingCartomanteId = null;

function initBookingSystem() {
  const btnClose = document.getElementById("closeBookingModal");
  if (btnClose) btnClose.addEventListener("click", closeBookingModal);

  const btnPrev = document.getElementById("btnPrevBookingMonth");
  if (btnPrev) btnPrev.addEventListener("click", () => changeBookingMonth(-1));

  const btnNext = document.getElementById("btnNextBookingMonth");
  if (btnNext) btnNext.addEventListener("click", () => changeBookingMonth(1));

  const btnConfirm = document.getElementById("btnConfirmBooking");
  if (btnConfirm) btnConfirm.addEventListener("click", confirmBookingAction);
}

window.openBookingForCartomante = async function(cartomanteId, cartomanteNome) {
  if (!loggedClient) return;

  const isBlocked = await checkClientBlocked(cartomanteId);
  if (isBlocked) {
    window.showClientBlockedModal();
    return;
  }

  bookingCartomanteId = cartomanteId;
  const modal = document.getElementById("bookingModal");
  if (!modal) return;
  
  modal.querySelector("h2").innerHTML = `<i class="fas fa-calendar-alt"></i> Agendar com ${cartomanteNome}`;
  modal.classList.remove("hidden");
  
  selectedBookingDate = null;
  selectedBookingHour = null;
  
  const hoursSec = document.getElementById("bookingHoursSection");
  if (hoursSec) hoursSec.classList.add("hidden");
  
  const formSec = document.getElementById("bookingFormSection");
  if (formSec) formSec.classList.add("hidden");
  
  renderBookingCalendar();
};

function closeBookingModal() {
  const modal = document.getElementById("bookingModal");
  if (modal) modal.classList.add("hidden");
}

function changeBookingMonth(dir) {
  bookingDate.setMonth(bookingDate.getMonth() + dir);
  renderBookingCalendar();
}

async function renderBookingCalendar() {
  const grid = document.getElementById("bookingCalendarGrid");
  const monthTitle = document.getElementById("bookingMonthYear");
  if (!grid || !monthTitle) return;

  grid.innerHTML = "";
  
  const tempDate = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), 1);
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  monthTitle.innerText = `${monthNames[tempDate.getMonth()]} ${tempDate.getFullYear()}`;

  const firstDayIndex = tempDate.getDay();
  const lastDay = new Date(bookingDate.getFullYear(), bookingDate.getMonth() + 1, 0).getDate();

  for (let i = 0; i < firstDayIndex; i++) {
    const space = document.createElement("div");
    grid.appendChild(space);
  }

  const today = new Date();
  today.setHours(0,0,0,0);

  for (let day = 1; day <= lastDay; day++) {
    const dayBtn = document.createElement("button");
    dayBtn.type = "button";
    dayBtn.className = "booking-day-btn";
    dayBtn.innerText = day;

    const currentDayDate = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), day);
    
    if (currentDayDate < today) {
      dayBtn.disabled = true;
    } else {
      dayBtn.addEventListener("click", () => selectBookingDay(currentDayDate, dayBtn));
    }

    grid.appendChild(dayBtn);
  }
}

async function selectBookingDay(date, btnElement) {
  document.querySelectorAll(".booking-day-btn").forEach(btn => btn.classList.remove("selected"));
  btnElement.classList.add("selected");
  
  selectedBookingDate = date;
  selectedBookingHour = null;
  
  const hoursSec = document.getElementById("bookingHoursSection");
  if (hoursSec) hoursSec.classList.remove("hidden");
  
  const formSec = document.getElementById("bookingFormSection");
  if (formSec) formSec.classList.add("hidden");
  
  const dateText = document.getElementById("bookingSelectedDateText");
  if (dateText) {
    dateText.innerText = date.toLocaleDateString('pt-BR');
  }

  await loadBookingHours(date);
}

async function loadBookingHours(date) {
  const hoursGrid = document.getElementById("bookingHoursGrid");
  if (!hoursGrid) return;
  hoursGrid.innerHTML = "";

  const horasPadrao = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];
  let ocupados = [];
  
  const startOfDay = new Date(date);
  startOfDay.setHours(0,0,0,0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23,59,59,999);

  const isConnected = supabase ? await testSupabaseConnection() : false;
  
  if (isConnected && bookingCartomanteId) {
    try {
      const { data: eventos } = await supabase
        .from("agenda_eventos")
        .select("inicio")
        .eq("cartomante_id", bookingCartomanteId)
        .gte("inicio", startOfDay.toISOString())
        .lte("inicio", endOfDay.toISOString());

      if (eventos) {
        ocupados = eventos.map(ev => {
          const d = new Date(ev.inicio);
          return String(d.getHours()).padStart(2, '0') + ":" + String(d.getMinutes()).padStart(2, '0');
        });
      }
    } catch (e) {
      console.warn("Erro ao buscar eventos reais para o agendador", e);
    }
  } else {
    const localDb = JSON.parse(localStorage.getItem("cartomante_agenda_eventos") || "[]");
    ocupados = localDb
      .filter(ev => {
        const evDate = new Date(ev.inicio);
        return evDate.toDateString() === date.toDateString() && ev.cartomante_id === bookingCartomanteId;
      })
      .map(ev => {
        const d = new Date(ev.inicio);
        return String(d.getHours()).padStart(2, '0') + ":" + String(d.getMinutes()).padStart(2, '0');
      });
  }

  horasPadrao.forEach(h => {
    const hrBtn = document.createElement("button");
    hrBtn.type = "button";
    hrBtn.className = "booking-hour-btn";
    hrBtn.innerText = h;

    const isOcupado = ocupados.includes(h);
    if (isOcupado) {
      hrBtn.disabled = true;
    } else {
      hrBtn.addEventListener("click", () => selectBookingHour(h, hrBtn));
    }

    hoursGrid.appendChild(hrBtn);
  });
}

function selectBookingHour(hour, btnElement) {
  document.querySelectorAll(".booking-hour-btn").forEach(btn => btn.classList.remove("selected"));
  btnElement.classList.add("selected");
  
  selectedBookingHour = hour;
  const formSec = document.getElementById("bookingFormSection");
  if (formSec) formSec.classList.remove("hidden");
}

async function confirmBookingAction() {
  if (!selectedBookingDate || !selectedBookingHour || !bookingCartomanteId) {
    alert("Por favor, selecione data e horário.");
    return;
  }

  const [hh, mm] = selectedBookingHour.split(":");
  const bookingDateTime = new Date(selectedBookingDate);
  bookingDateTime.setHours(parseInt(hh), parseInt(mm), 0, 0);

  const notes = document.getElementById("bookingNotes").value.trim();

  const btnConfirm = document.getElementById("btnConfirmBooking");
  btnConfirm.disabled = true;
  btnConfirm.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Confirmando...';

  const isConnected = supabase ? await testSupabaseConnection() : false;

  if (isConnected) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Você precisa estar logado para agendar.");
        window.location.href = "login.html";
        return;
      }

      const { data: client } = await supabase
        .from("clientes")
        .select("id, nome_completo")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!client) {
        alert("Consulente não cadastrada.");
        return;
      }

      const { error } = await supabase
        .from("agenda_eventos")
        .insert({
          cartomante_id: bookingCartomanteId,
          cliente_id: client.id,
          titulo: `Consulta com ${client.nome_completo}`,
          inicio: bookingDateTime.toISOString(),
          fim: new Date(bookingDateTime.getTime() + 60 * 60 * 1000).toISOString(),
          descricao: notes
        });

      if (error) {
        alert("Erro ao agendar: " + error.message);
      } else {
        alert("Consulta agendada no plano astral com sucesso!");
        
        await supabase.from("notificacoes").insert([{
          user_id: bookingCartomanteId,
          titulo: "Novo Agendamento Confirmado",
          mensagem: `O consulente ${client.nome_completo} agendou uma consulta para ${bookingDateTime.toLocaleDateString('pt-BR')} às ${selectedBookingHour}.`,
          tipo: "atendimento"
        }]);

        await supabase.from("historico_acoes").insert([{
          cartomante_id: bookingCartomanteId,
          cliente_id: client.id,
          acao: "Agendamento de Consulta",
          detalhes: `Consulta sintonizada para ${bookingDateTime.toLocaleDateString('pt-BR')} às ${selectedBookingHour}.`
        }]);

        closeBookingModal();
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao agendar.");
    } finally {
      btnConfirm.disabled = false;
      btnConfirm.innerHTML = '<i class="fas fa-magic"></i> Selar Agendamento';
    }
  } else {
    try {
      const localEvents = JSON.parse(localStorage.getItem("cartomante_agenda_eventos") || "[]");
      const demoClient = loggedClient || { id: "demo-client-1", nome_completo: "Consulente de Teste" };
      
      const newEvent = {
        id: "demo-event-" + Date.now(),
        cartomante_id: bookingCartomanteId,
        cliente_id: demoClient.id,
        titulo: `Consulta com ${demoClient.nome_completo}`,
        inicio: bookingDateTime.toISOString(),
        fim: new Date(bookingDateTime.getTime() + 60 * 60 * 1000).toISOString(),
        descricao: notes
      };

      localEvents.push(newEvent);
      localStorage.setItem("cartomante_agenda_eventos", JSON.stringify(localEvents));
      
      alert("Consulta agendada no plano demonstrativo com sucesso!");
      closeBookingModal();
      window.location.reload();
    } catch (err) {
      console.error(err);
    } finally {
      btnConfirm.disabled = false;
      btnConfirm.innerHTML = '<i class="fas fa-magic"></i> Selar Agendamento';
  }
}

async function checkClientBlocked(cartomanteId) {
  if (!loggedClient) return false;
  const isConnected = supabase ? await testSupabaseConnection() : false;
  if (isConnected) {
    try {
      const { data, error } = await supabase
        .from("cartomante_clientes")
        .select("status, bloqueado")
        .eq("cartomante_id", cartomanteId)
        .eq("cliente_id", loggedClient.id)
        .maybeSingle();
      if (!error && data) {
        return data.status === "pendente" && data.bloqueado;
      }
    } catch (e) {
      console.warn("Erro ao verificar bloqueio no Supabase:", e);
    }
  }

  // Fallback offline
  const vinculos = JSON.parse(localStorage.getItem("cartomante_clientes_vinculos") || "[]");
  const match = vinculos.find(v => v.cartomante_id === cartomanteId && v.cliente_id === loggedClient.id);
  return match ? (match.status === "pendente" && match.bloqueado) : false;
}

window.showClientBlockedModal = function() {
  const modal = document.getElementById("clientBlockedModal");
  if (modal) modal.classList.remove("hidden");
};

window.closeClientBlockedModal = function() {
  const modal = document.getElementById("clientBlockedModal");
  if (modal) modal.classList.add("hidden");
};

window.loadServicosContratadosTab = async function() {
  if (!loggedClient) return;

  const container = document.getElementById("servicosContratadosList");
  if (!container) return;

  container.innerHTML = "";

  const isConnected = supabase ? await testSupabaseConnection() : false;
  let orders = [];

  if (isConnected) {
    try {
      const { data, error } = await supabase
        .from("pedidos_servicos")
        .select("*")
        .eq("cliente_id", loggedClient.id)
        .order("created_at", { ascending: false });
      if (!error) {
        orders = data || [];
      }
    } catch (e) {
      console.warn("Erro ao buscar pedidos do Supabase:", e);
    }
  }

  if (orders.length === 0) {
    const localDb = JSON.parse(localStorage.getItem("cartomante_pedidos_servicos") || "[]");
    orders = localDb.filter(o => o.cliente_id === loggedClient.id);
  }

  if (orders.length === 0) {
    container.innerHTML = `
      <div class="chat-empty-state" style="padding: 40px; text-align: center; color: var(--text-secondary);">
        <i class="fas fa-file-invoice-dollar" style="font-size: 2.2rem; color: var(--gold-color); margin-bottom: 10px;"></i>
        <p style="font-family: var(--font-classic); font-style: italic;">Nenhum serviço contratado ainda.</p>
      </div>
    `;
    return;
  }

  const statusLabels = {
    "aguardando_pagamento": "Aguardando pagamento",
    "pagamento_informado": "Pagamento informado, aguardando confirmação",
    "pagamento_confirmado": "Pagamento confirmado",
    "pagamento_pendente": "Pagamento pendente",
    "bloqueado_temporariamente": "Aguardando regularização (bloqueio temporário)",
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

  for (const o of orders) {
    let cartomanteNome = "Oraculista";
    if (isConnected) {
      try {
        const { data } = await supabase
          .from("cartomantes")
          .select("nome")
          .eq("user_id", o.cartomante_id)
          .maybeSingle();
        if (data) cartomanteNome = data.nome;
      } catch(e){}
    } else {
      const storedCartomantes = JSON.parse(localStorage.getItem("demo_cartomantes") || "[]");
      const localCart = storedCartomantes.find(c => c.user_id === o.cartomante_id);
      cartomanteNome = localCart ? localCart.nome : "Luana Carito";
    }

    const card = document.createElement("div");
    card.className = "chat-list-item";
    card.style.flexDirection = "column";
    card.style.alignItems = "flex-start";
    card.style.gap = "10px";

    const labelStatus = statusLabels[o.status] || o.status;
    const colorStatus = statusColors[o.status] || "#fff";
    const dataStr = new Date(o.created_at).toLocaleDateString('pt-BR');

    let actionBtnHTML = "";
    if (o.status === "aguardando_pagamento" || o.status === "pagamento_pendente") {
      actionBtnHTML = `
        <button onclick="informarEnvioPagamento('${o.id}')" class="glass-button" style="font-size:0.7rem; border-color:var(--gold-color); padding: 4px 8px; margin-top: 5px;">
          <i class="fas fa-check"></i> Informar Envio de Pagamento
        </button>
      `;
    }

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
        <div>
          <h4 style="font-family:var(--font-decorative); color:var(--gold-color); font-size:1.05rem; margin:0;">${o.servico_titulo}</h4>
          <span style="font-size:0.75rem; color:var(--text-muted);">Cartomante: <strong>${cartomanteNome}</strong> • Contratado em: ${dataStr}</span>
        </div>
        <div style="text-align:right;">
          <div style="font-size:0.8rem; font-weight:bold; color:var(--gold-color);">R$ ${Number(o.servico_preco).toFixed(2).replace('.', ',')}</div>
          <span style="font-size:0.7rem; font-weight:600; color:${colorStatus}; text-transform:uppercase;">${labelStatus}</span>
        </div>
      </div>
      <div style="font-size:0.75rem; color:var(--text-secondary); width:100%;">
        Meio de pagamento: <strong>${o.meio_pagamento || "PIX"}</strong>
      </div>
      ${actionBtnHTML}
    `;

    container.appendChild(card);
  }
};

window.informarEnvioPagamento = function(pedidoId) {
  const modal = document.getElementById("informarPagamentoModal");
  if (!modal) return;
  
  document.getElementById("infPagamentoPedidoId").value = pedidoId;
  document.getElementById("infPagamentoReceiptUrl").value = "";
  document.getElementById("infPagamentoTxHash").value = "";
  document.getElementById("infPagamentoClientNote").value = "";
  
  modal.classList.remove("hidden");
};

window.closeInformarPagamentoModal = function() {
  const modal = document.getElementById("informarPagamentoModal");
  if (modal) modal.classList.add("hidden");
};

window.submitInformarPagamento = async function() {
  const pedidoId = document.getElementById("infPagamentoPedidoId").value;
  const receiptUrl = document.getElementById("infPagamentoReceiptUrl").value.trim();
  const txHash = document.getElementById("infPagamentoTxHash").value.trim();
  const clientNote = document.getElementById("infPagamentoClientNote").value.trim();
  
  window.closeInformarPagamentoModal();
  
  const isConnected = supabase ? await testSupabaseConnection() : false;
  let orderData = null;
  const nowStr = new Date().toISOString();

  if (isConnected) {
    try {
      const { error } = await supabase
        .from("pedidos_servicos")
        .update({ 
          status: "pagamento_informado", 
          updated_at: nowStr,
          nota_cliente: clientNote || null,
          hash_transacao: txHash || null,
          comprovante_url: receiptUrl || null,
          data_envio_pagamento: nowStr
        })
        .eq("id", pedidoId);

      if (error) {
        alert("Erro ao atualizar status do pagamento no servidor: " + error.message);
        return;
      }

      const { data } = await supabase
        .from("pedidos_servicos")
        .select("*")
        .eq("id", pedidoId)
        .maybeSingle();
      orderData = data;

      if (orderData) {
        const msgNotif = `Cliente informou envio de pagamento para o serviço ${orderData.servico_titulo}. O pagamento chegou?`;
        await supabase.from("notificacoes").insert({
          user_id: orderData.cartomante_id,
          titulo: "Pagamento Informado de Serviço",
          mensagem: msgNotif,
          tipo: "pagamento",
          lida: false
        });
      }
    } catch (e) {
      console.error(e);
    }
  } else {
    const localDb = JSON.parse(localStorage.getItem("cartomante_pedidos_servicos") || "[]");
    const idx = localDb.findIndex(o => o.id === pedidoId);
    if (idx !== -1) {
      localDb[idx].status = "pagamento_informado";
      localDb[idx].updated_at = nowStr;
      localDb[idx].nota_cliente = clientNote || null;
      localDb[idx].hash_transacao = txHash || null;
      localDb[idx].comprovante_url = receiptUrl || null;
      localDb[idx].data_envio_pagamento = nowStr;
      localStorage.setItem("cartomante_pedidos_servicos", JSON.stringify(localDb));
      orderData = localDb[idx];
      
      const notifs = JSON.parse(localStorage.getItem("cartomante_notificacoes") || "[]");
      const msgNotif = `Cliente informou envio de pagamento para o serviço ${orderData.servico_titulo}. O pagamento chegou?`;
      notifs.unshift({
        id: "notif-local-" + Date.now(),
        user_id: orderData.cartomante_id,
        titulo: "Pagamento Informado de Serviço",
        mensagem: msgNotif,
        tipo: "pagamento",
        lida: false,
        created_at: nowStr,
        metadata: { pedido_id: pedidoId }
      });
      localStorage.setItem("cartomante_notificacoes", JSON.stringify(notifs));
    }
  }

  alert("Informação de pagamento enviada com sucesso! Aguarde a confirmação da cartomante.");
  await loadServicosContratadosTab();
};

