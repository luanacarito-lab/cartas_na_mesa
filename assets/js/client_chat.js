// client_chat.js - Lógica do Chat e Pergunta ao Baralho para Consulente (Cliente)
// ---------------------------------------------------------------------------------
const SUPABASE_URL = (window.ENV && window.ENV.SUPABASE_URL) || "https://YOUR_PROJECT_REF.supabase.co";
const SUPABASE_ANON_KEY = (window.ENV && window.ENV.SUPABASE_ANON_KEY) || "YOUR_PUBLIC_ANON_KEY";

// Initialize Supabase client
let supabase = null;
try {
  supabase = supabaseCreateClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) {
  console.warn("Erro ao inicializar Supabase no client_chat.js", e);
}

// Helper to create Supabase client via CDN
function supabaseCreateClient(url, key) {
  if (typeof window.supabase !== "undefined") {
    return window.supabase.createClient(url, key);
  }
  return null;
}

// Global state
let conversaId = null;
let loggedClient = null;
let cartomanteData = null;
let currentQuestionToPay = null;

// DOM Elements
const chatMessagesEl = document.getElementById("chatMessages");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const askBaralhoBtn = document.getElementById("askBaralhoBtn");
const askBaralhoModal = document.getElementById("askBaralhoModal");
const askBaralhoForm = document.getElementById("askBaralhoForm");
const paymentModal = document.getElementById("paymentModal");
const paymentValueEl = document.getElementById("paymentValue");
const payConfirmBtn = document.getElementById("payConfirmBtn");

// Retrieve conversation ID from URL
function getConversaId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("cid");
}

// Check auth, client profile and load conversation
async function initChat() {
  conversaId = getConversaId();
  if (!conversaId) {
    window.location.href = "client_area.html";
    return;
  }

  if (!supabase) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  // Load client
  const { data: client, error: clientError } = await supabase
    .from("clientes")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (clientError || !client) {
    console.error("Erro ao autenticar cliente no chat:", clientError);
    window.location.href = "login.html";
    return;
  }
  loggedClient = client;

  // Validate conversation owner
  const { data: conversa, error: convError } = await supabase
    .from("conversas")
    .select("*")
    .eq("id", conversaId)
    .eq("cliente_id", client.id)
    .maybeSingle();

  if (convError || !conversa) {
    console.error("Conversa não encontrada ou sem permissão:", convError);
    window.location.href = "client_area.html";
    return;
  }

  // Load cartomante details
  const { data: cartomante, error: cartError } = await supabase
    .from("cartomantes")
    .select("*")
    .eq("user_id", conversa.cartomante_id)
    .maybeSingle();

  if (cartomante) {
    cartomanteData = cartomante;
    const fotoEl = document.getElementById("cartomanteFoto");
    const nomeEl = document.getElementById("cartomanteNome");
    const funcaoEl = document.getElementById("cartomanteFuncao");
    if (fotoEl) fotoEl.src = cartomante.foto_url || "assets/img/default-avatar.png";
    if (nomeEl) nomeEl.textContent = cartomante.nome;
    if (funcaoEl) funcaoEl.textContent = cartomante.funcao || "Oraculista";
  }

  // Initial render of messages
  await loadMessages();
  subscribeRealtime();
}

// Load messages from database
async function loadMessages() {
  if (!supabase || !conversaId) return;

  const { data: messages, error } = await supabase
    .from("mensagens")
    .select(`
      id,
      conversa_id,
      sender_type,
      texto,
      arquivo_url,
      arquivo_nome,
      arquivo_tipo,
      is_question,
      question_id,
      created_at
    `)
    .eq("conversa_id", conversaId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Erro ao carregar mensagens:", error);
    return;
  }

  renderMessages(messages || []);
}

// Render messages history
async function renderMessages(messages) {
  if (!chatMessagesEl) return;
  chatMessagesEl.innerHTML = "";

  for (const msg of messages) {
    const row = document.createElement("div");
    row.className = `message-row ${msg.sender_type === "cliente" ? "client" : "cartomante"}`;

    if (msg.is_question && msg.question_id) {
      // É um card de pergunta
      const card = await buildQuestionCard(msg.question_id);
      row.appendChild(card);
    } else {
      // Mensagem de texto comum
      const bubble = document.createElement("div");
      bubble.className = "message-bubble";
      
      let content = msg.texto || "";
      if (msg.arquivo_url) {
        if (msg.arquivo_tipo === "imagem") {
          content = `<img src="${msg.arquivo_url}" style="max-width:100%; border-radius:8px; margin-bottom:5px;"/><br/>${content}`;
        } else if (msg.arquivo_tipo === "audio") {
          content = `<audio src="${msg.arquivo_url}" controls style="max-width:100%; margin-bottom:5px;"></audio><br/>${content}`;
        } else {
          content = `<a href="${msg.arquivo_url}" target="_blank" style="color:inherit; text-decoration:underline;"><i class="fas fa-file"></i> ${msg.arquivo_nome || "Arquivo"}</a><br/>${content}`;
        }
      }

      const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      bubble.innerHTML = `${content} <span class="message-time">${time}</span>`;
      row.appendChild(bubble);
    }

    chatMessagesEl.appendChild(row);
  }

  // Scroll to bottom
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

// Build question card asynchronously
async function buildQuestionCard(questionId) {
  const card = document.createElement("div");
  card.className = "question-card glass-panel";

  const { data: q, error } = await supabase
    .from("perguntas_baralho")
    .select("*")
    .eq("id", questionId)
    .maybeSingle();

  if (error || !q) {
    card.innerHTML = `<p style="margin:0; font-style:italic;">Erro ao carregar Pergunta ao Baralho.</p>`;
    return card;
  }

  let statusLabel = "";
  let badgeClass = "";
  switch (q.status) {
    case "enviada":
      statusLabel = "Enviada";
      badgeClass = "badge-enviada";
      break;
    case "aguardando_pagamento":
      statusLabel = "Aguardando Troca";
      badgeClass = "badge-pagamento";
      break;
    case "paga":
      statusLabel = "Paga / Sintonizando";
      badgeClass = "badge-paga";
      break;
    case "respondida":
      statusLabel = "Respondida";
      badgeClass = "badge-respondida";
      break;
    case "cancelada":
      statusLabel = "Cancelada";
      badgeClass = "badge-cancelada";
      break;
  }

  let actionsHtml = "";
  if (q.status === "aguardando_pagamento") {
    actionsHtml = `
      <div style="margin-top: 15px; display: flex; justify-content: flex-end;">
        <button onclick="openPaymentModal('${q.id}', ${q.valor})" class="glass-button" style="border-color: var(--gold-color); color: var(--gold-color); font-size: 0.78rem; padding: 6px 12px;">
          <i class="fas fa-wallet"></i> Pagar Troca (R$ ${q.valor.toFixed(2).replace('.', ',')})
        </button>
      </div>
    `;
  }

  let answerHtml = "";
  if (q.status === "respondida" && q.resposta_texto) {
    let audioHtml = "";
    if (q.resposta_arquivo_url && q.resposta_arquivo_tipo === "audio") {
      audioHtml = `<div style="margin-top:10px;"><audio src="${q.resposta_arquivo_url}" controls style="width:100%;"></audio></div>`;
    }
    answerHtml = `
      <div class="question-answer">
        <strong>🔮 Resposta do Baralho:</strong>
        <p style="margin: 8px 0 0 0; line-height: 1.5; font-family: var(--font-classic);">${q.resposta_texto}</p>
        ${audioHtml}
      </div>
    `;
  }

  card.innerHTML = `
    <div class="question-card-header">
      <div class="question-card-title"><i class="fas fa-crown"></i> Pergunta ao Baralho</div>
      <span class="question-badge ${badgeClass}">${statusLabel}</span>
    </div>
    <div class="question-card-body">
      <p style="font-weight: 600; margin: 0 0 8px 0; color: var(--gold-color);">${q.pergunta_principal}</p>
      <p style="margin: 0; font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4;">${q.contexto || ""}</p>
    </div>
    <div class="question-card-meta">
      <div><i class="fas fa-leaf"></i> Área: <strong>${translateArea(q.area_vida)}</strong></div>
      <div><i class="fas fa-bolt"></i> Urgência: <strong>${translateUrgencia(q.urgencia)}</strong></div>
      <div><i class="fas fa-layer-group"></i> Quantidade: <strong>${q.quantidade_perguntas} Perg.</strong></div>
      <div><i class="fas fa-coins"></i> Valor Troca: <strong>R$ ${q.valor.toFixed(2).replace('.', ',')}</strong></div>
    </div>
    ${answerHtml}
    ${actionsHtml}
  `;

  return card;
}

function translateArea(val) {
  const map = {
    amor: "Amor & Relações",
    espiritual: "Espiritualidade",
    financeiro: "Financeiro",
    trabalho: "Trabalho",
    familia: "Família",
    saude_emocional: "Saúde Emocional",
    outro: "Outro"
  };
  return map[val] || val;
}

function translateUrgencia(val) {
  const map = {
    baixa: "Baixa",
    media: "Média",
    alta: "Alta"
  };
  return map[val] || val;
}

// Open and close payment modal
window.openPaymentModal = function(questionId, value) {
  currentQuestionToPay = questionId;
  if (paymentValueEl) {
    paymentValueEl.textContent = `R$ ${value.toFixed(2).replace('.', ',')}`;
  }
  if (paymentModal) paymentModal.classList.remove("hidden");
};

window.closePaymentModal = function() {
  if (paymentModal) paymentModal.classList.add("hidden");
  currentQuestionToPay = null;
};

// Confirm payment simulation
if (payConfirmBtn) {
  payConfirmBtn.addEventListener("click", async () => {
    if (!supabase || !currentQuestionToPay) return;

    payConfirmBtn.disabled = true;
    payConfirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Confirmando...';

    const { error } = await supabase
      .from("perguntas_baralho")
      .update({ status: "paga" })
      .eq("id", currentQuestionToPay);

    if (error) {
      alert("Erro ao confirmar pagamento: " + error.message);
    } else {
      alert("Pagamento simulado efetuado com sucesso! A cartomante foi notificada.");
      closePaymentModal();
      await loadMessages();
    }

    payConfirmBtn.disabled = false;
    payConfirmBtn.innerHTML = '<i class="fas fa-check-circle"></i> Confirmar Pagamento Simulado';
  });
}

// Send standard text message
if (messageForm) {
  messageForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const texto = messageInput.value.trim();
    if (!texto || !supabase || !conversaId) return;

    messageInput.value = "";
    
    const { error } = await supabase
      .from("mensagens")
      .insert({
        conversa_id: conversaId,
        sender_type: "cliente",
        texto: texto,
        is_question: false
      });

    if (error) {
      console.error("Erro ao enviar mensagem:", error);
    } else {
      await loadMessages();
    }
  });
}

// Modals handling for Ask Baralho
if (askBaralhoBtn) {
  askBaralhoBtn.addEventListener("click", () => {
    if (askBaralhoModal) askBaralhoModal.classList.remove("hidden");
  });
}

window.closeAskBaralhoModal = function() {
  if (askBaralhoModal) askBaralhoModal.classList.add("hidden");
};

// Send Tarot Question Form submission
if (askBaralhoForm) {
  askBaralhoForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!supabase || !conversaId || !loggedClient || !cartomanteData) return;

    const sendBtn = document.getElementById("sendAskBtn");
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ritualizando Envio...';
    }

    const pergunta = document.getElementById("askPergunta").value.trim();
    const contexto = document.getElementById("askContexto").value.trim();
    const area = document.getElementById("askArea").value;
    const urgencia = document.getElementById("askUrgencia").value;

    try {
      // 1. Criar pergunta
      const { data: question, error: qError } = await supabase
        .from("perguntas_baralho")
        .insert({
          conversa_id: conversaId,
          cliente_id: loggedClient.id,
          cartomante_id: cartomanteData.user_id,
          pergunta_principal: pergunta,
          contexto: contexto,
          area_vida: area,
          urgencia: urgencia,
          status: "enviada",
          quantidade_perguntas: 1,
          valor: 0.0
        })
        .select()
        .single();

      if (qError) {
        alert("Erro ao enviar pergunta ao oráculo: " + qError.message);
        if (sendBtn) {
          sendBtn.disabled = false;
          sendBtn.innerHTML = '<i class="fas fa-magic"></i> Enviar Ritualisticamente ao Baralho';
        }
        return;
      }

      // 2. Criar mensagem âncora no chat
      const { error: msgError } = await supabase
        .from("mensagens")
        .insert({
          conversa_id: conversaId,
          sender_type: "cliente",
          is_question: true,
          question_id: question.id,
          texto: `✨ Canalizada uma nova Pergunta ao Baralho: "${pergunta}"`
        });

      if (msgError) {
        console.error("Erro ao criar mensagem âncora:", msgError);
      }

      alert("Sua pergunta foi enviada ao templo espiritual com sucesso!");
      closeAskBaralhoModal();
      askBaralhoForm.reset();
      await loadMessages();

    } catch (err) {
      console.error("Erro geral na postagem da pergunta:", err);
    }

    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.innerHTML = '<i class="fas fa-magic"></i> Enviar Ritualisticamente ao Baralho';
    }
  });
}

// Real-time listener
function subscribeRealtime() {
  if (!supabase || !conversaId) return;

  supabase
    .channel(`public:chat_mensagens_${conversaId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "mensagens", filter: `conversa_id=eq.${conversaId}` },
      async (payload) => {
        console.log("Mensagem modificada em tempo real:", payload);
        await loadMessages();
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "perguntas_baralho", filter: `conversa_id=eq.${conversaId}` },
      async (payload) => {
        console.log("Pergunta modificada em tempo real:", payload);
        await loadMessages();
      }
    )
    .subscribe();
}

// Init
window.addEventListener("load", async () => {
  await initChat();
});
