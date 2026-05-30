// settings.js – Motor de Configurações, Acessibilidade e Autocuidado
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
  console.warn("Supabase não disponível. Rodando Configurações em Modo Demonstrativo.");
}

// ==========================================================================
// ESTADO INTERNO DAS CONFIGURAÇÕES MOCK
// ==========================================================================
let emotionalConfig = {
  modo_esgotamento: false,
  mensagem_esgotamento: "Os atendimentos estão funcionando em ritmo reduzido no momento para manter a qualidade e cuidado emocional.",
  max_atendimentos: 10,
  max_perguntas: 5,
  min_interval: 15
};

// Respostas Rápidas Iniciais
let quickResponses = {
  confirmacao: {
    titulo: "Confirmação de Consulta",
    conteudo: "Saudações de luz! Sua consulta de tarô foi agendada e as energias estão sintonizadas. Aguardo você no dia e hora marcados no ritual."
  },
  reagendamento: {
    titulo: "Reagendamento Acolhedor",
    conteudo: "Compreendo e respeito seu fluxo de tempo. Qual o melhor dia e horário na próxima semana para movermos nossa tiragem espiritual?"
  },
  atraso: {
    titulo: "Aviso de Atraso Místico",
    conteudo: "Peço licença. O atendimento anterior exigiu uma limpeza energética mais longa. Iniciaremos nossa conexão com 10 minutos de intervalo."
  },
  pagamento: {
    titulo: "Aguardando Pagamento",
    conteudo: "Sua Pergunta ao Baralho foi enviada. Assim que a plataforma confirmar o pagamento místico, revelarei as respostas com amor."
  },
  acolhimento: {
    titulo: "Mensagem de Acolhida",
    conteudo: "Que a paz guie seus passos hoje! Fique à vontade para repousar seu coração e descrever seus anseios com total tranquilidade."
  },
  indisponibilidade: {
    titulo: "Indisponibilidade / Pausa",
    conteudo: "Os atendimentos estão temporariamente suspensos para descanso da mente e limpeza energética. Retornarei no ciclo de amanhã."
  }
};

// ==========================================================================
// INICIALIZAÇÃO DA PÁGINA
// ==========================================================================
document.addEventListener("DOMContentLoaded", async () => {
  const isConnected = await testSupabaseConnection();
  
  // 1. Carregar configurações
  if (isConnected) {
    await fetchRealConfig();
    await fetchRealQuickResponses();
  } else {
    loadDemonstrativeConfig();
  }
});

// Verifica se a conexão com o Supabase está respondendo
async function testSupabaseConnection() {
  if (!supabase || SUPABASE_URL.includes("YOUR_PROJECT_REF")) return false;
  try {
    const { data, error } = await supabase.from("configuracoes_chat").select("cartomante_id").limit(1);
    return error ? false : true;
  } catch (e) {
    return false;
  }
}

// Carregar Dados Demonstrativos
function loadDemonstrativeConfig() {
  // Configs
  const storedConfig = localStorage.getItem("cartomante_emotional_config");
  if (storedConfig) {
    emotionalConfig = JSON.parse(storedConfig);
  } else {
    localStorage.setItem("cartomante_emotional_config", JSON.stringify(emotionalConfig));
  }

  // Respostas
  const storedResponses = localStorage.getItem("cartomante_quick_responses");
  if (storedResponses) {
    quickResponses = JSON.parse(storedResponses);
  } else {
    localStorage.setItem("cartomante_quick_responses", JSON.stringify(quickResponses));
  }

  fillConfigUI();
}

// Carregar Real do Supabase
async function fetchRealConfig() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      loadDemonstrativeConfig();
      return;
    }

    const { data, error } = await supabase
      .from("configuracoes_chat")
      .select("modo_esgotamento, mensagem_esgotamento, max_atendimentos_diarios, max_perguntas_diarias, tempo_minimo_entre_clientes")
      .eq("cartomante_id", user.id)
      .single();

    if (error || !data) {
      loadDemonstrativeConfig();
      return;
    }

    emotionalConfig = {
      modo_esgotamento: data.modo_esgotamento,
      mensagem_esgotamento: data.mensagem_esgotamento,
      max_atendimentos: data.max_atendimentos_diarios,
      max_perguntas: data.max_perguntas_diarias,
      min_interval: data.tempo_minimo_entre_clientes
    };

    fillConfigUI();
  } catch (e) {
    loadDemonstrativeConfig();
  }
}

async function fetchRealQuickResponses() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("respostas_rapidas")
      .select("*")
      .eq("cartomante_id", user?.id);

    if (!error && data && data.length > 0) {
      data.forEach(r => {
        if (quickResponses[r.chave]) {
          quickResponses[r.chave].conteudo = r.conteudo;
          quickResponses[r.chave].titulo = r.titulo;
        }
      });
    }
    renderQuickResponses();
  } catch (e) {
    renderQuickResponses();
  }
}

// Preenche elementos de interface
function fillConfigUI() {
  document.getElementById("cfgModoEsgotamento").checked = emotionalConfig.modo_esgotamento;
  document.getElementById("cfgMsgEsgotamento").value = emotionalConfig.mensagem_esgotamento;
  document.getElementById("cfgMaxAtendimentos").value = emotionalConfig.max_atendimentos;
  document.getElementById("cfgMaxPerguntas").value = emotionalConfig.max_perguntas;
  document.getElementById("cfgMinInterval").value = emotionalConfig.min_interval;

  toggleEsgotamentoVisual(emotionalConfig.modo_esgotamento);
  renderQuickResponses();
}

// Efeito visual no interruptor de esgotamento
function toggleEsgotamentoVisual(isActive) {
  const switchTrack = document.getElementById("switchTrack");
  const checkbox = document.getElementById("cfgModoEsgotamento");
  checkbox.checked = isActive;
  
  if (isActive) {
    switchTrack.style.backgroundColor = "rgba(224, 146, 75, 0.4)";
    switchTrack.style.borderColor = "var(--gold-color)";
    switchTrack.style.boxShadow = "0 0 10px rgba(224, 146, 75, 0.3)";
  } else {
    switchTrack.style.backgroundColor = "rgba(255, 255, 255, 0.08)";
    switchTrack.style.borderColor = "var(--card-border)";
    switchTrack.style.boxShadow = "none";
  }
  
  // Atualiza estado interno reativo de autocuidado
  emotionalConfig.modo_esgotamento = isActive;
  localStorage.setItem("cartomante_emotional_config", JSON.stringify(emotionalConfig));
}

// Renderiza a lista de respostas rápidas
function renderQuickResponses() {
  const container = document.getElementById("quickResponsesContainer");
  if (!container) return;

  container.innerHTML = "";

  for (const [chave, val] of Object.entries(quickResponses)) {
    const card = document.createElement("div");
    card.className = "service-public-card glass-panel";
    card.style.padding = "20px";
    card.style.height = "auto";
    card.style.border = "1px solid var(--card-border)";

    card.innerHTML = `
      <div style="font-size: 0.8rem; font-weight: 600; color: var(--gold-color); margin-bottom: 8px; font-family: var(--font-decorative);">
        <i class="fas fa-bolt" style="margin-right:5px; color:var(--public-primary);"></i> ${val.titulo}
      </div>
      <div class="mystic-form-group">
        <textarea id="resp-${chave}" class="response-textarea" rows="4" style="width:100%; border:1px solid rgba(255,255,255,0.05); font-size:0.78rem;">${val.conteudo}</textarea>
      </div>
      <button class="glass-button" style="width:100%; justify-content:center; font-size:0.7rem; border-color:var(--public-primary); margin-top:8px;" onclick="saveSingleResponse('${chave}')">
        <i class="fas fa-save"></i> Salvar Mensagem
      </button>
    `;

    container.appendChild(card);
  }
}

// Salva uma única resposta rápida
async function saveSingleResponse(chave) {
  const textVal = document.getElementById(`resp-${chave}`).value.trim();
  if (!textVal) return;

  quickResponses[chave].conteudo = textVal;

  const isConnected = await testSupabaseConnection();

  if (isConnected) {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Procura se já existe para fazer update ou insere
    const { data } = await supabase
      .from("respostas_rapidas")
      .select("id")
      .eq("cartomante_id", user.id)
      .eq("chave", chave)
      .single();

    if (data) {
      await supabase
        .from("respostas_rapidas")
        .update({ conteudo: textVal })
        .eq("id", data.id);
    } else {
      await supabase
        .from("respostas_rapidas")
        .insert([{
          cartomante_id: user.id,
          chave: chave,
          titulo: quickResponses[chave].titulo,
          conteudo: textVal
        }]);
    }
    alert(`✨ Mensagem de "${quickResponses[chave].titulo}" salva no banco de dados!`);
  } else {
    // Local
    localStorage.setItem("cartomante_quick_responses", JSON.stringify(quickResponses));
    alert(`✨ Mensagem de "${quickResponses[chave].titulo}" salva localmente.`);
  }
  
  renderQuickResponses();
}

// Grava toda a configuração emocional e de limites
async function saveEmotionalConfig(event) {
  event.preventDefault();

  const isEsgotamento = document.getElementById("cfgModoEsgotamento").checked;
  const msgEsgotamento = document.getElementById("cfgMsgEsgotamento").value.trim();
  const maxAtendimentos = parseInt(document.getElementById("cfgMaxAtendimentos").value);
  const maxPerguntas = parseInt(document.getElementById("cfgMaxPerguntas").value);
  const minInterval = parseInt(document.getElementById("cfgMinInterval").value);

  emotionalConfig = {
    modo_esgotamento: isEsgotamento,
    mensagem_esgotamento: msgEsgotamento,
    max_atendimentos: maxAtendimentos,
    max_perguntas: maxPerguntas,
    min_interval: minInterval
  };

  const isConnected = await testSupabaseConnection();

  if (isConnected) {
    const { data: { user } } = await supabase.auth.getUser();
    const configData = {
      modo_esgotamento: isEsgotamento,
      mensagem_esgotamento: msgEsgotamento,
      max_atendimentos_diarios: maxAtendimentos,
      max_perguntas_diarias: maxPerguntas,
      tempo_minimo_entre_clientes: minInterval
    };

    const { error } = await supabase
      .from("configuracoes_chat")
      .update(configData)
      .eq("cartomante_id", user.id);

    if (error) {
      console.error("Erro ao salvar configs no Supabase:", error);
      alert("❌ Ocorreu um erro ao sintonizar com o servidor, mas as alterações foram mantidas localmente.");
    } else {
      alert("🔮 Suas diretrizes emocionais foram sincronizadas em tempo real no banco de dados!");
    }
  } else {
    localStorage.setItem("cartomante_emotional_config", JSON.stringify(emotionalConfig));
    alert("🔮 Filtro de autocuidado e limites energéticos aplicados localmente com sucesso.");
  }

  fillConfigUI();
}
