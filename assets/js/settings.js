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
    await fetchActivityLogs();
  } else {
    loadDemonstrativeConfig();
    await fetchActivityLogs();
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

// Buscar respostas rápidas do Supabase
async function fetchRealQuickResponses() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      loadDemonstrativeConfig();
      return;
    }
    const { data, error } = await supabase
      .from("respostas_rapidas")
      .select("*")
      .eq("cartomante_id", user.id);

    if (!error && data) {
      if (data.length === 0) {
        // Se o banco está vazio para esta cartomante, semear os padrões
        const defaultRows = Object.entries(quickResponses).map(([chave, val]) => ({
          cartomante_id: user.id,
          chave: chave,
          titulo: val.titulo,
          conteudo: val.conteudo
        }));
        await supabase.from("respostas_rapidas").insert(defaultRows);
        
        // Recarregar
        const { data: dataNew } = await supabase
          .from("respostas_rapidas")
          .select("*")
          .eq("cartomante_id", user.id);
        
        if (dataNew) {
          quickResponses = {};
          dataNew.forEach(r => {
            quickResponses[r.chave] = {
              id: r.id,
              titulo: r.titulo,
              conteudo: r.conteudo
            };
          });
        }
      } else {
        quickResponses = {};
        data.forEach(r => {
          quickResponses[r.chave] = {
            id: r.id,
            titulo: r.titulo,
            conteudo: r.conteudo
          };
        });
      }
    }
    renderQuickResponses();
  } catch (e) {
    console.error("Erro ao carregar respostas rápidas reais:", e);
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
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <div style="font-size: 0.8rem; font-weight: 600; color: var(--gold-color); font-family: var(--font-decorative);">
          <i class="fas fa-bolt" style="margin-right:5px; color:var(--public-primary);"></i> ${val.titulo}
        </div>
        <span style="font-size: 0.65rem; color: var(--text-muted); background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px;">/${chave}</span>
      </div>
      <div class="mystic-form-group">
        <textarea id="resp-${chave}" class="response-textarea" rows="4" style="width:100%; border:1px solid rgba(255,255,255,0.05); font-size:0.78rem;">${val.conteudo}</textarea>
      </div>
      <div style="display: flex; gap: 10px; margin-top: 8px;">
        <button class="glass-button" style="flex: 1; justify-content:center; font-size:0.7rem; border-color:var(--public-primary);" onclick="saveSingleResponse('${chave}')">
          <i class="fas fa-save"></i> Salvar
        </button>
        <button class="glass-button" style="justify-content:center; font-size:0.7rem; border-color:#FF5F56; color:#FF5F56;" onclick="deleteResponse('${chave}')">
          <i class="fas fa-trash-alt"></i> Excluir
        </button>
      </div>
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
  const titulo = quickResponses[chave].titulo;

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
          titulo: titulo,
          conteudo: textVal
        }]);
    }
    alert(`✨ Mensagem de "${titulo}" salva no banco de dados!`);
  } else {
    // Local
    localStorage.setItem("cartomante_quick_responses", JSON.stringify(quickResponses));
    alert(`✨ Mensagem de "${titulo}" salva localmente.`);
  }
  
  // Registrar log
  await logSecurityAction("Edição de Template", `Template editado: ${titulo} (/${chave})`);
  
  renderQuickResponses();
}

// Cria novo template de resposta rápida
async function createNewResponse(e) {
  e.preventDefault();
  const chaveInput = document.getElementById("newRespChave");
  const tituloInput = document.getElementById("newRespTitulo");
  const conteudoInput = document.getElementById("newRespConteudo");

  const chave = chaveInput.value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  const titulo = tituloInput.value.trim();
  const conteudo = conteudoInput.value.trim();

  if (!chave || !titulo || !conteudo) return;

  if (quickResponses[chave]) {
    alert("⚠️ Já existe um template com este identificador!");
    return;
  }

  const isConnected = await testSupabaseConnection();

  if (isConnected) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("respostas_rapidas").insert([{
        cartomante_id: user.id,
        chave: chave,
        titulo: titulo,
        conteudo: conteudo
      }]);

      if (error) {
        console.error("Erro ao criar template no Supabase:", error);
        alert("❌ Erro ao salvar o template no banco.");
        return;
      }

      quickResponses[chave] = {
        titulo: titulo,
        conteudo: conteudo
      };
      alert(`✨ Template "${titulo}" cadastrado com sucesso!`);
    } catch (err) {
      console.error(err);
    }
  } else {
    quickResponses[chave] = {
      titulo: titulo,
      conteudo: conteudo
    };
    localStorage.setItem("cartomante_quick_responses", JSON.stringify(quickResponses));
    alert(`✨ Template "${titulo}" cadastrado localmente.`);
  }

  // Registrar log
  await logSecurityAction("Criação de Template", `Novo template cadastrado: ${titulo} (/${chave})`);

  // Limpar form
  chaveInput.value = "";
  tituloInput.value = "";
  conteudoInput.value = "";

  renderQuickResponses();
}

// Deleta template de resposta rápida
async function deleteResponse(chave) {
  if (!confirm(`Tem certeza que deseja excluir o template /${chave}?`)) return;

  const titulo = quickResponses[chave]?.titulo || chave;
  const isConnected = await testSupabaseConnection();

  if (isConnected) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("respostas_rapidas")
        .delete()
        .eq("cartomante_id", user.id)
        .eq("chave", chave);

      if (error) {
        console.error("Erro ao deletar do Supabase:", error);
        alert("❌ Erro ao deletar o template do banco de dados.");
        return;
      }

      delete quickResponses[chave];
      alert(`✨ Template "${titulo}" removido!`);
    } catch (err) {
      console.error(err);
    }
  } else {
    delete quickResponses[chave];
    localStorage.setItem("cartomante_quick_responses", JSON.stringify(quickResponses));
    alert(`✨ Template "${titulo}" removido localmente.`);
  }

  // Registrar log
  await logSecurityAction("Exclusão de Template", `Template removido: ${titulo} (/${chave})`);

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

  // Registrar log
  await logSecurityAction(
    "Alteração de Diretrizes Emocionais", 
    `Limites configurados: ${maxAtendimentos} atendimentos/dia, ${maxPerguntas} perguntas/dia, intervalo de ${minInterval} min. Modo esgotamento: ${isEsgotamento ? "Ativo" : "Inativo"}`
  );

  fillConfigUI();
}

// ==========================================================================
// REGISTRO DE ATIVIDADES & AUDITORIA
// ==========================================================================
async function logSecurityAction(action, details) {
  const isConnected = await testSupabaseConnection();
  if (isConnected) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("historico_acoes").insert([{
          cartomante_id: user.id,
          acao: action,
          detalhes: details
        }]);
        fetchActivityLogs();
      }
    } catch (e) {
      console.error("Erro ao registrar log de segurança no banco:", e);
    }
  } else {
    let localLogs = JSON.parse(localStorage.getItem("cartomante_local_logs") || "[]");
    localLogs.unshift({
      created_at: new Date().toISOString(),
      acao: action,
      detalhes: details
    });
    localStorage.setItem("cartomante_local_logs", JSON.stringify(localLogs));
    renderActivityLogs(localLogs);
  }
}

async function fetchActivityLogs() {
  const isConnected = await testSupabaseConnection();
  if (isConnected) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("historico_acoes")
        .select("*")
        .eq("cartomante_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        renderActivityLogs(data);
      } else {
        renderActivityLogs([]);
      }
    } catch (e) {
      renderActivityLogs([]);
    }
  } else {
    let localLogs = JSON.parse(localStorage.getItem("cartomante_local_logs") || "[]");
    renderActivityLogs(localLogs);
  }
}

function renderActivityLogs(logs) {
  const container = document.getElementById("activityLogContainer");
  if (!container) return;

  if (!logs || logs.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="3" style="text-align: center; padding: 20px; color: var(--text-muted);">Nenhuma atividade registrada no santuário.</td>
      </tr>
    `;
    return;
  }

  container.innerHTML = "";
  logs.forEach(log => {
    const tr = document.createElement("tr");
    const formattedDate = new Date(log.created_at).toLocaleString('pt-BR');
    tr.innerHTML = `
      <td style="white-space: nowrap; padding: 12px 14px;">${formattedDate}</td>
      <td style="padding: 12px 14px;"><strong style="color: var(--gold-color);">${log.acao}</strong></td>
      <td style="padding: 12px 14px; color: var(--text-secondary);">${log.detalhes || ""}</td>
    `;
    container.appendChild(tr);
  });
}
