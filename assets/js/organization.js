// organization.js – Motor do Organizador Pessoal (Anotações, Ideias e Rituais)
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
  console.warn("Supabase não disponível. Rodando Organizador em Modo Demonstrativo.");
}

// ==========================================================================
// ESTADO INTERNO DO ORGANIZADOR
// ==========================================================================
let currentOrgTab = "rotina"; // rotina | ideias | videos | pesquisas | inspiracoes | anotacoes
let userNotes = [];           // Lista de notas carregadas

// Notas Iniciais Místicas de Demonstração
const MOCK_INITIAL_NOTES = [
  {
    id: "note-1",
    titulo: "Prece de Abertura do Templo",
    conteudo: "Acender um incenso de sândalo. Respirar fundo três vezes focando no chakra cardíaco. Rezar: 'Que as forças sutis da sabedoria superior e dos guardiões da luz guiem minhas palavras e revelem caminhos de cura a quem me busca hoje.'",
    categoria: "ritual",
    tipo_aba: "rotina",
    favorito: true,
    created_at: new Date(Date.now() - 3600000 * 24 * 5).toISOString()
  },
  {
    id: "note-2",
    titulo: "Roteiro: Simbolismo da Roda da Fortuna",
    conteudo: "1. Introdução: A transitoriedade de tudo na vida. Ninguém fica no topo ou no fundo para sempre.\n2. O simbolismo da esfinge (estabilidade) vs os animais subindo e descendo.\n3. Dica prática: Como se alinhar ao fluxo das mudanças sem sofrimento. Chamar consulentes para tiragem nos comentários.",
    categoria: "video",
    tipo_aba: "videos",
    favorito: false,
    created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString()
  },
  {
    id: "note-3",
    titulo: "Ideias para Postagem de Lua Nova",
    conteudo: "Fazer um carrossel de 4 slides no Instagram:\n- Slide 1: A Lua Nova em Gêmeos e o poder das novas sintonias mentais.\n- Slide 2: Rituais rápidos de comunicação e intenção escrita.\n- Slide 3: Banho energético sugerido (Hortelã e Alecrim).\n- Slide 4: Chamada para marcar tiragem personalizada na agenda.",
    categoria: "postagem",
    tipo_aba: "ideias",
    favorito: true,
    created_at: new Date(Date.now() - 3600000 * 4).toISOString()
  },
  {
    id: "note-4",
    titulo: "Estudo: Mitologia das Runas de Odin",
    conteudo: "Revisar a jornada de Odin na Yggdrasil por 9 noites para receber as runas. Focar na runa Ansuz (mensagens divinas, inspiração) e Gebo (trocas energéticas equilibradas, presentes celestes) e sua equivalência no Tarô.",
    categoria: "estudo",
    tipo_aba: "pesquisas",
    favorito: false,
    created_at: new Date(Date.now() - 3600000 * 48).toISOString()
  },
  {
    id: "note-5",
    titulo: "Mensagem Inspiradora de Acolhimento",
    conteudo: "'Os ventos da mudança podem ser assustadores, mas eles são os mesmos que limpam a poeira e trazem novos tempos. Não tema a tempestade, ela prepara a terra para florescer.'",
    categoria: "outro",
    tipo_aba: "inspiracoes",
    favorito: false,
    created_at: new Date(Date.now() - 3600000 * 12).toISOString()
  }
];

// Mapeamento de Cores e Ícones de Categoria
const CATEGORY_MAP = {
  video: { icon: "fa-video", text: "Vídeo", color: "#6e5aab" },
  postagem: { icon: "fa-hashtag", text: "Postagem", color: "#e0924b" },
  ritual: { icon: "fa-wand-magic-sparkles", text: "Ritual", color: "#2ec4b6" },
  estudo: { icon: "fa-graduation-cap", text: "Estudo", color: "#3a86c8" },
  atendimento: { icon: "fa-user-heart", text: "Atendimento", color: "#9b5d73" },
  pessoal: { icon: "fa-heart", text: "Pessoal", color: "#e63946" },
  outro: { icon: "fa-feather", text: "Outro", color: "#a38ea6" }
};

// ==========================================================================
// INICIALIZAÇÃO DA PÁGINA
// ==========================================================================
document.addEventListener("DOMContentLoaded", async () => {
  const isConnected = await testSupabaseConnection();
  if (isConnected) {
    await fetchRealNotes();
  } else {
    loadDemonstrativeNotes();
  }
});

// Verifica se a conexão com o Supabase está respondendo
async function testSupabaseConnection() {
  if (!supabase || SUPABASE_URL.includes("YOUR_PROJECT_REF")) return false;
  try {
    const { data, error } = await supabase.from("anotacoes_pessoais").select("id").limit(1);
    return error ? false : true;
  } catch (e) {
    return false;
  }
}

// Carregar Anotações Demonstrativas
function loadDemonstrativeNotes() {
  const stored = localStorage.getItem("cartomante_notes");
  if (stored) {
    userNotes = JSON.parse(stored);
  } else {
    userNotes = MOCK_INITIAL_NOTES;
    localStorage.setItem("cartomante_notes", JSON.stringify(userNotes));
  }
  loadNotes();
}

// Carregar do Supabase
async function fetchRealNotes() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    loadDemonstrativeNotes();
    return;
  }

  const { data, error } = await supabase
    .from("anotacoes_pessoais")
    .select("*")
    .eq("cartomante_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao carregar anotações do Supabase:", error);
    loadDemonstrativeNotes();
    return;
  }

  userNotes = data;
  loadNotes();
}

// ==========================================================================
// RENDERIZAÇÃO E FILTROS DE ANOTAÇÕES
// ==========================================================================
function loadNotes() {
  const container = document.getElementById("notesGridContainer");
  if (!container) return;

  container.innerHTML = "";

  const filterCategory = document.getElementById("filterCategory").value;
  const onlyFavorites = document.getElementById("chkOnlyFavorites").checked;

  // Filtrar notas
  const filtered = userNotes.filter(n => {
    if (n.tipo_aba !== currentOrgTab) return false;
    if (filterCategory && n.categoria !== filterCategory) return false;
    if (onlyFavorites && !n.favorito) return false;
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="chat-empty-state" style="grid-column: 1/-1;">
        <i class="fas fa-feather" style="opacity: 0.5;"></i>
        <h3>Aba silenciosa no momento</h3>
        <p>Ainda não há registros cadastrados nesta categoria ou seção. Cultive uma nova anotação.</p>
      </div>
    `;
    return;
  }

  filtered.forEach(n => {
    const card = document.createElement("div");
    card.className = "service-public-card glass-panel";
    card.style.border = "1px solid var(--card-border)";
    card.style.padding = "20px";
    card.style.height = "auto";
    card.style.display = "flex";
    card.style.flexDirection = "column";
    card.style.justifyContent = "space-between";

    const cat = CATEGORY_MAP[n.categoria] || CATEGORY_MAP.outro;
    const dateFmt = new Date(n.created_at).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" });

    // Format content with newlines
    const contentHTML = n.conteudo.replace(/\n/g, "<br>");

    card.innerHTML = `
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <span style="font-size:0.65rem; padding:3px 8px; border-radius:12px; background:${cat.color}15; color:${cat.color}; border:1px solid ${cat.color}30; text-transform:uppercase; font-weight:600; display:flex; align-items:center; gap:5px;">
            <i class="fas ${cat.icon}"></i> ${cat.text}
          </span>
          <button type="button" style="background:none; border:none; cursor:pointer;" onclick="toggleNoteFavorite('${n.id}')">
            <i class="${n.favorito ? 'fas' : 'far'} fa-star" style="color:#ffcc00; font-size:0.95rem;"></i>
          </button>
        </div>
        <h3 class="service-title" style="margin-bottom:8px; font-size:1rem; color:var(--gold-color); border-bottom:1px dashed rgba(255,255,255,0.05); padding-bottom:5px;">${n.titulo}</h3>
        <p class="service-desc" style="font-size:0.8rem; line-height:1.6; color:var(--text-secondary); margin-bottom:20px; font-family:var(--font-classic); font-style:italic;">"${contentHTML}"</p>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.05); padding-top:12px; font-size:0.7rem; color:var(--text-muted);">
        <span><i class="far fa-calendar-alt"></i> ${dateFmt}</span>
        <div style="display:flex; gap:10px;">
          <button type="button" class="btn-trans-edit" onclick="editNote('${n.id}')" title="Editar anotação"><i class="fas fa-pencil"></i></button>
          <button type="button" class="btn-trans-del" onclick="deleteNote('${n.id}')" title="Apagar anotação"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

// Alternar abas do organizador
function switchOrgTab(tabId) {
  currentOrgTab = tabId;

  // Modificar classes dos botões
  const tabLinks = document.querySelectorAll(".tabs .tab-link");
  tabLinks.forEach(lnk => lnk.classList.remove("active"));
  
  // Acha botão e ativa
  const activeBtn = Array.from(tabLinks).find(lnk => lnk.innerHTML.toLowerCase().includes(tabId === 'rotina' ? 'rotina' : (tabId === 'ideias' ? 'ideias' : (tabId === 'videos' ? 'vídeo' : (tabId === 'pesquisas' ? 'estudo' : (tabId === 'inspiracoes' ? 'inspirações' : 'geral'))))));
  if (activeBtn) activeBtn.classList.add("active");

  loadNotes();
}

// ==========================================================================
// FORMULÁRIOS, EDIÇÃO E EXCLUSÃO
// ==========================================================================
function openNoteModal() {
  document.getElementById("frmNote").reset();
  document.getElementById("editNoteId").value = "";
  document.getElementById("modalNoteTitle").innerHTML = '<i class="fas fa-leaf"></i> Cultivar Registro';
  document.getElementById("selNoteTab").value = currentOrgTab;
  document.getElementById("noteModal").style.display = "flex";
}

function closeNoteModal() {
  document.getElementById("noteModal").style.display = "none";
}

// Submit da nota
async function handleNoteSubmit(event) {
  event.preventDefault();

  const noteId = document.getElementById("editNoteId").value;
  const title = document.getElementById("txtNoteTitle").value.trim();
  const content = document.getElementById("txtNoteContent").value.trim();
  const category = document.getElementById("selNoteCategory").value;
  const tab = document.getElementById("selNoteTab").value;
  const favorite = document.getElementById("chkNoteFavorite").checked;

  if (!title || !content) return;

  const isConnected = await testSupabaseConnection();

  if (isConnected) {
    const { data: { user } } = await supabase.auth.getUser();
    const noteData = {
      cartomante_id: user.id,
      titulo: title,
      conteudo: content,
      categoria: category,
      tipo_aba: tab,
      favorito: favorite
    };

    if (noteId) {
      // Editar existente
      const { error } = await supabase
        .from("anotacoes_pessoais")
        .update(noteData)
        .eq("id", noteId);
      if (error) console.error("Erro ao atualizar anotação:", error);
    } else {
      // Nova
      const { error } = await supabase
        .from("anotacoes_pessoais")
        .insert([noteData]);
      if (error) console.error("Erro ao criar anotação:", error);
    }
    await fetchRealNotes();
  } else {
    // Lógica local
    if (noteId) {
      const note = userNotes.find(n => n.id === noteId);
      if (note) {
        note.titulo = title;
        note.conteudo = content;
        note.categoria = category;
        note.tipo_aba = tab;
        note.favorito = favorite;
      }
    } else {
      userNotes.unshift({
        id: `note-local-${Date.now()}`,
        titulo: title,
        conteudo: content,
        categoria: category,
        tipo_aba: tab,
        favorito: favorite,
        created_at: new Date().toISOString()
      });
    }
    localStorage.setItem("cartomante_notes", JSON.stringify(userNotes));
    loadNotes();
  }

  closeNoteModal();
}

// Editar nota
function editNote(id) {
  const note = userNotes.find(n => n.id === id);
  if (!note) return;

  document.getElementById("editNoteId").value = note.id;
  document.getElementById("txtNoteTitle").value = note.titulo;
  document.getElementById("txtNoteContent").value = note.conteudo;
  document.getElementById("selNoteCategory").value = note.categoria;
  document.getElementById("selNoteTab").value = note.tipo_aba;
  document.getElementById("chkNoteFavorite").checked = note.favorito;

  document.getElementById("modalNoteTitle").innerHTML = '<i class="fas fa-edit"></i> Refinar Registro';
  document.getElementById("noteModal").style.display = "flex";
}

// Excluir nota
async function deleteNote(id) {
  const confirmDelete = confirm("Deseja apagar este registro espiritual permanentemente do seu templo?");
  if (!confirmDelete) return;

  const isConnected = await testSupabaseConnection();

  if (isConnected) {
    const { error } = await supabase
      .from("anotacoes_pessoais")
      .delete()
      .eq("id", id);
    if (error) console.error("Erro ao deletar anotação:", error);
    await fetchRealNotes();
  } else {
    userNotes = userNotes.filter(n => n.id !== id);
    localStorage.setItem("cartomante_notes", JSON.stringify(userNotes));
    loadNotes();
  }
}

// Alternar favorito na nota
async function toggleNoteFavorite(id) {
  const note = userNotes.find(n => n.id === id);
  if (!note) return;

  const newFav = !note.favorito;
  note.favorito = newFav;

  const isConnected = await testSupabaseConnection();

  if (isConnected) {
    const { error } = await supabase
      .from("anotacoes_pessoais")
      .update({ favorito: newFav })
      .eq("id", id);
    if (error) console.error("Erro ao favoritar anotação:", error);
    await fetchRealNotes();
  } else {
    localStorage.setItem("cartomante_notes", JSON.stringify(userNotes));
    loadNotes();
  }
}
