// client_chat.js - Lógica do Chat e Pergunta ao Baralho para Consulente (Cliente)
// ---------------------------------------------------------------------------------
const SUPABASE_URL = (window.ENV && window.ENV.SUPABASE_URL) || "https://YOUR_PROJECT_REF.supabase.co";
const SUPABASE_ANON_KEY = (window.ENV && window.ENV.SUPABASE_ANON_KEY) || "YOUR_PUBLIC_ANON_KEY";

// Initialize Supabase client
let supabase = window.supabaseClient;

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

// Test connection helper
async function testSupabaseConnection() {
  return await window.testSupabaseConnection();
}

// Get mock messages from localStorage or default
function getMockMessages(key) {
  const localMsgs = localStorage.getItem("cartomante_messages_db");
  let db = {};
  if (localMsgs) {
    try {
      db = JSON.parse(localMsgs);
    } catch (e) {
      db = {};
    }
  }
  
  if (!db[key]) {
    const defaultMocks = {
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
    db[key] = defaultMocks[key] || [];
    localStorage.setItem("cartomante_messages_db", JSON.stringify(db));
  }
  return db[key];
}

function saveMockMessage(key, newMsg) {
  const localMsgs = localStorage.getItem("cartomante_messages_db");
  let db = {};
  if (localMsgs) {
    try {
      db = JSON.parse(localMsgs);
    } catch (e) {
      db = {};
    }
  }
  if (!db[key]) db[key] = [];
  db[key].push(newMsg);
  localStorage.setItem("cartomante_messages_db", JSON.stringify(db));
}

function getMockQuestions() {
  const localQ = localStorage.getItem("cartomante_perguntas_db");
  if (!localQ) return {};
  try {
    return JSON.parse(localQ);
  } catch (e) {
    return {};
  }
}

function saveMockQuestion(qId, questionObj) {
  const db = getMockQuestions();
  db[qId] = questionObj;
  localStorage.setItem("cartomante_perguntas_db", JSON.stringify(db));
}

// Check auth, client profile and load conversation
async function initChat() {
  conversaId = getConversaId() || "conv-uuid-c1-uuid-helena";

  const isRealSupabase = supabase && !SUPABASE_URL.includes("YOUR_PROJECT_REF") && await testSupabaseConnection();

  if (isRealSupabase) {
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

    await loadMessages();
    subscribeRealtime();
  } else {
    // MOCK MODE
    console.log("Iniciando chat consulente em modo demonstrativo.");
    
    let clientName = "Helena de Souza";
    let clientId = "c1-uuid-helena";
    if (conversaId.includes("gabriel")) {
      clientName = "Gabriel Medeiros";
      clientId = "c2-uuid-gabriel";
    } else if (conversaId.includes("valentina")) {
      clientName = "Valentina Rocha";
      clientId = "c3-uuid-valentina";
    }
    
    loggedClient = {
      id: clientId,
      nome_completo: clientName,
      user_id: "demo-client-user-id"
    };

    cartomanteData = {
      user_id: "demo-cartomante-user-id",
      nome: "Morgana da Lua",
      foto_url: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&auto=format&fit=crop",
      funcao: "Taróloga Ancestral e Terapeuta Oracular"
    };

    const fotoEl = document.getElementById("cartomanteFoto");
    const nomeEl = document.getElementById("cartomanteNome");
    const funcaoEl = document.getElementById("cartomanteFuncao");
    if (fotoEl) fotoEl.src = cartomanteData.foto_url;
    if (nomeEl) nomeEl.textContent = cartomanteData.nome;
    if (funcaoEl) funcaoEl.textContent = cartomanteData.funcao;

    await loadMessages();
  }

  // Abrir modal de Pergunta ao Baralho reativamente
  const params = new URLSearchParams(window.location.search);
  if (params.get("action") === "ask_baralho") {
    if (askBaralhoModal) {
      askBaralhoModal.classList.remove("hidden");
    }
  }
}

// Load messages from database
async function loadMessages() {
  const isRealSupabase = supabase && !SUPABASE_URL.includes("YOUR_PROJECT_REF") && await testSupabaseConnection();

  if (isRealSupabase) {
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
  } else {
    let clientId = "c1-uuid-helena";
    if (conversaId.includes("gabriel")) {
      clientId = "c2-uuid-gabriel";
    } else if (conversaId.includes("valentina")) {
      clientId = "c3-uuid-valentina";
    }
    const messages = getMockMessages(clientId);
    renderMessages(messages);
  }
}

// Render messages history
async function renderMessages(messages) {
  if (!chatMessagesEl) return;
  chatMessagesEl.innerHTML = "";

  for (const msg of messages) {
    const row = document.createElement("div");
    row.className = `message-row ${msg.sender_type === "cliente" ? "client" : "cartomante"}`;

    if (msg.is_question && msg.question_id) {
      const card = await buildQuestionCard(msg.question_id);
      row.appendChild(card);
    } else {
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

  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

// Build question card asynchronously
async function buildQuestionCard(questionId) {
  const card = document.createElement("div");
  card.className = "question-card glass-panel";

  const isRealSupabase = supabase && !SUPABASE_URL.includes("YOUR_PROJECT_REF") && await testSupabaseConnection();
  let q = null;

  if (isRealSupabase) {
    const { data, error } = await supabase
      .from("perguntas_baralho")
      .select("*")
      .eq("id", questionId)
      .maybeSingle();
    if (!error && data) q = data;
  } else {
    const db = getMockQuestions();
    q = db[questionId];
  }

  if (!q) {
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
    if (!currentQuestionToPay) return;

    payConfirmBtn.disabled = true;
    payConfirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Confirmando...';

    const isRealSupabase = supabase && !SUPABASE_URL.includes("YOUR_PROJECT_REF") && await testSupabaseConnection();

    if (isRealSupabase) {
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
    } else {
      const db = getMockQuestions();
      const q = db[currentQuestionToPay];
      if (q) {
        q.status = "paga";
        saveMockQuestion(currentQuestionToPay, q);

        const localFinances = localStorage.getItem("cartomante_finances_db");
        if (localFinances) {
          const finances = JSON.parse(localFinances);
          const tx = finances.find(f => f.referencia_id === currentQuestionToPay);
          if (tx) {
            tx.status = "pago";
            localStorage.setItem("cartomante_finances_db", JSON.stringify(finances));
          }
        }

        if (typeof window.addLocalNotification === "function") {
            window.addLocalNotification("Troca Confirmada", `O consulente confirmou o pagamento de R$ ${q.valor.toFixed(2).replace('.', ',')}`, "pagamento", { conversa_id: conversaId });
        }

        alert("Pagamento simulado efetuado com sucesso! A cartomante foi notificada.");
        closePaymentModal();
        await loadMessages();
      }
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
    if (!texto || !conversaId) return;

    messageInput.value = "";
    
    const isRealSupabase = supabase && !SUPABASE_URL.includes("YOUR_PROJECT_REF") && await testSupabaseConnection();

    if (isRealSupabase) {
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
    } else {
      let clientId = "c1-uuid-helena";
      if (conversaId.includes("gabriel")) {
        clientId = "c2-uuid-gabriel";
      } else if (conversaId.includes("valentina")) {
        clientId = "c3-uuid-valentina";
      }

      const newMsg = {
        id: "msg-" + Date.now(),
        conversa_id: conversaId,
        sender_type: "cliente",
        texto: texto,
        is_question: false,
        created_at: new Date().toISOString()
      };

      saveMockMessage(clientId, newMsg);

      setTimeout(() => {
        const responses = [
          "As cartas estão sendo embaralhadas, sinto uma energia forte ao redor de sua pergunta.",
          "O templo acolhe sua questão. Respire fundo e sintonize com sua intenção.",
          "Compreendo perfeitamente sua busca. Vou analisar com calma a tiragem.",
          "Que a luz guie nossa leitura hoje. Estou preparando os arcanos para você."
        ];
        const randomResp = responses[Math.floor(Math.random() * responses.length)];
        const systemMsg = {
          id: "msg-" + (Date.now() + 1),
          conversa_id: conversaId,
          sender_type: "cartomante",
          texto: randomResp,
          is_question: false,
          created_at: new Date().toISOString()
        };
        saveMockMessage(clientId, systemMsg);
        loadMessages();

        if (typeof window.addLocalNotification === "function") {
            window.addLocalNotification("Mensagem Recebida", `A cartomante Morgana respondeu: "${randomResp.substring(0, 30)}..."`, "mensagem", { conversa_id: conversaId });
        }
      }, 2000);

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
    if (!conversaId || !loggedClient || !cartomanteData) return;

    const sendBtn = document.getElementById("sendAskBtn");
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ritualizando Envio...';
    }

    const pergunta = document.getElementById("askPergunta").value.trim();
    const contexto = document.getElementById("askContexto").value.trim();
    const area = document.getElementById("askArea").value;
    const urgencia = document.getElementById("askUrgencia").value;

    const isRealSupabase = supabase && !SUPABASE_URL.includes("YOUR_PROJECT_REF") && await testSupabaseConnection();

    if (isRealSupabase) {
      try {
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
        } else {
          await supabase
            .from("mensagens")
            .insert({
              conversa_id: conversaId,
              sender_type: "cliente",
              is_question: true,
              question_id: question.id,
              texto: `✨ Canalizada uma nova Pergunta ao Baralho: "${pergunta}"`
            });

          alert("Sua pergunta foi enviada ao templo espiritual com sucesso!");
          closeAskBaralhoModal();
          askBaralhoForm.reset();
          await loadMessages();
        }
      } catch (err) {
        console.error("Erro geral na postagem da pergunta:", err);
      }
    } else {
      try {
        const questionId = "q-" + Date.now();
        const newQuestion = {
          id: questionId,
          conversa_id: conversaId,
          cliente_id: loggedClient.id,
          cartomante_id: cartomanteData.user_id,
          pergunta_principal: pergunta,
          contexto: contexto,
          area_vida: area,
          urgencia: urgencia,
          status: "enviada",
          quantidade_perguntas: 1,
          valor: 50.0
        };

        saveMockQuestion(questionId, newQuestion);

        const localFinances = localStorage.getItem("cartomante_finances_db") || "[]";
        let finances = JSON.parse(localFinances);
        finances.unshift({
          id: "tx-" + Date.now(),
          cliente_nome: loggedClient.nome_completo,
          servico: "Pergunta ao Baralho",
          valor: 50.0,
          status: "pendente",
          data: new Date().toLocaleDateString("pt-BR"),
          referencia_id: questionId
        });
        localStorage.setItem("cartomante_finances_db", JSON.stringify(finances));

        let clientId = "c1-uuid-helena";
        if (conversaId.includes("gabriel")) {
          clientId = "c2-uuid-gabriel";
        } else if (conversaId.includes("valentina")) {
          clientId = "c3-uuid-valentina";
        }

        const newMsg = {
          id: "msg-" + Date.now(),
          conversa_id: conversaId,
          sender_type: "cliente",
          is_question: true,
          question_id: questionId,
          texto: `✨ Canalizada uma nova Pergunta ao Baralho: "${pergunta}"`,
          created_at: new Date().toISOString()
        };

        saveMockMessage(clientId, newMsg);

        if (typeof window.addLocalNotification === "function") {
            window.addLocalNotification("Pergunta Recebida", `Pergunta de ${loggedClient.nome_completo}: "${pergunta.substring(0, 30)}..."`, "pergunta", { conversa_id: conversaId });
        }

        alert("Sua pergunta foi enviada ao templo espiritual com sucesso!");
        closeAskBaralhoModal();
        askBaralhoForm.reset();
        await loadMessages();
      } catch (err) {
        console.error("Erro no envio local:", err);
      }
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
