// chat.js – Lógica e tempo real para o Chat Privado + Perguntas ao Baralho
// --------------------------------------------------------------------------

// Credenciais do Supabase (Substituir com as credenciais reais do seu projeto)
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
  console.warn("Supabase não pôde ser inicializado com as credenciais reais. Rodando em Modo Demonstrativo Local.", e);
}

// ==========================================================================
// ESTADO INTERNO DO CHAT
// ==========================================================================
let activeConversa = null; // Conversa ativa selecionada
let conversas = [];        // Lista de todas as conversas do usuário
let mensagens = [];        // Mensagens da conversa ativa
let activeFileInput = null; // Arquivo anexado selecionado atualmente
let totalEnviosHoje = 0;   // Contador para limite diário

// Configurações do Chat (Comercial/Energético) com fallback inicial
let configChat = {
  limite_diario: 50,
  limite_por_cliente: 10,
  horario_inicio: "09:00",
  horario_fim: "21:00",
  pausa_automatica: false
};

// Dados Mockados para Demonstração Local (Garante que a UI funcione 100% de imediato)
const MOCK_CLIENTS = [
  {
    id: "c1-uuid-helena",
    nome_completo: "Helena de Souza",
    foto_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop",
    tags: [{ tag: "Amor", cor: "#ff9f1c" }, { tag: "Recorrente", cor: "#6e5aab" }],
    last_visit: "30/05/2026",
    financial: "Pago"
  },
  {
    id: "c2-uuid-gabriel",
    nome_completo: "Gabriel Medeiros",
    foto_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop",
    tags: [{ tag: "Trabalho", cor: "#2ec4b6" }],
    last_visit: "28/05/2026",
    financial: "Pendente R$ 120,00"
  },
  {
    id: "c3-uuid-valentina",
    nome_completo: "Valentina Rocha",
    foto_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop",
    tags: [{ tag: "Espiritual", cor: "#e0924b" }, { tag: "Novato", cor: "#3a86c8" }],
    last_visit: "—",
    financial: "Aguardando"
  }
];

const MOCK_INITIAL_MESSAGES = {
  "c1-uuid-helena": [
    { id: "m1", sender_type: "cliente", texto: "Olá, boa tarde! Gostaria de tirar uma dúvida.", created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
    { id: "m2", sender_type: "cartomante", texto: "Olá, Helena. Seja muito bem-vinda ao nosso templo virtual. Sinta-se acolhida. Qual é a sua questão hoje?", created_at: new Date(Date.now() - 3600000 * 1.9).toISOString() },
    { id: "m3", sender_type: "cliente", texto: "Estou me sentindo muito confusa na minha vida amorosa. Ele voltará para mim?", created_at: new Date(Date.now() - 3600000 * 0.5).toISOString() }
  ],
  "c2-uuid-gabriel": [
    { id: "m4", sender_type: "cliente", texto: "Boa tarde. Gostaria de saber sobre meu financeiro e meu trabalho atual?", created_at: new Date(Date.now() - 3600000 * 24).toISOString() }
  ],
  "c3-uuid-valentina": []
};

// Simulação de Banco de Dados Local para Perguntas ao Baralho
let localPerguntasDb = {};

// ==========================================================================
// INICIALIZAÇÃO DA PÁGINA
// ==========================================================================
document.addEventListener("DOMContentLoaded", async () => {
  // Inicializa atmosfera estelar se houver função na script.js
  if (typeof generateStars === "function") {
    generateStars();
  }

  // Verificar se estamos no Supabase ou demonstrativo
  const isSupabaseConnected = await testSupabaseConnection();
  
  if (isSupabaseConnected) {
    console.log("Banco de dados Supabase detectado. Inicializando dados reais...");
    await initRealSupabaseChat();
  } else {
    console.log("Banco de dados Supabase não configurado. Inicializando Modo Demonstrativo local...");
    initDemonstrativeChat();
  }
  
  // Inicializar modo emocional e respostas rápidas (Prompt 11)
  if (typeof initializeEmotionalAndQuickResponses === "function") {
    await initializeEmotionalAndQuickResponses();
  }
  
  // Mostrar simulador se solicitado na URL (?sim=true ou ?simulate=true)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("simulate") === "true" || urlParams.get("sim") === "true") {
    const simulatorWidget = document.getElementById("simulatorWidget");
    if (simulatorWidget) {
      simulatorWidget.style.display = "block";
    }
  }
  
  // Tratar tab ativa via parâmetro da URL (?tab=perguntas)
  checkURLParams();
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

// ==========================================================================
// MODO DEMONSTRATIVO LOCAL (FALLBACK RÁPIDO)
// ==========================================================================
function initDemonstrativeChat() {
  // Converter MOCK_CLIENTS em conversas simuladas
  conversas = MOCK_CLIENTS.map(cli => ({
    id: `conv-uuid-${cli.id}`,
    cliente: cli,
    cliente_id: cli.id,
    unread: false
  }));

  // Renderizar lateral de conversas
  renderConversationsSidebar();
  
  // Atualizar contadores na UI
  updateLimitsDisplay();
  
  // Monitorar busca
  document.getElementById("chatSearchInput").addEventListener("input", filterSidebarConversations);
}

// ==========================================================================
// SUPABASE REAL-TIME E BANCO DE DADOS
// ==========================================================================
async function initRealSupabaseChat() {
  const cartomanteId = await getCartomanteId();
  if (!cartomanteId) {
    console.warn("Usuário Supabase não autenticado. Favor logar. Rodando demonstração.");
    initDemonstrativeChat();
    return;
  }

  // Carregar Configurações de Limites do Banco de Dados
  await fetchLimitsConfig(cartomanteId);

  // Carregar Conversas do Banco
  await fetchRealConversations(cartomanteId);

  // Inscrever-se em canais de tempo real para mensagens e perguntas
  subscribeToRealtimeEvents(cartomanteId);

  // Monitorar busca
  document.getElementById("chatSearchInput").addEventListener("input", filterSidebarConversations);
}

async function getCartomanteId() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
  } catch (e) {
    return null;
  }
}

// Carrega configurações de limites de energia da cartomante
async function fetchLimitsConfig(cartomanteId) {
  const { data, error } = await supabase
    .from("configuracoes_chat")
    .select("*")
    .eq("cartomante_id", cartomanteId)
    .single();

  if (data) {
    configChat = data;
  } else {
    // Se não existirem, insere padrão inicial
    const { error: insertError } = await supabase
      .from("configuracoes_chat")
      .insert({
        cartomante_id: cartomanteId,
        limite_diario: 50,
        limite_por_cliente: 10,
        horario_inicio: "09:00",
        horario_fim: "21:00",
        pausa_automatica: false
      });
  }
  updateLimitsDisplay();
}

// Carrega conversas do Supabase
async function fetchRealConversations(cartomanteId) {
  const { data, error } = await supabase
    .from("conversas")
    .select(`
      id,
      cliente_id,
      created_at,
      clientes (
        id,
        nome_completo,
        foto_url
      )
    `)
    .eq("cartomante_id", cartomanteId);

  if (error) {
    console.error("Erro ao carregar conversas:", error);
    return;
  }

  conversas = data.map(conv => ({
    id: conv.id,
    cliente_id: conv.cliente_id,
    cliente: {
      id: conv.clientes.id,
      nome_completo: conv.clientes.nome_completo,
      foto_url: conv.clientes.foto_url
    },
    unread: false
  }));

  renderConversationsSidebar();
}

// Subscrever-se a atualizações em tempo real do banco de dados
function subscribeToRealtimeEvents(cartomanteId) {
  // Escuta novas mensagens
  supabase
    .channel("mensagens-realtime")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "mensagens" },
      async (payload) => {
        const msg = payload.new;
        // Se a mensagem pertence à conversa ativa, carrega ela
        if (activeConversa && msg.conversa_id === activeConversa.id) {
          await loadMessagesForActiveConversation();
        } else {
          // Marca conversa na lista como não lida
          const conv = conversas.find(c => c.id === msg.conversa_id);
          if (conv) {
            conv.unread = true;
            renderConversationsSidebar();
          }
        }
      }
    )
    .subscribe();

  // Escuta atualizações de perguntas ao baralho
  supabase
    .channel("perguntas-realtime")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "perguntas_baralho" },
      async (payload) => {
        const p = payload.new;
        if (activeConversa && p.conversa_id === activeConversa.id) {
          await loadMessagesForActiveConversation();
        }
      }
    )
    .subscribe();
}

// ==========================================================================
// RENDERIZADORES DE INTERFACE (SIDEBAR E CHAT HISTORY)
// ==========================================================================
function renderConversationsSidebar() {
  const listEl = document.getElementById("conversationsList");
  if (!listEl) return;

  listEl.innerHTML = "";

  if (conversas.length === 0) {
    listEl.innerHTML = `
      <div class="chat-empty-state">
        <i class="fas fa-ghost"></i>
        <p>Nenhuma conversa iniciada. Acesse a lista de clientes para sintonizar uma conversa.</p>
      </div>
    `;
    return;
  }

  conversas.forEach(conv => {
    const item = document.createElement("div");
    item.className = `conversation-item ${activeConversa && activeConversa.id === conv.id ? 'active' : ''}`;
    item.onclick = () => selectConversation(conv);

    const isUnread = conv.unread;
    const avatar = conv.cliente.foto_url || "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=150&auto=format&fit=crop";

    item.innerHTML = `
      <div class="conversation-avatar-wrapper">
        <img src="${avatar}" alt="${conv.cliente.nome_completo}" class="conversation-avatar" />
        ${isUnread ? '<div class="unread-badge-mystic"></div>' : ''}
      </div>
      <div class="conversation-details">
        <div class="conversation-header-row">
          <span class="conversation-name">${conv.cliente.nome_completo}</span>
          <span class="conversation-time">Agora</span>
        </div>
        <div class="conversation-preview">Sintonizar frequência energética...</div>
      </div>
    `;

    listEl.appendChild(item);
  });
}

function filterSidebarConversations() {
  const query = document.getElementById("chatSearchInput").value.toLowerCase();
  const items = document.querySelectorAll(".conversation-item");
  
  items.forEach((item, index) => {
    const name = conversas[index].cliente.nome_completo.toLowerCase();
    if (name.includes(query)) {
      item.style.display = "flex";
    } else {
      item.style.display = "none";
    }
  });
}

// Seleciona a conversa ativa
async function selectConversation(conv) {
  activeConversa = conv;
  conv.unread = false; // Limpa não lidas ao abrir

  // Atualizar visual da barra lateral
  renderConversationsSidebar();

  // Exibir área principal e preencher cabeçalho
  document.getElementById("chatEmptyState").style.display = "none";
  document.getElementById("chatActiveContent").style.display = "flex";

  document.getElementById("activeChatName").innerText = conv.cliente.nome_completo;
  document.getElementById("activeChatAvatar").src = conv.cliente.foto_url || "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=150&auto=format&fit=crop";

  // Validar limites comerciais e habilitar/desabilitar digitação
  const comerciais = checkLimitsAndCommercialHour();
  
  // Carrega mensagens e histórico
  await loadMessagesForActiveConversation();
}

// Carregar mensagens para o chat ativo
async function loadMessagesForActiveConversation() {
  if (!activeConversa) return;

  const historyEl = document.getElementById("chatMessagesHistory");
  if (!historyEl) return;

  historyEl.innerHTML = "";

  const isRealSupabase = await testSupabaseConnection();

  if (isRealSupabase) {
    // Carregar do Supabase real
    const { data, error } = await supabase
      .from("mensagens")
      .select(`
        *,
        perguntas_baralho (
          id,
          pergunta_principal,
          contexto,
          area_vida,
          urgencia,
          status,
          quantidade_perguntas,
          valor,
          resposta_texto,
          resposta_arquivo_url,
          resposta_arquivo_tipo
        )
      `)
      .eq("conversa_id", activeConversa.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Erro ao carregar mensagens:", error);
      return;
    }
    mensagens = data;
  } else {
    // Carregar dos dados mockados
    const key = activeConversa.cliente.id;
    mensagens = MOCK_INITIAL_MESSAGES[key] || [];
  }

  if (mensagens.length === 0) {
    historyEl.innerHTML = `
      <div class="chat-empty-state">
        <i class="fas fa-comments"></i>
        <p>Ainda não há mensagens no histórico. Diga um olá fraterno para iniciar a sintonia!</p>
      </div>
    `;
    return;
  }

  mensagens.forEach(msg => {
    if (msg.is_question && (msg.perguntas_baralho || localPerguntasDb[msg.question_id])) {
      // É um card especial de Pergunta ao Baralho
      const pergunta = msg.perguntas_baralho || localPerguntasDb[msg.question_id];
      renderPerguntaBaralhoCard(pergunta, historyEl);
    } else {
      // É uma mensagem regular
      renderRegularMessage(msg, historyEl);
    }
  });

  // Rolagem automática para a última mensagem
  setTimeout(() => {
    historyEl.scrollTop = historyEl.scrollHeight;
  }, 100);
}

// Renderiza mensagem de texto e anexo regular no chat
function renderRegularMessage(msg, container) {
  const div = document.createElement("div");
  const isSentByCartomante = msg.sender_type === "cartomante";
  
  div.className = `message-bubble-wrapper ${isSentByCartomante ? 'sent' : 'received'}`;

  // Processa detecção automática do "?" para destaque de leitura
  let formattedText = msg.texto || "";
  if (formattedText) {
    formattedText = detectAndHighlightQuestions(formattedText);
  }

  const hasAttachment = msg.arquivo_url;
  let attachmentHTML = "";
  if (hasAttachment) {
    const isImage = msg.arquivo_tipo === "imagem";
    if (isImage) {
      attachmentHTML = `<div style="margin-top:5px;"><img src="${msg.arquivo_url}" style="max-width:200px; border-radius:8px;" alt="Anexo" /></div>`;
    } else {
      attachmentHTML = `
        <div style="margin-top:5px;">
          <a href="${msg.arquivo_url}" target="_blank" class="glass-button" style="padding:6px 12px; font-size:0.75rem;">
            <i class="fas fa-file-pdf"></i> ${msg.arquivo_nome || 'Visualizar Anexo'}
          </a>
        </div>
      `;
    }
  }

  const senderName = isSentByCartomante ? "Cartomante" : (activeConversa?.cliente?.nome_completo || "Consulente");
  const timeStr = msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Agora";

  div.innerHTML = `
    <span class="message-sender-name">${senderName}</span>
    <div class="message-bubble">
      <div>${formattedText}</div>
      ${attachmentHTML}
    </div>
    <div class="message-meta">
      <span>${timeStr}</span>
      ${isSentByCartomante ? '<i class="fas fa-check-double message-read-check"></i>' : ''}
    </div>
  `;

  container.appendChild(div);
}

// Detecção automática de frases com "?" e destaque visual
function detectAndHighlightQuestions(text) {
  // Regex para capturar frases inteiras que terminam com "?"
  // Captura desde o início do texto ou após pontuação até o "?"
  const sentenceRegex = /([^.!?\n]*\?)/g;
  
  return text.replace(sentenceRegex, (match) => {
    if (match.trim().length > 1) {
      return `<span class="highlighted-question">${match}</span>`;
    }
    return match;
  });
}

// Renderiza o card especial da "Pergunta ao Baralho" no histórico
function renderPerguntaBaralhoCard(p, container) {
  const card = document.createElement("div");
  card.className = "message-baralho-card";
  card.id = `baralho-card-${p.id}`;

  const areaNameMap = {
    amor: "Amor & Relações",
    espiritual: "Espiritualidade",
    financeiro: "Finanças & Abundância",
    trabalho: "Carreira",
    familia: "Família & Laços",
    saude_emocional: "Saúde Emocional",
    outro: "Outro"
  };

  const statusNameMap = {
    enviada: "Enviada",
    aguardando_pagamento: "Aguardando Pagamento",
    paga: "Paga",
    respondida: "Respondida",
    cancelada: "Cancelada"
  };

  const areaLabel = areaNameMap[p.area_vida] || p.area_vida;
  const statusLabel = statusNameMap[p.status] || p.status;
  const urgencyLabel = p.urgencia.charAt(0).toUpperCase() + p.urgencia.slice(1);
  const formattedPrice = Number(p.valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  let controlsHTML = "";
  
  // Controles são visíveis apenas para a Cartomante se a pergunta não for respondida ou cancelada
  if (p.status === "enviada" || p.status === "aguardando_pagamento") {
    controlsHTML = `
      <div class="card-baralho-controls">
        <div class="quantity-control-row">
          <div class="meta-label">Total de perguntas identificadas:</div>
          <div class="quantity-buttons">
            <button class="btn-qty ${p.quantidade_perguntas === 1 ? 'active' : ''}" onclick="updatePerguntaQty('${p.id}', 1)">1</button>
            <button class="btn-qty ${p.quantidade_perguntas === 2 ? 'active' : ''}" onclick="updatePerguntaQty('${p.id}', 2)">2</button>
            <button class="btn-qty ${p.quantidade_perguntas === 3 ? 'active' : ''}" onclick="updatePerguntaQty('${p.id}', 3)">3</button>
            <button class="btn-qty ${p.quantidade_perguntas > 3 ? 'active' : ''}" onclick="updatePerguntaQty('${p.id}', 'custom')">Personalizado</button>
          </div>
        </div>
        
        <div class="quantity-control-row">
          <div class="value-sync-display">
            <div class="meta-label">Valor Recalculado:</div>
            <div class="price" id="price-card-${p.id}">${formattedPrice}</div>
          </div>
          <div class="action-row">
            <button class="glass-button" style="border-color:#2ec4b6;" onclick="markPerguntaAsPaid('${p.id}')">
              <i class="fas fa-check"></i> Marcar como Paga
            </button>
            <button class="glass-button" style="border-color:#e63946;" onclick="cancelPergunta('${p.id}')">
              <i class="fas fa-ban"></i> Cancelar
            </button>
          </div>
        </div>
      </div>
    `;
  } else if (p.status === "paga") {
    // Se a pergunta já está paga, exibe botão para responder
    controlsHTML = `
      <div class="card-baralho-controls">
        <div class="quantity-control-row">
          <div class="value-sync-display" style="text-align:left;">
            <div class="meta-label" style="color:#2ec4b6;"><i class="fas fa-check-circle"></i> PAGAMENTO CONFIRMADO</div>
            <div class="price" style="font-size:1rem; color:#2ec4b6;">${formattedPrice}</div>
          </div>
        </div>
        <div class="response-form">
          <textarea class="response-textarea" id="response-text-${p.id}" placeholder="Escreva a leitura ritualística do oráculo..."></textarea>
          
          <div class="action-row">
            <button class="glass-button" style="padding:6px 12px; font-size:0.75rem;" onclick="triggerResponseFileUpload('${p.id}')">
              <i class="fas fa-microphone"></i> Anexar Áudio/Vídeo
            </button>
            <input type="file" id="response-file-input-${p.id}" style="display:none;" onchange="handleResponseFileSelected(event, '${p.id}')" />
            <button class="glass-button" style="border-color:var(--gold-color); flex:2;" onclick="submitPerguntaResponse('${p.id}')">
              <i class="fas fa-magic"></i> Enviar Resposta Sagrada
            </button>
          </div>
          <div id="response-preview-file-${p.id}" style="font-size:0.72rem; color:var(--gold-color); display:none;"></div>
        </div>
      </div>
    `;
  }

  // Se já houver resposta cadastrada, exibe a resposta de forma linda
  let responseHTML = "";
  if (p.status === "respondida") {
    let fileHTML = "";
    if (p.resposta_arquivo_url) {
      const type = p.resposta_arquivo_tipo;
      if (type === "imagem") {
        fileHTML = `<div style="margin-top:10px;"><img src="${p.resposta_arquivo_url}" style="max-width:100%; border-radius:8px;" /></div>`;
      } else {
        fileHTML = `
          <div class="response-view-file">
            <i class="fas fa-volume-up"></i>
            <a href="${p.resposta_arquivo_url}" target="_blank" style="color:inherit; text-decoration:none;">Ouvir Revelação em Áudio/PDF</a>
          </div>
        `;
      }
    }

    responseHTML = `
      <div class="card-baralho-response-view">
        <h4 class="response-view-title"><i class="fas fa-scroll"></i> Resposta do Oráculo</h4>
        <p class="response-view-text">${p.resposta_texto || '<em>Resposta enviada por arquivo/gravação ritualística.</em>'}</p>
        ${fileHTML}
        <div class="meta-label" style="margin-top:8px; text-align:right;">Respondido em: ${p.respondido_em ? new Date(p.respondido_em).toLocaleDateString() : 'Hoje'}</div>
      </div>
    `;
  }

  card.innerHTML = `
    <div class="card-baralho-header">
      <span class="card-baralho-title"><i class="fas fa-hand-sparkles"></i> Pergunta ao Baralho</span>
      <span class="card-baralho-status status-${p.status === 'aguardando_pagamento' ? 'aguardando' : p.status}">${statusLabel}</span>
    </div>
    
    <div class="card-baralho-meta">
      <div class="meta-item">
        <span class="meta-label">Área da vida</span>
        <span class="meta-value">${areaLabel}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Urgência</span>
        <span class="meta-value" style="color:${p.urgencia === 'alta' ? '#e63946' : 'inherit'}">${urgencyLabel}</span>
      </div>
    </div>
    
    <div class="card-baralho-question">
      "${p.pergunta_principal}"
    </div>
    
    ${p.contexto ? `<div class="card-baralho-context"><strong>Contexto:</strong> ${p.contexto}</div>` : ''}
    
    ${controlsHTML}
    ${responseHTML}
  `;

  container.appendChild(card);
}

// ==========================================================================
// AÇÕES DO CHAT E DE MENSAGENS
// ==========================================================================

// Gatilho de upload de anexo genérico no chat
function triggerFileInput() {
  document.getElementById("chatFileInput").click();
}

function handleFileSelected(event) {
  const file = event.target.files[0];
  if (!file) return;

  activeFileInput = file;

  // Exibir a barra de previsão do anexo
  document.getElementById("attachmentFileName").innerText = file.name;
  document.getElementById("attachmentPreviewBar").style.display = "flex";
}

function clearAttachment() {
  activeFileInput = null;
  document.getElementById("chatFileInput").value = "";
  document.getElementById("attachmentPreviewBar").style.display = "none";
}

// Envia mensagem regular
async function attemptSendMessage() {
  const inputEl = document.getElementById("chatInputField");
  const text = inputEl.value.trim();

  if (!text && !activeFileInput) return;

  // 1. Mostrar Modo Reflexão por 2 segundos antes de prosseguir
  showReflectionMessage();

  // Desabilitar botão temporariamente para simular processamento/reflexão
  const btnSend = document.getElementById("btnSendMsg");
  btnSend.disabled = true;

  setTimeout(async () => {
    const isRealSupabase = await testSupabaseConnection();
    let arquivoUrl = null;
    let arquivoNome = null;
    let arquivoTipo = "arquivo";

    if (activeFileInput) {
      arquivoNome = activeFileInput.name;
      // Define tipo simples
      if (activeFileInput.type.includes("image")) arquivoTipo = "imagem";
      else if (activeFileInput.type.includes("audio")) arquivoTipo = "audio";
      else if (activeFileInput.type.includes("pdf")) arquivoTipo = "pdf";

      if (isRealSupabase) {
        // Upload para o Supabase Storage Bucket 'client-gallery'
        const filePath = `${activeConversa.cliente.id}/chat_${Date.now()}_${activeFileInput.name}`;
        const { data, error } = await supabase.storage
          .from("client-gallery")
          .upload(filePath, activeFileInput);
        
        if (data) {
          // Obter URL pública
          const { data: pubData } = supabase.storage.from("client-gallery").getPublicUrl(filePath);
          arquivoUrl = pubData.publicUrl;
        } else {
          console.error("Erro no upload do arquivo:", error);
        }
      } else {
        // Fallback mock
        arquivoUrl = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
      }
    }

    const payload = {
      conversa_id: activeConversa.id,
      sender_type: "cartomante",
      texto: text,
      arquivo_url: arquivoUrl,
      arquivo_nome: arquivoNome,
      arquivo_tipo: arquivoUrl ? arquivoTipo : null,
      is_question: false,
      read: true
    };

    if (isRealSupabase) {
      const { error } = await supabase.from("mensagens").insert([payload]);
      if (error) console.error("Erro ao enviar mensagem no Supabase:", error);
    } else {
      // Mock local
      const key = activeConversa.cliente.id;
      if (!MOCK_INITIAL_MESSAGES[key]) MOCK_INITIAL_MESSAGES[key] = [];
      
      MOCK_INITIAL_MESSAGES[key].push({
        id: `m-local-${Date.now()}`,
        ...payload,
        created_at: new Date().toISOString()
      });
      
      totalEnviosHoje++;
      updateLimitsDisplay();
      await loadMessagesForActiveConversation();
    }

    // Limpar campos
    inputEl.value = "";
    clearAttachment();
    btnSend.disabled = false;
  }, 1800); // 1.8 segundos de tempo de reflexão espiritual
}

function handleInputKeyDown(event) {
  if (event.key === "Enter") {
    attemptSendMessage();
  }
}

// Efeito Visual: Exibe mensagem suave incentivando reflexão antes do envio
function showReflectionMessage() {
  const alertBox = document.getElementById("reflectionAlertBox");
  if (!alertBox) return;

  alertBox.style.display = "block";
  
  setTimeout(() => {
    alertBox.style.display = "none";
  }, 2200);
}

// ==========================================================================
// MECÂNICA: FORMULÁRIO DE PERGUNTA AO BARALHO
// ==========================================================================
function openPerguntaBaralhoModal() {
  document.getElementById("perguntaBaralhoModal").classList.add("active");
}

function closePerguntaBaralhoModal() {
  document.getElementById("perguntaBaralhoModal").classList.remove("active");
  document.getElementById("frmPerguntaBaralho").reset();
}

function setUrgencyRadio(level) {
  document.querySelectorAll(".urgency-radio-label").forEach(lbl => lbl.classList.remove("active"));
  document.getElementById(`lblUrgencia${level.charAt(0).toUpperCase() + level.slice(1)}`).classList.add("active");
}

// Cadastro da pergunta do baralho via formulário
async function handlePerguntaBaralhoSubmit(event) {
  event.preventDefault();

  const pergunta = document.getElementById("modalPergunta").value.trim();
  const contexto = document.getElementById("modalContexto").value.trim();
  const area = document.getElementById("modalArea").value;
  const urgencia = document.querySelector('input[name="modalUrgencia"]:checked').value;

  if (!pergunta) return;

  // Limite do Modo Esgotamento: no máximo 1 pergunta ao baralho pendente por vez (Prompt 11)
  if (typeof chatEmotionalConfig !== "undefined" && chatEmotionalConfig.modo_esgotamento) {
    const hasUnanswered = mensagens.some(msg => {
      if (msg.is_question) {
        const p = msg.perguntas_baralho || localPerguntasDb[msg.question_id];
        return p && p.status !== "respondida" && p.status !== "cancelada";
      }
      return false;
    });

    if (hasUnanswered) {
      alert("Aviso de Limite Energético: Sob o Modo Esgotamento, é permitido no máximo 1 Pergunta ao Baralho pendente de resposta por consulente. Por favor, responda ou cancele a pergunta atual antes de sintonizar uma nova consulta.");
      return;
    }
  }

  const isRealSupabase = await testSupabaseConnection();
  const cartomanteId = isRealSupabase ? await getCartomanteId() : "mock-cartomante";

  // Preço base inicial de R$ 50 para 1 pergunta
  const baseValue = 50.00;

  const pData = {
    conversa_id: activeConversa.id,
    cliente_id: activeConversa.cliente.id,
    cartomante_id: cartomanteId,
    pergunta_principal: pergunta,
    contexto: contexto,
    area_vida: area,
    urgencia: urgencia,
    status: "enviada",
    quantidade_perguntas: 1,
    valor: baseValue
  };

  let createdId = null;

  if (isRealSupabase) {
    const { data, error } = await supabase
      .from("perguntas_baralho")
      .insert([pData])
      .select("id")
      .single();

    if (error) {
      console.error("Erro ao criar pergunta no Supabase:", error);
      return;
    }
    createdId = data.id;

    // Criar mensagem do chat que faz referência à pergunta
    await supabase.from("mensagens").insert([{
      conversa_id: activeConversa.id,
      sender_type: "cliente", // Representa uma pergunta que partiu ou foi inserida no canal do cliente
      texto: `✨ [Pergunta ao Baralho]: ${pergunta}`,
      is_question: true,
      question_id: createdId,
      read: false
    }]);

  } else {
    // Modo Mock
    createdId = `perg-local-${Date.now()}`;
    localPerguntasDb[createdId] = {
      id: createdId,
      ...pData,
      created_at: new Date().toISOString()
    };

    // Sincronizar financeiro local (integração automática)
    const localFinances = localStorage.getItem("cartomante_finances_db");
    const finances = localFinances ? JSON.parse(localFinances) : [];
    finances.push({
      id: `tx-perg-${createdId}`,
      cliente_id: activeConversa.cliente.id,
      cliente_nome: activeConversa.cliente.nome_completo,
      tipo: "entrada",
      categoria: "pergunta_baralho",
      valor: baseValue,
      status: "pendente",
      origem: "automatico",
      referencia_id: createdId,
      descricao: `Pergunta ao Baralho Cigano - ${pergunta}`,
      data_registro: new Date().toISOString()
    });
    localStorage.setItem("cartomante_finances_db", JSON.stringify(finances));

    // Mensagem no chat
    const key = activeConversa.cliente.id;
    MOCK_INITIAL_MESSAGES[key].push({
      id: `m-local-${Date.now()}`,
      conversa_id: activeConversa.id,
      sender_type: "cliente",
      texto: `✨ [Pergunta ao Baralho]: ${pergunta}`,
      is_question: true,
      question_id: createdId,
      created_at: new Date().toISOString()
    });

    await loadMessagesForActiveConversation();
  }

  closePerguntaBaralhoModal();
}

// Recalcular quantidade e atualizar valor automaticamente
async function updatePerguntaQty(perguntaId, qty) {
  if (typeof chatEmotionalConfig !== "undefined" && chatEmotionalConfig.modo_esgotamento && qty !== 1) {
    alert("Combo desativado no momento: Sob o Modo Esgotamento, o limite é de no máximo 1 pergunta por consulente para preservar a integridade energética da cartomante.");
    return;
  }
  let targetQty = 1;

  if (qty === "custom") {
    const promptVal = prompt("Defina a quantidade de perguntas identificadas no diálogo (limite 10):", "5");
    const parsed = parseInt(promptVal);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 10) {
      targetQty = parsed;
    } else {
      return;
    }
  } else {
    targetQty = parseInt(qty);
  }

  // FÓRMULA DE RECALCULO AUTOMÁTICO:
  // 1 pergunta = R$ 50,00
  // 2 perguntas = R$ 90,00 (Desconto de combo)
  // 3 perguntas = R$ 120,00 (Desconto de combo)
  // Mais de 3 = R$ 120,00 + R$ 30,00 para cada pergunta adicional
  let newValue = 50.00;
  if (targetQty === 2) newValue = 90.00;
  else if (targetQty === 3) newValue = 120.00;
  else if (targetQty > 3) {
    newValue = 120.00 + (targetQty - 3) * 30.00;
  }

  const isRealSupabase = await testSupabaseConnection();

  if (isRealSupabase) {
    // Atualizar no Supabase. O status muda para 'aguardando_pagamento' ao definir/atualizar a contagem
    const { error } = await supabase
      .from("perguntas_baralho")
      .update({ 
        quantidade_perguntas: targetQty, 
        valor: newValue, 
        status: "aguardando_pagamento" 
      })
      .eq("id", perguntaId);

    if (error) console.error("Erro ao atualizar quantidade no Supabase:", error);
    
    // Registrar log de auditoria
    await logSecurityAction("Alteração de Valor / Pergunta", `Definiu quantidade: ${targetQty} perguntas, no valor de R$ ${newValue.toFixed(2).replace('.', ',')}`, activeConversa.cliente.id);
    
    await loadMessagesForActiveConversation();
  } else {
    // Modo Mock
    if (localPerguntasDb[perguntaId]) {
      localPerguntasDb[perguntaId].quantidade_perguntas = targetQty;
      localPerguntasDb[perguntaId].valor = newValue;
      localPerguntasDb[perguntaId].status = "aguardando_pagamento";

      // Sincronizar financeiro local
      const localFinances = localStorage.getItem("cartomante_finances_db");
      if (localFinances) {
        const finances = JSON.parse(localFinances);
        const tx = finances.find(f => f.referencia_id === perguntaId);
        if (tx) {
          tx.valor = newValue;
          tx.status = "pendente"; // Fica pendente de pagamento
          localStorage.setItem("cartomante_finances_db", JSON.stringify(finances));
        }
      }

      await logSecurityAction("Alteração de Valor / Pergunta (Local)", `Definiu quantidade: ${targetQty} perguntas, no valor de R$ ${newValue.toFixed(2).replace('.', ',')}`, activeConversa.cliente.id);
      await loadMessagesForActiveConversation();
    }
  }
}

// Marcar Pergunta como Paga
async function markPerguntaAsPaid(perguntaId) {
  const isRealSupabase = await testSupabaseConnection();

  if (isRealSupabase) {
    const { error } = await supabase
      .from("perguntas_baralho")
      .update({ status: "paga" })
      .eq("id", perguntaId);

    if (error) console.error("Erro ao pagar pergunta no Supabase:", error);
    
    // Registrar log
    await logSecurityAction("Confirmação de Pagamento", `Aprovou o pagamento/troca mística para a Pergunta ao Baralho ID: ${perguntaId}`, activeConversa.cliente.id);
    
    await loadMessagesForActiveConversation();
  } else {
    if (localPerguntasDb[perguntaId]) {
      localPerguntasDb[perguntaId].status = "paga";

      // Sincronizar financeiro local
      const localFinances = localStorage.getItem("cartomante_finances_db");
      if (localFinances) {
        const finances = JSON.parse(localFinances);
        const tx = finances.find(f => f.referencia_id === perguntaId);
        if (tx) {
          tx.status = "pago";
          localStorage.setItem("cartomante_finances_db", JSON.stringify(finances));
        }
      }

      await logSecurityAction("Confirmação de Pagamento (Local)", `Aprovou o pagamento para a Pergunta ID: ${perguntaId}`, activeConversa.cliente.id);
      await loadMessagesForActiveConversation();
    }
  }
}

// Cancelar Pergunta
async function cancelPergunta(perguntaId) {
  const isRealSupabase = await testSupabaseConnection();

  if (isRealSupabase) {
    const { error } = await supabase
      .from("perguntas_baralho")
      .update({ status: "cancelada" })
      .eq("id", perguntaId);

    if (error) console.error("Erro ao cancelar pergunta no Supabase:", error);
    
    // Registrar log
    await logSecurityAction("Cancelamento de Pergunta", `Cancelou o atendimento da Pergunta ao Baralho ID: ${perguntaId}`, activeConversa.cliente.id);
    
    await loadMessagesForActiveConversation();
  } else {
    if (localPerguntasDb[perguntaId]) {
      localPerguntasDb[perguntaId].status = "cancelada";

      // Sincronizar financeiro local
      const localFinances = localStorage.getItem("cartomante_finances_db");
      if (localFinances) {
        const finances = JSON.parse(localFinances);
        const tx = finances.find(f => f.referencia_id === perguntaId);
        if (tx) {
          tx.status = "cancelado";
          localStorage.setItem("cartomante_finances_db", JSON.stringify(finances));
        }
      }

      await logSecurityAction("Cancelamento de Pergunta (Local)", `Cancelou a Pergunta ID: ${perguntaId}`, activeConversa.cliente.id);
      await loadMessagesForActiveConversation();
    }
  }
}

// ==========================================================================
// RESPOSTAS À PERGUNTA AO BARALHO
// ==========================================================================
let activeResponseFile = null;

function triggerResponseFileUpload(perguntaId) {
  document.getElementById(`response-file-input-${perguntaId}`).click();
}

function handleResponseFileSelected(event, perguntaId) {
  const file = event.target.files[0];
  if (!file) return;

  activeResponseFile = file;
  
  const labelEl = document.getElementById(`response-preview-file-${perguntaId}`);
  if (labelEl) {
    labelEl.innerText = `📎 Arquivo de Revelação: ${file.name}`;
    labelEl.style.display = "block";
  }
}

// Submeter a Resposta da Cartomante para a Pergunta
async function submitPerguntaResponse(perguntaId) {
  const textEl = document.getElementById(`response-text-${perguntaId}`);
  const text = textEl ? textEl.value.trim() : "";

  if (!text && !activeResponseFile) {
    alert("Por favor, digite a resposta ou insira uma gravação/arquivo de revelação.");
    return;
  }

  const isRealSupabase = await testSupabaseConnection();
  let arquivoUrl = null;
  let arquivoTipo = "texto";

  if (activeResponseFile) {
    if (activeResponseFile.type.includes("image")) arquivoTipo = "imagem";
    else if (activeResponseFile.type.includes("audio")) arquivoTipo = "audio";
    else if (activeResponseFile.type.includes("pdf")) arquivoTipo = "pdf";
    else if (activeResponseFile.type.includes("video")) arquivoTipo = "video";

    if (isRealSupabase) {
      const filePath = `${activeConversa.cliente.id}/response_${perguntaId}_${activeResponseFile.name}`;
      const { data } = await supabase.storage
        .from("client-gallery")
        .upload(filePath, activeResponseFile);
      
      if (data) {
        const { data: pubData } = supabase.storage.from("client-gallery").getPublicUrl(filePath);
        arquivoUrl = pubData.publicUrl;
      }
    } else {
      arquivoUrl = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
    }
  }

  if (isRealSupabase) {
    const { error } = await supabase
      .from("perguntas_baralho")
      .update({
        status: "respondida",
        resposta_texto: text,
        resposta_arquivo_url: arquivoUrl,
        resposta_arquivo_tipo: arquivoUrl ? arquivoTipo : "texto",
        respondido_em: new Date().toISOString()
      })
      .eq("id", perguntaId);

    if (error) {
      console.error("Erro ao salvar resposta no Supabase:", error);
      return;
    }
    
    // Registrar log
    await logSecurityAction("Resposta ao Baralho", `Respondeu a Pergunta ao Baralho ID: ${perguntaId}`, activeConversa.cliente.id);
    
    await loadMessagesForActiveConversation();
  } else {
    // Modo Mock
    if (localPerguntasDb[perguntaId]) {
      localPerguntasDb[perguntaId].status = "respondida";
      localPerguntasDb[perguntaId].resposta_texto = text;
      localPerguntasDb[perguntaId].resposta_arquivo_url = arquivoUrl;
      localPerguntasDb[perguntaId].resposta_arquivo_tipo = arquivoUrl ? arquivoTipo : "texto";
      localPerguntasDb[perguntaId].respondido_em = new Date().toISOString();
      
      // Inserir mensagem de resposta do chat mock
      const key = activeConversa.cliente.id;
      MOCK_INITIAL_MESSAGES[key].push({
        id: `m-local-${Date.now()}`,
        conversa_id: activeConversa.id,
        sender_type: "cartomante",
        texto: `🔮 Revelação do Tarô: "${text}"`,
        created_at: new Date().toISOString()
      });

      await loadMessagesForActiveConversation();
    }
  }

  activeResponseFile = null;
}

// ==========================================================================
// LIMITADORES DE MENSAGEM & HORÁRIO DE ATENDIMENTO
// ==========================================================================
function openLimitsModal() {
  document.getElementById("cfgLimiteDiario").value = configChat.limite_diario;
  document.getElementById("cfgLimiteCliente").value = configChat.limite_por_cliente;
  document.getElementById("cfgHoraInicio").value = configChat.horario_inicio.substring(0, 5);
  document.getElementById("cfgHoraFim").value = configChat.horario_fim.substring(0, 5);
  document.getElementById("cfgPausaAutomatica").checked = configChat.pausa_automatica;

  document.getElementById("limitsModal").classList.add("active");
}

function closeLimitsModal() {
  document.getElementById("limitsModal").classList.remove("active");
}

async function handleLimitsSubmit(event) {
  event.preventDefault();

  const limiteDiario = parseInt(document.getElementById("cfgLimiteDiario").value);
  const limiteCliente = parseInt(document.getElementById("cfgLimiteCliente").value);
  const horaInicio = document.getElementById("cfgHoraInicio").value;
  const horaFim = document.getElementById("cfgHoraFim").value;
  const pausa = document.getElementById("cfgPausaAutomatica").checked;

  configChat.limite_diario = limiteDiario;
  configChat.limite_por_cliente = limiteCliente;
  configChat.horario_inicio = horaInicio;
  configChat.horario_fim = horaFim;
  configChat.pausa_automatica = pausa;

  const isRealSupabase = await testSupabaseConnection();

  if (isRealSupabase) {
    const cartomanteId = await getCartomanteId();
    const { error } = await supabase
      .from("configuracoes_chat")
      .update({
        limite_diario: limiteDiario,
        limite_por_cliente: limiteCliente,
        horario_inicio: horaInicio + ":00",
        horario_fim: horaFim + ":00",
        pausa_automatica: pausa,
        updated_at: new Date().toISOString()
      })
      .eq("cartomante_id", cartomanteId);

    if (error) console.error("Erro ao salvar limites no Supabase:", error);
  }

  updateLimitsDisplay();
  closeLimitsModal();

  // Validar estados no chat ativo
  checkLimitsAndCommercialHour();
}

function updateLimitsDisplay() {
  document.getElementById("lblLimiteDiario").innerText = `${configChat.limite_diario} msgs (${totalEnviosHoje} envios)`;
  document.getElementById("lblLimiteCliente").innerText = `${configChat.limite_por_cliente} msgs`;
  document.getElementById("lblComercialHour").innerText = `${configChat.horario_inicio} - ${configChat.horario_fim}`;
}

// Valida as condições de horário, pausa energética e limites de mensagens
function checkLimitsAndCommercialHour() {
  if (!activeConversa) return true;

  const inputField = document.getElementById("chatInputField");
  const btnSend = document.getElementById("btnSendMsg");
  const statusLabel = document.getElementById("activeChatStatus");

  const now = new Date();
  const currentHM = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  let isDisabled = false;
  let reason = "";

  // 1. Validar Pausa Manual
  if (configChat.pausa_automatica) {
    isDisabled = true;
    reason = "Silêncio ritualístico: O canal está pausado manualmente para preservação energética.";
  }
  // 2. Validar Horário Comercial Permitido
  else if (currentHM < configChat.horario_inicio || currentHM > configChat.horario_fim) {
    isDisabled = true;
    reason = `Fora do horário ritualístico permitido (${configChat.horario_inicio} - ${configChat.horario_fim}).`;
  }
  // 3. Validar Limite Diário
  else if (totalEnviosHoje >= configChat.limite_diario) {
    isDisabled = true;
    reason = "Limite diário de transmissão atingido. Recarregue suas energias.";
  }

  // Atualiza controles HTML
  if (isDisabled) {
    inputField.disabled = true;
    inputField.placeholder = reason;
    btnSend.disabled = true;
    
    statusLabel.className = "chat-user-status paused";
    statusLabel.querySelector("span").innerText = "Silêncio Energético";
  } else {
    inputField.disabled = false;
    inputField.placeholder = "Digite uma mensagem com acolhida e intenção...";
    btnSend.disabled = false;
    
    statusLabel.className = "chat-user-status";
    statusLabel.querySelector("span").innerText = "Sintonizada";
  }

  return !isDisabled;
}

// ==========================================================================
// PORTAL DE SIMULAÇÃO (INTERATIVIDADE IMEDIATA E AMBIENTE DE TESTES)
// ==========================================================================

// Simular nova mensagem recebida do cliente
async function simulateClientMessage() {
  if (!activeConversa) {
    alert("Selecione um consulente na barra lateral antes de realizar a simulação.");
    return;
  }

  const frasesSimuladas = [
    "Olá, me sinto muito cansada emocionalmente. O que o baralho aconselha hoje?",
    "Você poderia ver se a proposta de emprego que recebi dará certo?",
    "Minha família está muito distante ultimamente. O que há de errado nos astros?",
    "Boa tarde, fiz o ritual ontem à noite. Gostaria de saber quais são os próximos passos?",
    "O amor de infância retornará aos meus caminhos?"
  ];

  const randomText = frasesSimuladas[Math.floor(Math.random() * frasesSimuladas.length)];
  const isRealSupabase = await testSupabaseConnection();

  const payload = {
    conversa_id: activeConversa.id,
    sender_type: "cliente",
    texto: randomText,
    is_question: false,
    read: false
  };

  if (isRealSupabase) {
    const { error } = await supabase.from("mensagens").insert([payload]);
    if (error) console.error("Erro ao simular mensagem no Supabase:", error);
  } else {
    const key = activeConversa.cliente.id;
    MOCK_INITIAL_MESSAGES[key].push({
      id: `m-local-${Date.now()}`,
      ...payload,
      created_at: new Date().toISOString()
    });
    
    await loadMessagesForActiveConversation();
  }

  // Se o Modo Esgotamento estiver ativo, gera uma auto-resposta imediata da cartomante após 1 segundo
  if (typeof chatEmotionalConfig !== "undefined" && chatEmotionalConfig.modo_esgotamento) {
    setTimeout(async () => {
      const autoReply = {
        conversa_id: activeConversa.id,
        sender_type: "cartomante",
        texto: `🤖 *Resposta Automática*: "${chatEmotionalConfig.mensagem_esgotamento}"`,
        is_question: false,
        read: true
      };

      if (isRealSupabase) {
        await supabase.from("mensagens").insert([autoReply]);
      } else {
        const key = activeConversa.cliente.id;
        MOCK_INITIAL_MESSAGES[key].push({
          id: `m-local-auto-${Date.now()}`,
          ...autoReply,
          created_at: new Date().toISOString()
        });
        await loadMessagesForActiveConversation();
      }
    }, 1000);
  }
}

// Simular entrada de Pergunta ao Baralho enviada pelo cliente
async function simulateClientQuestion() {
  if (!activeConversa) {
    alert("Selecione um consulente na barra lateral antes de realizar a simulação.");
    return;
  }

  const perguntasSimuladas = [
    { pergunta: "Vou conseguir vender meu imóvel nos próximos 3 meses?", area: "financeiro", urgencia: "media", contexto: "Estou negociando com dois compradores." },
    { pergunta: "Estou sob algum tipo de ataque ou inveja espiritual?", area: "espiritual", urgencia: "alta", contexto: "Muitos pesadelos constantes." },
    { pergunta: "Devo investir na minha carreira artística ou comercial?", area: "trabalho", urgencia: "baixa", contexto: "Trabalho como contador mas amo pintar." }
  ];

  const q = perguntasSimuladas[Math.floor(Math.random() * perguntasSimuladas.length)];
  const isRealSupabase = await testSupabaseConnection();
  const baseValue = 50.00;

  if (isRealSupabase) {
    const cartomanteId = await getCartomanteId();
    const { data: pCreated } = await supabase
      .from("perguntas_baralho")
      .insert([{
        conversa_id: activeConversa.id,
        cliente_id: activeConversa.cliente.id,
        cartomante_id: cartomanteId,
        pergunta_principal: q.pergunta,
        contexto: q.contexto,
        area_vida: q.area,
        urgencia: q.urgencia,
        status: "enviada",
        quantidade_perguntas: 1,
        valor: baseValue
      }])
      .select("id")
      .single();

    if (pCreated) {
      await supabase.from("mensagens").insert([{
        conversa_id: activeConversa.id,
        sender_type: "cliente",
        texto: `✨ [Pergunta ao Baralho]: ${q.pergunta}`,
        is_question: true,
        question_id: pCreated.id,
        read: false
      }]);
    }
  } else {
    // Mock local
    const createdId = `perg-local-${Date.now()}`;
    localPerguntasDb[createdId] = {
      id: createdId,
      conversa_id: activeConversa.id,
      cliente_id: activeConversa.cliente.id,
      cartomante_id: "mock-cartomante",
      pergunta_principal: q.pergunta,
      contexto: q.contexto,
      area_vida: q.area,
      urgencia: q.urgencia,
      status: "enviada",
      quantidade_perguntas: 1,
      valor: baseValue,
      created_at: new Date().toISOString()
    };

    const key = activeConversa.cliente.id;
    MOCK_INITIAL_MESSAGES[key].push({
      id: `m-local-${Date.now()}`,
      conversa_id: activeConversa.id,
      sender_type: "cliente",
      texto: `✨ [Pergunta ao Baralho]: ${q.pergunta}`,
      is_question: true,
      question_id: createdId,
      created_at: new Date().toISOString()
    });

    await loadMessagesForActiveConversation();
  }
}

// Verifica parâmetros da URL
function checkURLParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const tab = urlParams.get("tab");
  if (tab === "perguntas") {
    // Muda visual dos botões e foca na área de perguntas se necessário
    console.log("Aba de Perguntas focada!");
    const btn = document.getElementById("menu-perguntas");
    if (btn) btn.classList.add("active");
    const chatBtn = document.getElementById("menu-chat");
    if (chatBtn) chatBtn.classList.remove("active");
  }
}

function selectTabFromMenu() {
  const urlParams = new URLSearchParams(window.location.search);
  urlParams.set("tab", "perguntas");
  window.history.replaceState({}, "", `${window.location.pathname}?${urlParams.toString()}`);
  checkURLParams();
}

// ==========================================================================
// 13. INTEGRAÇÃO DO MODO ESGOTAMENTO E RESPOSTAS RÁPIDAS (PROMPT 11)
// ==========================================================================

let chatEmotionalConfig = {
  modo_esgotamento: false,
  mensagem_esgotamento: "Os atendimentos estão funcionando em ritmo reduzido no momento para manter a qualidade e cuidado emocional.",
  max_atendimentos: 10,
  max_perguntas: 5,
  min_interval: 15
};

let chatQuickResponses = {
  confirmacao: { titulo: "Confirmação de Consulta", conteudo: "Saudações de luz! Sua consulta de tarô foi agendada e as energias estão sintonizadas. Aguardo você no dia e hora marcados no ritual." },
  reagendamento: { titulo: "Reagendamento Acolhedor", conteudo: "Compreendo e respeito seu fluxo de tempo. Qual o melhor dia e horário na próxima semana para movermos nossa tiragem espiritual?" },
  atraso: { titulo: "Aviso de Atraso Místico", conteudo: "Peço licença. O atendimento anterior exigiu uma limpeza energética mais longa. Iniciaremos nossa conexão com 10 minutos de intervalo." },
  pagamento: { titulo: "Aguardando Pagamento", conteudo: "Sua Pergunta ao Baralho foi enviada. Assim que a plataforma confirmar o pagamento místico, revelarei as respostas com amor." },
  acolhimento: { titulo: "Mensagem de Acolhida", conteudo: "Que a paz guie seus passos hoje! Fique à vontade para repousar seu coração e descrever seus anseios com total tranquilidade." },
  indisponibilidade: { titulo: "Indisponibilidade / Pausa", conteudo: "Os atendimentos estão temporariamente suspensos para descanso da mente e limpeza energética. Retornarei no ciclo de amanhã." }
};

// Carrega as diretrizes do LocalStorage e inicializa os banners e limites do chat
// Carrega as diretrizes do LocalStorage/Supabase e inicializa os banners e limites do chat
async function initializeEmotionalAndQuickResponses() {
  const isRealSupabase = await testSupabaseConnection();

  if (isRealSupabase) {
    try {
      const cartomanteId = await getCartomanteId();
      if (cartomanteId) {
        // 1. Carregar Configuração do Chat
        const { data: config } = await supabase
          .from("configuracoes_chat")
          .select("*")
          .eq("cartomante_id", cartomanteId)
          .maybeSingle();

        if (config) {
          chatEmotionalConfig = {
            modo_esgotamento: config.modo_esgotamento,
            mensagem_esgotamento: config.mensagem_esgotamento,
            max_atendimentos: config.max_atendimentos_diarios,
            max_perguntas: config.max_perguntas_diarias,
            min_interval: config.tempo_minimo_entre_clientes
          };
        }

        // 2. Carregar Respostas Rápidas
        const { data: responses } = await supabase
          .from("respostas_rapidas")
          .select("*")
          .eq("cartomante_id", cartomanteId);

        if (responses && responses.length > 0) {
          chatQuickResponses = {};
          responses.forEach(r => {
            chatQuickResponses[r.chave] = {
              titulo: r.titulo,
              conteudo: r.conteudo
            };
          });
        }
      }
    } catch (e) {
      console.warn("Erro ao buscar dados dinâmicos do chat:", e);
    }
  } else {
    const storedConfig = localStorage.getItem("cartomante_emotional_config");
    if (storedConfig) {
      chatEmotionalConfig = JSON.parse(storedConfig);
    }

    const storedResponses = localStorage.getItem("cartomante_quick_responses");
    if (storedResponses) {
      chatQuickResponses = JSON.parse(storedResponses);
    }
  }

  // 1. Banner de Modo Esgotamento
  const banner = document.getElementById("chatEsgotamentoBanner");
  const bannerText = document.getElementById("chatEsgotamentoBannerText");
  if (banner) {
    if (chatEmotionalConfig.modo_esgotamento) {
      banner.style.display = "flex";
      if (bannerText) {
        bannerText.innerText = `Modo Esgotamento Ativo: ${chatEmotionalConfig.mensagem_esgotamento}`;
      }
    } else {
      banner.style.display = "none";
    }
  }

  // 2. Preencher a lista do popup de respostas rápidas
  const listContainer = document.getElementById("quickResponsesList");
  if (listContainer) {
    listContainer.innerHTML = "";
    for (const [chave, val] of Object.entries(chatQuickResponses)) {
      const item = document.createElement("div");
      item.style.padding = "8px 12px";
      item.style.background = "rgba(255,255,255,0.03)";
      item.style.border = "1px solid var(--card-border)";
      item.style.borderRadius = "8px";
      item.style.cursor = "pointer";
      item.style.fontSize = "0.75rem";
      item.style.transition = "all var(--transition-fast)";
      item.style.color = "var(--text-secondary)";
      
      item.innerHTML = `
        <strong style="color: var(--gold-color); display: block; margin-bottom: 2px;">${val.titulo}</strong>
        <span style="display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${val.conteudo}</span>
      `;
      
      item.onclick = () => selectQuickResponse(val.conteudo);
      
      item.onmouseover = () => {
        item.style.borderColor = "var(--gold-color)";
        item.style.background = "rgba(199, 162, 122, 0.05)";
      };
      item.onmouseout = () => {
        item.style.borderColor = "var(--card-border)";
        item.style.background = "rgba(255,255,255,0.03)";
      };

      listContainer.appendChild(item);
    }
  }
}

// Abre/fecha o popup de respostas rápidas
function toggleQuickResponsesMenu() {
  const popup = document.getElementById("quickResponsesPopup");
  if (popup) {
    const isHidden = popup.style.display === "none";
    popup.style.display = isHidden ? "block" : "none";
  }
}

// Seleciona a resposta rápida e preenche o input do chat
function selectQuickResponse(text) {
  const inputField = document.getElementById("chatInputField");
  if (inputField) {
    inputField.value = text;
    inputField.focus();
  }
  toggleQuickResponsesMenu();
}

// Auxiliar para registrar logs de auditoria
async function logSecurityAction(action, details, clienteId = null) {
  const isRealSupabase = await testSupabaseConnection();
  if (isRealSupabase) {
    try {
      const cartomanteId = await getCartomanteId();
      if (cartomanteId) {
        await supabase.from("historico_acoes").insert([{
          cartomante_id: cartomanteId,
          cliente_id: clienteId,
          acao: action,
          detalhes: details
        }]);
      }
    } catch (e) {
      console.warn("Erro ao registrar log de segurança:", e);
    }
  } else {
    let localLogs = JSON.parse(localStorage.getItem("cartomante_local_logs") || "[]");
    localLogs.unshift({
      created_at: new Date().toISOString(),
      acao: action,
      detalhes: details,
      cliente_id: clienteId
    });
    localStorage.setItem("cartomante_local_logs", JSON.stringify(localLogs));
  }
}

