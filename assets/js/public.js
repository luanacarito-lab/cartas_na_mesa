// public.js – Lógica da Vitrine Pública, Mural Espiritual e Catálogo de Busca
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
  console.warn("Supabase não disponível. Rodando Portal Público em Modo Demonstrativo.");
}

// ==========================================================================
// ESTADO INTERNO DO PORTAL PÚBLICO
// ==========================================================================
let activeTab = "mural"; // Aba do perfil ativa
let muralPosts = [];     // Postagens do mural
let activeCartomante = null; // Cartomante ativa sendo visualizada

// Dados Mockados de Cartomantes da Rede (Para alimentar o catálogo de busca)
const MOCK_DIRECTORY_CARTOMANTES = [
  {
    id: "cartomante-luana",
    slug: "luana-carito",
    nome_completo: "Luana Carito",
    foto_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop",
    banner_url: "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?w=1200&auto=format&fit=crop",
    bio: "Sacerdotisa dos caminhos, sintonizando sua frequência com a luz do oráculo para revelar segredos da alma.",
    especialidades: ["tarô", "baralho cigano", "astrologia"],
    certificados: ["Mestre em Tarô Geral - ABRAT", "Oráculo e Alinhamento Lunar"],
    redes: { instagram: "@luanacarito.oraculo", email: "contato@luanatarot.com" },
    idiomas: ["português", "espanhol"],
    modalidade: "ambos",
    preco_inicial: 90.00,
    cor_primaria: "#C7A27A",
    cor_secundaria: "#6E5AAB"
  },
  {
    id: "cartomante-sara",
    slug: "sara-cigana",
    nome_completo: "Sara de Astera",
    foto_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop",
    banner_url: "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=1200&auto=format&fit=crop",
    bio: "Especialista em oráculos de cristais e tarô cigano ancestral. Acolhimento, empatia e clareza para seus caminhos.",
    especialidades: ["baralho cigano", "runas"],
    certificados: ["Cromoterapia Sagrada", "Formação Cigana de Tradição"],
    redes: { instagram: "@sara.cigana", email: "sara@oraculo.com" },
    idiomas: ["português"],
    modalidade: "online",
    preco_inicial: 80.00,
    cor_primaria: "#E0924B",
    cor_secundaria: "#9B5D73"
  },
  {
    id: "cartomante-celeste",
    slug: "celeste-astral",
    nome_completo: "Mãe Celeste",
    foto_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop",
    banner_url: "https://images.unsplash.com/photo-1475274047050-1d0c0975c63e?w=1200&auto=format&fit=crop",
    bio: "Consultor(a) com mais de 25 anos de dedicação espiritual no jogo de búzios e astrologia lunar.",
    especialidades: ["astrologia", "runas"],
    certificados: ["Mestre em Astrologia Tradicional", "Ritualística e Conexão de Guias"],
    redes: { instagram: "@mae.celeste", email: "celeste@templo.com" },
    idiomas: ["português", "inglês"],
    modalidade: "presencial",
    preco_inicial: 150.00,
    cor_primaria: "#2EC4B6",
    cor_secundaria: "#6E5AAB"
  }
];

// Serviços Públicos Iniciais
const MOCK_SERVICES = [
  { id: "s-1", titulo: "Tiragem Cigana de Caminhos", preco: 90.00, duracao_minutos: 45, prazo_dias: 1, descricao: "Ideal para obter clareza em questões imediatas do cotidiano, analisando as energias presentes e as influências espirituais mais próximas." },
  { id: "s-2", titulo: "Leitura de Tarô Terapêutico Estelar", preco: 150.00, duracao_minutos: 60, prazo_dias: 2, descricao: "Foco profundo na psicologia espiritual. Mapeia bloqueios kármicos, padrões de relacionamento e aconselhamentos para cura emocional." },
  { id: "s-3", titulo: "Mandala Astrológica de Aniversário", preco: 180.00, duracao_minutos: 90, prazo_dias: 3, descricao: "Tiragem cósmica completa analisando as 12 casas astrológicas. Excelente para previsões anuais, finanças, carreira e amor." }
];

// Postagens Iniciais do Mural
const MOCK_MURAL_POSTS = [
  {
    id: "p-1",
    titulo: "Oráculo da Lua Cheia em Escorpião",
    conteudo: "A energia da Lua Cheia de hoje convida à transmutação de todas as mágoas ocultas. Escorpião nos ensina a morrer para o velho eu para renascermos mais sábias, fortes e prontas para receber o fluxo de abundância. Reserve um tempo para acender uma vela violeta e liberar o que já não serve na sua jornada de alma.",
    imagem_url: "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=600&auto=format&fit=crop",
    created_at: new Date(Date.now() - 3600000 * 5).toISOString()
  },
  {
    id: "p-2",
    titulo: "Sintonia Diária – Fé no Invisível",
    conteudo: "Nem tudo o que está sendo construído para você está visível aos seus olhos materiais neste instante. As sementes plantadas no plano sutil levam tempo para brotar na matéria. Confie no ritmo do universo, respire fundo e mantenha o coração em paz hoje.",
    imagem_url: null,
    created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString()
  }
];

// Agenda Simulada Segura
const MOCK_AGENDA_SLOTS = {
  "Seg": [{ hora: "09:00", status: "reserved" }, { hora: "10:30", status: "available" }, { hora: "14:00", status: "reserved" }, { hora: "15:30", status: "available" }],
  "Ter": [{ hora: "09:00", status: "available" }, { hora: "10:30", status: "reserved" }, { hora: "14:00", status: "available" }, { hora: "15:30", status: "reserved" }],
  "Qua": [{ hora: "09:00", status: "reserved" }, { hora: "10:30", status: "reserved" }, { hora: "14:00", status: "available" }, { hora: "15:30", status: "available" }],
  "Qui": [{ hora: "09:00", status: "available" }, { hora: "10:30", status: "available" }, { hora: "14:00", status: "reserved" }, { hora: "15:30", status: "available" }],
  "Sex": [{ hora: "09:00", status: "reserved" }, { hora: "10:30", status: "available" }, { hora: "14:00", status: "available" }, { hora: "15:30", status: "reserved" }],
  "Sáb": [{ hora: "10:00", status: "available" }, { hora: "11:30", status: "available" }, { hora: "14:00", status: "reserved" }, { hora: "15:00", status: "reserved" }],
  "Dom": [{ hora: "10:00", status: "available" }, { hora: "11:30", status: "reserved" }]
};

// ==========================================================================
// INICIALIZAÇÃO DA PÁGINA
// ==========================================================================
document.addEventListener("DOMContentLoaded", async () => {
  const isSearchPage = document.getElementById("searchGridContainer") !== null;
  const isProfilePage = document.getElementById("muralFeedContainer") !== null;

  const isConnected = await testSupabaseConnection();

  if (isSearchPage) {
    if (isConnected) {
      await fetchRealSearchDirectory();
    } else {
      loadDemonstrativeSearchDirectory();
    }
    initializeViewMode();
  } else if (isProfilePage) {
    // Carregar perfil ativo selecionado via parâmetro slug na URL
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get("slug") || "luana-carito";
    
    if (isConnected) {
      await loadRealProfile(slug);
    } else {
      loadDemonstrativeProfile(slug);
    }
    initializeViewMode();
  }
});

// Alterna a interface de forma linear e limpa entre Modo Admin e Modo Consulente
function initializeViewMode() {
  const urlParams = new URLSearchParams(window.location.search);
  const isAdmin = urlParams.get("admin") === "true";
  
  const sidebar = document.querySelector(".sidebar");
  const mainContent = document.querySelector(".main-content");
  const customizerBar = document.getElementById("profileCustomizerBar");
  const createPostCard = document.getElementById("createPostCard");
  
  if (isAdmin) {
    // Modo Admin: Exibe controles e a barra de menu interno
    if (sidebar) sidebar.style.display = "flex";
    if (mainContent) mainContent.style.marginLeft = "250px";
    if (customizerBar) customizerBar.style.display = "flex";
    if (createPostCard) createPostCard.style.display = "block";
    
    // Adiciona botão para Visualizar como Consulente
    const profileNameEl = document.getElementById("lblProfileName");
    if (profileNameEl && !document.getElementById("btnViewAsClient")) {
      const viewAsClientBtn = document.createElement("a");
      viewAsClientBtn.id = "btnViewAsClient";
      viewAsClientBtn.href = window.location.pathname + "?slug=" + (activeCartomante?.slug || "luana-carito");
      viewAsClientBtn.className = "glass-button";
      viewAsClientBtn.style.fontSize = "0.72rem";
      viewAsClientBtn.style.marginLeft = "15px";
      viewAsClientBtn.style.padding = "4px 10px";
      viewAsClientBtn.style.borderColor = "var(--public-primary)";
      viewAsClientBtn.innerHTML = '<i class="fas fa-eye"></i> Visualizar como Consulente';
      profileNameEl.appendChild(viewAsClientBtn);
    }
  } else {
    // Modo Consulente: Oculta o menu interno e as ferramentas administrativas
    if (sidebar) sidebar.style.display = "none";
    if (mainContent) {
      mainContent.style.marginLeft = "0";
      mainContent.style.maxWidth = "1100px";
      mainContent.style.margin = "0 auto";
      mainContent.style.padding = "20px";
    }
    if (customizerBar) customizerBar.style.display = "none";
    if (createPostCard) createPostCard.style.display = "none";
    
    // Adiciona uma elegante barra pública de navegação no topo da vitrine
    const mainCol = document.querySelector(".main-content") || document.querySelector("main");
    if (mainCol && !document.getElementById("publicTopBar")) {
      const topBar = document.createElement("div");
      topBar.id = "publicTopBar";
      topBar.className = "glass-panel";
      topBar.style.display = "flex";
      topBar.style.justifyContent = "space-between";
      topBar.style.alignItems = "center";
      topBar.style.padding = "12px 25px";
      topBar.style.marginBottom = "25px";
      topBar.style.borderRadius = "15px";
      topBar.style.border = "1px solid var(--card-border)";
      
      const slug = urlParams.get("slug") || "luana-carito";
      
      topBar.innerHTML = `
        <div style="font-family: var(--font-decorative); color: var(--public-primary); font-size: 0.95rem; font-weight: 700;">
          🌙 Templo Virtual
        </div>
        <div style="display: flex; gap: 15px; align-items: center;">
          <a href="search_cartomantes.html" style="color: var(--text-secondary); text-decoration: none; font-size: 0.8rem; display: flex; align-items: center; gap: 6px; transition: color var(--transition-fast);">
            <i class="fas fa-search"></i> Buscar Templos
          </a>
          <a href="public_profile.html?slug=${slug}&admin=true" style="color: var(--text-secondary); text-decoration: none; font-size: 0.8rem; display: flex; align-items: center; gap: 6px; transition: color var(--transition-fast);">
            <i class="fas fa-cog"></i> Acesso Administrativo
          </a>
          <a href="index.html" style="color: var(--public-primary); border: 1px solid var(--public-primary); border-radius: 8px; padding: 4px 10px; text-decoration: none; font-size: 0.78rem; display: flex; align-items: center; gap: 6px; background: rgba(199, 162, 122, 0.05); transition: all var(--transition-fast);">
            <i class="fas fa-home"></i> Painel Geral
          </a>
        </div>
      `;
      mainCol.insertBefore(topBar, mainCol.firstChild);
    }
  }
}

// Verifica se a conexão com o Supabase está respondendo
async function testSupabaseConnection() {
  if (!supabase || SUPABASE_URL.includes("YOUR_PROJECT_REF")) return false;
  try {
    const { data, error } = await supabase.from("perfis_publicos").select("slug").limit(1);
    return error ? false : true;
  } catch (e) {
    return false;
  }
}

// ==========================================================================
// MÓDULO 1: PORTAL DE BUSCA PÚBLICA (FILTROS DE CARTOMANTES)
// ==========================================================================
let activeSearchList = [];

function loadDemonstrativeSearchDirectory() {
  activeSearchList = MOCK_DIRECTORY_CARTOMANTES;
  renderSearchCards();
}

async function fetchRealSearchDirectory() {
  const { data, error } = await supabase
    .from("perfis_publicos")
    .select("*")
    .eq("publicado", true);

  if (error) {
    console.error("Erro ao carregar diretório do Supabase:", error);
    loadDemonstrativeSearchDirectory();
    return;
  }

  activeSearchList = data.map(p => ({
    id: p.cartomante_id,
    slug: p.slug,
    nome_completo: p.nome_completo || "Cartomante",
    foto_url: p.foto_url,
    banner_url: p.banner_url,
    bio: p.bio,
    especialidades: p.especialidades,
    certificados: p.certificados,
    idiomas: p.idiomas,
    modalidade: p.modalidade,
    preco_inicial: 90.00, // Preço genérico de entrada
    cor_primaria: p.cor_primaria,
    cor_secundaria: p.cor_secundaria
  }));

  renderSearchCards();
}

// Renderiza a lista de cards na busca
function renderSearchCards() {
  const container = document.getElementById("searchGridContainer");
  if (!container) return;

  container.innerHTML = "";

  if (activeSearchList.length === 0) {
    container.innerHTML = `
      <div class="chat-empty-state">
        <i class="fas fa-ghost"></i>
        <h3>Nenhuma cartomante sintonizada</h3>
        <p>Ajuste os filtros espirituais e tente novamente uma busca mais aberta.</p>
      </div>
    `;
    return;
  }

  activeSearchList.forEach(c => {
    const card = document.createElement("div");
    card.className = "cartomante-showcase-card glass-panel";

    const avatar = c.foto_url || "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=150&auto=format&fit=crop";
    const specsHTML = c.especialidades.map(sp => `<span class="specialty-badge">${sp.toUpperCase()}</span>`).join(" ");

    card.innerHTML = `
      <div class="showcase-header">
        <img src="${avatar}" alt="${c.nome_completo}" class="showcase-avatar" />
        <div class="showcase-title">
          <h3>${c.nome_completo}</h3>
          <p><i class="fas fa-compass"></i> Atendimento ${c.modalidade.toUpperCase()}</p>
        </div>
      </div>
      
      <div class="showcase-bio">
        "${c.bio}"
      </div>
      
      <div class="specialty-tag-list" style="margin-bottom:15px;">
        ${specsHTML}
      </div>

      <div class="mock-rating-stars">
        <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star-half-alt"></i>
        <span class="mock-rating-text">4.9</span>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; border-top: 1px solid rgba(255,255,255,0.05); padding-top:12px; margin-top: auto;">
        <div>
          <span style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase;">Consulta</span>
          <div style="font-weight:700; color:var(--text-primary); font-size:0.95rem;">A partir de R$ ${c.preco_inicial.toFixed(2)}</div>
        </div>
        <a href="public_profile.html?slug=${c.slug}" class="glass-button" style="border-color:${c.cor_primaria || 'var(--public-primary)'}; font-size:0.75rem;">
          <i class="fas fa-magic"></i> Visitar Templo
        </a>
      </div>
    `;

    container.appendChild(card);
  });
}

// Filtra a lista de busca conforme os formulários
function triggerSearchFilter() {
  const query = document.getElementById("txtSearchName").value.toLowerCase();
  const spec = document.getElementById("selSearchSpecialty").value.toLowerCase();
  const modal = document.getElementById("selSearchModal").value;
  const lang = document.getElementById("selSearchLang").value.toLowerCase();
  const maxPrice = parseFloat(document.getElementById("rngSearchPrice").value);

  const baseList = testSupabaseConnection() ? activeSearchList : MOCK_DIRECTORY_CARTOMANTES;

  activeSearchList = baseList.filter(c => {
    if (query && !c.nome_completo.toLowerCase().includes(query)) return false;
    if (spec && !c.especialidades.includes(spec)) return false;
    if (modal && c.modalidade !== modal && c.modalidade !== "ambos") return false;
    if (lang && !c.idiomas.includes(lang)) return false;
    if (maxPrice && c.preco_inicial > maxPrice) return false;
    return true;
  });

  renderSearchCards();
}

function updatePriceLabel(val) {
  document.getElementById("lblMaxPrice").innerText = `R$ ${val}`;
}

function resetSearchFilters() {
  document.getElementById("frmSearchFilters").reset();
  updatePriceLabel(250);
  
  if (testSupabaseConnection()) {
    fetchRealSearchDirectory();
  } else {
    loadDemonstrativeSearchDirectory();
  }
}

// ==========================================================================
// MÓDULO 2: VITRINE E PERFIL DA CARTOMANTE (PUBLIC_PROFILE)
// ==========================================================================

function loadDemonstrativeProfile(slug) {
  // Encontra cartomante mock correspondente
  activeCartomante = MOCK_DIRECTORY_CARTOMANTES.find(c => c.slug === slug) || MOCK_DIRECTORY_CARTOMANTES[0];
  
  // Aplicar cores customizadas dinâmicas no CSS Root
  applyCustomCSSAura(activeCartomante.cor_primaria, activeCartomante.cor_secundaria);

  // Injetar Bio e Nomes
  document.getElementById("lblProfileName").innerHTML = `${activeCartomante.nome_completo} <span class="profile-badge-online"><i class="fas fa-bolt"></i> Sintonizada</span>`;
  document.getElementById("lblProfileBio").innerText = `"${activeCartomante.bio}"`;
  document.getElementById("profileAvatar").src = activeCartomante.foto_url;
  document.getElementById("bannerImg").src = activeCartomante.banner_url;

  // Injetar Especialidades, Certificados e Redes
  document.getElementById("lblSpecialties").innerHTML = activeCartomante.especialidades.map(sp => `<span class="specialty-badge">${sp.toUpperCase()}</span>`).join(" ");
  document.getElementById("lblCertificates").innerHTML = activeCartomante.certificados.map(c => `<li>📜 ${c}</li>`).join("");
  document.getElementById("lblSocials").innerHTML = `
    <a href="#" class="social-link-item"><i class="fab fa-instagram"></i> ${activeCartomante.redes.instagram}</a>
    <a href="#" class="social-link-item"><i class="fab fa-whatsapp"></i> WhatsApp Reservas</a>
    <a href="#" class="social-link-item"><i class="fas fa-envelope"></i> ${activeCartomante.redes.email}</a>
  `;

  // Carregar mural de posts demonstrativo
  const savedPosts = localStorage.getItem(`cartomante_posts_${activeCartomante.id}`);
  if (savedPosts) {
    muralPosts = JSON.parse(savedPosts);
  } else {
    muralPosts = MOCK_MURAL_POSTS;
    localStorage.setItem(`cartomante_posts_${activeCartomante.id}`, JSON.stringify(muralPosts));
  }

  renderMuralFeed();
  renderServices();
  renderPublicCalendar();
}

async function loadRealProfile(slug) {
  // Carrega do Supabase
  const { data, error } = await supabase
    .from("perfis_publicos")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    console.error("Erro ao carregar perfil real:", error);
    loadDemonstrativeProfile(slug);
    return;
  }

  activeCartomante = {
    id: data.cartomante_id,
    slug: data.slug,
    nome_completo: data.nome_completo || "Cartomante",
    foto_url: data.foto_url,
    banner_url: data.banner_url,
    bio: data.bio,
    especialidades: data.especialidades,
    certificados: data.certificados,
    redes: data.redes_sociais || {},
    idiomas: data.idiomas,
    modalidade: data.modalidade,
    preco_inicial: 90.00,
    cor_primaria: data.cor_primaria || "#C7A27A",
    cor_secundaria: data.cor_secundaria || "#6E5AAB"
  };

  applyCustomCSSAura(activeCartomante.cor_primaria, activeCartomante.cor_secundaria);

  // Preencher UI
  document.getElementById("lblProfileName").innerHTML = `${activeCartomante.nome_completo} <span class="profile-badge-online"><i class="fas fa-bolt"></i> Sintonizada</span>`;
  document.getElementById("lblProfileBio").innerText = `"${activeCartomante.bio}"`;
  if (activeCartomante.foto_url) document.getElementById("profileAvatar").src = activeCartomante.foto_url;
  if (activeCartomante.banner_url) document.getElementById("bannerImg").src = activeCartomante.banner_url;

  document.getElementById("lblSpecialties").innerHTML = activeCartomante.especialidades.map(sp => `<span class="specialty-badge">${sp.toUpperCase()}</span>`).join(" ");
  document.getElementById("lblCertificates").innerHTML = activeCartomante.certificados.map(c => `<li>📜 ${c}</li>`).join("");
  document.getElementById("lblSocials").innerHTML = `
    <a href="#" class="social-link-item"><i class="fab fa-instagram"></i> ${activeCartomante.redes.instagram || '@cartomante'}</a>
    <a href="#" class="social-link-item"><i class="fab fa-whatsapp"></i> WhatsApp Reservas</a>
    <a href="#" class="social-link-item"><i class="fas fa-envelope"></i> ${activeCartomante.redes.email || 'contato@cartomante.com'}</a>
  `;

  // Carregar posts e serviços do banco de dados
  await fetchRealMuralPosts();
  await fetchRealServices();
  renderPublicCalendar(); // O calendário sempre computa com segurança slots disponíveis
}

async function fetchRealMuralPosts() {
  const { data, error } = await supabase
    .from("mural_postagens")
    .select("*")
    .eq("cartomante_id", activeCartomante.id)
    .eq("visibilidade", "publico")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar mural do Supabase:", error);
    return;
  }
  muralPosts = data;
  renderMuralFeed();
}

async function fetchRealServices() {
  const { data, error } = await supabase
    .from("servicos_publicos")
    .select("*")
    .eq("cartomante_id", activeCartomante.id)
    .eq("ativo", true);

  if (error) {
    console.error("Erro ao buscar serviços públicos:", error);
    return;
  }
  
  const container = document.getElementById("servicesGridContainer");
  if (!container) return;

  container.innerHTML = "";

  if (data.length === 0) {
    container.innerHTML = `
      <div class="chat-empty-state" style="grid-column: 1/-1;">
        <i class="fas fa-concierge-bell"></i>
        <p>Ainda não há serviços ritualísticos listados para este perfil.</p>
      </div>
    `;
    return;
  }

  data.forEach(s => {
    const card = document.createElement("div");
    card.className = "service-public-card glass-panel";
    
    card.innerHTML = `
      <div>
        <h3 class="service-title">${s.titulo}</h3>
        <div class="service-price">${Number(s.preco).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div>
        <p class="service-desc">${s.descricao}</p>
      </div>
      <div>
        <div class="service-meta-row">
          <span><i class="fas fa-clock"></i> Duração: ${s.duracao_minutos} min</span>
          <span><i class="fas fa-hourglass-half"></i> Prazo: ${s.prazo_dias} dia(s)</span>
        </div>
        <button class="glass-button" style="width:100%; justify-content:center; border-color:var(--public-primary);" onclick="hirePublicService('${s.titulo}', ${s.preco})">
          <i class="fas fa-hand-holding-sparkles"></i> Contratar Revelação
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

// ==========================================================================
// ABA DE MURAL (RENDERIZAÇÃO E POSTS RÁPIDOS)
// ==========================================================================
function renderMuralFeed() {
  const container = document.getElementById("muralFeedContainer");
  if (!container) return;

  container.innerHTML = "";

  if (muralPosts.length === 0) {
    container.innerHTML = `
      <div class="chat-empty-state">
        <i class="fas fa-comment-slash"></i>
        <p>O mural está silencioso no momento. Volte em breve para novas colheitas espirituais.</p>
      </div>
    `;
    return;
  }

  muralPosts.forEach(post => {
    const card = document.createElement("div");
    card.className = "mural-post-item glass-panel";

    const dateFmt = new Date(post.created_at).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
    const hasImage = post.imagem_url;

    card.innerHTML = `
      <div class="post-header">
        <h3 class="post-title">${post.titulo}</h3>
        <span class="post-date">${dateFmt}</span>
      </div>
      
      <p class="post-body">${post.conteudo}</p>
      
      ${hasImage ? `<img src="${post.imagem_url}" alt="Ilustração oráculo" class="post-image-attachment" />` : ''}

      <div class="post-footer">
        <span onclick="simulateLike(this)"><i class="far fa-heart"></i> Transmitir Amor (0)</span>
        <span><i class="far fa-comment"></i> Comentar</span>
      </div>
    `;

    container.appendChild(card);
  });
}

// Cria novo post pelo formulário
async function handlePostSubmit(event) {
  event.preventDefault();

  const title = document.getElementById("postTitle").value.trim();
  const content = document.getElementById("postContent").value.trim();
  const image = document.getElementById("postImage").value.trim();

  if (!title || !content) return;

  const isConnected = await testSupabaseConnection();

  const postData = {
    cartomante_id: isConnected ? (await getCartomanteId()) : activeCartomante.id,
    titulo: title,
    conteudo: content,
    imagem_url: image || null,
    visibilidade: "publico",
    created_at: new Date().toISOString()
  };

  if (isConnected) {
    const { error } = await supabase.from("mural_postagens").insert([postData]);
    if (error) {
      console.error("Erro ao postar no mural real:", error);
      return;
    }
    await fetchRealMuralPosts();
  } else {
    // Lógica local
    muralPosts.unshift({
      id: `post-local-${Date.now()}`,
      ...postData
    });
    localStorage.setItem(`cartomante_posts_${activeCartomante.id}`, JSON.stringify(muralPosts));
    renderMuralFeed();
  }

  // Reset
  document.getElementById("postTitle").value = "";
  document.getElementById("postContent").value = "";
  document.getElementById("postImage").value = "";
}

async function getCartomanteId() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
  } catch (e) {
    return null;
  }
}

function simulateLike(spanEl) {
  const heart = spanEl.querySelector("i");
  if (heart.classList.contains("far")) {
    heart.className = "fas fa-heart";
    heart.style.color = "#e63946";
    spanEl.innerHTML = `<i class="fas fa-heart" style="color:#e63946;"></i> Amor Transmitido (1)`;
  } else {
    heart.className = "far fa-heart";
    heart.style.color = "inherit";
    spanEl.innerHTML = `<i class="far fa-heart"></i> Transmitir Amor (0)`;
  }
}

// ==========================================================================
// ABA DE SERVIÇOS OFERTADOS (DEMONSTRATIVO)
// ==========================================================================
function renderServices() {
  const container = document.getElementById("servicesGridContainer");
  if (!container || testSupabaseConnection()) return; // Se conectado, carregado via API

  container.innerHTML = "";

  MOCK_SERVICES.forEach(s => {
    const card = document.createElement("div");
    card.className = "service-public-card glass-panel";

    card.innerHTML = `
      <div>
        <h3 class="service-title">${s.titulo}</h3>
        <div class="service-price">${s.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div>
        <p class="service-desc">${s.descricao}</p>
      </div>
      <div>
        <div class="service-meta-row">
          <span><i class="fas fa-clock"></i> Duração: ${s.duracao_minutos} min</span>
          <span><i class="fas fa-hourglass-half"></i> Entrega: ${s.prazo_dias} dia(s)</span>
        </div>
        <button class="glass-button" style="width:100%; justify-content:center; border-color:var(--public-primary);" onclick="hirePublicService('${s.titulo}', ${s.preco})">
          <i class="fas fa-hand-holding-sparkles"></i> Contratar Revelação
        </button>
      </div>
    `;

    container.appendChild(card);
  });
}

// Simula a contratação de um serviço e integração financeira automática
function hirePublicService(title, price) {
  const confirmHire = confirm(`Deseja contratar o serviço "${title}" por R$ ${price.toFixed(2)}?`);
  if (!confirmHire) return;

  // INTEGRAÇÃO FINANCEIRA AUTOMÁTICA
  const localFinances = localStorage.getItem("cartomante_finances_db");
  const finances = localFinances ? JSON.parse(localFinances) : [];
  
  finances.push({
    id: `tx-hire-${Date.now()}`,
    cliente_id: "c1-uuid-helena",
    cliente_nome: "Helena de Souza", // assume helena como mock principal
    tipo: "entrada",
    categoria: "servico",
    valor: price,
    status: "pago", // contratado já gera faturamento pago/pendente
    origem: "automatico",
    descricao: `Contratação: ${title}`,
    data_registro: new Date().toISOString()
  });

  localStorage.setItem("cartomante_finances_db", JSON.stringify(finances));

  alert(`✨ O serviço "${title}" foi contratado com sucesso! A cartomante foi notificada e o lançamento financeiro automático de ${price.toLocaleString("pt-BR", {style:"currency", currency:"BRL"})} foi registrado.`);
}

// ==========================================================================
// ABA DE AGENDA PÚBLICA (CALENDÁRIO SEGURO)
// ==========================================================================
function renderPublicCalendar() {
  const container = document.getElementById("publicCalendarContainer");
  if (!container) return;

  container.innerHTML = "";

  // Carregar configurações emocionais do LocalStorage (Prompt 11)
  const storedConfig = localStorage.getItem("cartomante_emotional_config");
  let emotionalConfig = { modo_esgotamento: false, mensagem_esgotamento: "" };
  if (storedConfig) {
    try {
      emotionalConfig = JSON.parse(storedConfig);
    } catch (e) {
      console.warn("Erro ao ler cartomante_emotional_config:", e);
    }
  }

  // Gerenciar o banner de esgotamento na aba de agenda pública
  const existingBanner = document.getElementById("publicEsgotamentoBanner");
  if (existingBanner) {
    existingBanner.remove();
  }

  const tabAgenda = document.getElementById("tab-profile-agenda");
  if (tabAgenda && emotionalConfig.modo_esgotamento) {
    const banner = document.createElement("div");
    banner.id = "publicEsgotamentoBanner";
    banner.style.background = "rgba(224, 146, 75, 0.15)";
    banner.style.border = "1px solid rgba(224, 146, 75, 0.3)";
    banner.style.color = "var(--gold-light)";
    banner.style.padding = "10px 15px";
    banner.style.borderRadius = "8px";
    banner.style.fontSize = "0.78rem";
    banner.style.marginBottom = "15px";
    banner.style.display = "flex";
    banner.style.alignItems = "center";
    banner.style.gap = "8px";
    banner.innerHTML = `
      <i class="fas fa-shield-heart" style="color: #e0924b; font-size: 0.9rem;"></i>
      <div>
        <strong>Templo em Ritmo Reduzido:</strong> ${emotionalConfig.mensagem_esgotamento || "Atendimentos funcionando em capacidade limitada para descanso da cartomante."}
      </div>
    `;
    tabAgenda.insertBefore(banner, tabAgenda.firstChild);
  }

  for (const [dia, slots] of Object.entries(MOCK_AGENDA_SLOTS)) {
    const col = document.createElement("div");
    col.className = "calendar-day-column";

    let slotsHTML = "";
    let slotIndex = 0;
    slots.forEach(sl => {
      let isReserved = sl.status === "reserved";

      // Se o Modo Esgotamento estiver ativo, 50% dos horários livres são bloqueados/reservados automaticamente
      if (emotionalConfig.modo_esgotamento) {
        if (slotIndex % 2 === 0) {
          isReserved = true;
        }
      }
      slotIndex++;

      const lblText = isReserved ? "Reservado" : sl.hora;
      const extraClass = isReserved ? "reserved" : "available";
      const action = isReserved ? "" : `onclick="bookPublicSlot('${dia}', '${sl.hora}')"`;

      slotsHTML += `
        <button class="calendar-slot-btn ${extraClass}" ${action} title="${isReserved ? 'Horário ocupado por consulta privada ou indisponível' : 'Disponível para agendamento'}">
          ${lblText}
        </button>
      `;
    });

    col.innerHTML = `
      <div class="calendar-day-header">${dia}</div>
      ${slotsHTML}
    `;

    container.appendChild(col);
  }
}

// Simula agendamento público seguro
function bookPublicSlot(dia, hora) {
  const confirmBook = confirm(`Deseja reservar o horário das ${hora} na ${dia}?`);
  if (!confirmBook) return;

  // Modifica status na agenda local
  const slots = MOCK_AGENDA_SLOTS[dia];
  const sl = slots.find(s => s.hora === hora);
  if (sl) {
    sl.status = "reserved";
  }

  // INTEGRAÇÃO FINANCEIRA AUTOMÁTICA (Ao agendar gera receita de atendimento)
  const localFinances = localStorage.getItem("cartomante_finances_db");
  const finances = localFinances ? JSON.parse(localFinances) : [];
  
  finances.push({
    id: `tx-agenda-${Date.now()}`,
    cliente_id: "c1-uuid-helena",
    cliente_nome: "Helena de Souza",
    tipo: "entrada",
    categoria: "atendimento",
    valor: 150.00, // Preço padrão da consulta
    status: "pendente",
    origem: "automatico",
    descricao: `Agendamento Público: ${dia} às ${hora}`,
    data_registro: new Date().toISOString()
  });

  localStorage.setItem("cartomante_finances_db", JSON.stringify(finances));

  renderPublicCalendar();
  alert(`🌟 Agendamento seguro das ${hora} realizado! Os detalhes internos da consulta foram guardados, nenhuma informação de cliente foi exposta e uma entrada financeira pendente de R$ 150,00 foi lançada.`);
}

// ==========================================================================
// ABA DE NAVEGAÇÃO INTERNA DO PERFIL PÚBLICO
// ==========================================================================
function switchProfileTab(tabId) {
  activeTab = tabId;

  // Ocultar todos os painéis
  document.getElementById("tab-profile-mural").style.display = "none";
  document.getElementById("tab-profile-servicos").style.display = "none";
  document.getElementById("tab-profile-agenda").style.display = "none";
  document.getElementById("tab-profile-avaliacoes").style.display = "none";

  // Mostrar ativo
  document.getElementById(`tab-profile-${tabId}`).style.display = "block";

  // Modificar classes dos botões
  const tabLinks = document.querySelectorAll(".tabs .tab-link");
  tabLinks.forEach(lnk => lnk.classList.remove("active"));
  
  // Acha botão e ativa
  const activeBtn = Array.from(tabLinks).find(lnk => lnk.innerText.toLowerCase().includes(tabId === 'mural' ? 'mural' : (tabId === 'servicos' ? 'serviços' : (tabId === 'agenda' ? 'agenda' : 'avaliações'))));
  if (activeBtn) activeBtn.classList.add("active");
}

// ==========================================================================
// CUSTOMIZAÇÃO EM TEMPO REAL DA AURA (VISUAL PÚBLICO)
// ==========================================================================

function applyCustomCSSAura(primary, secondary) {
  document.documentElement.style.setProperty('--public-primary', primary);
  document.documentElement.style.setProperty('--public-secondary', secondary);
}

// Atualizar cores dinamicamente
async function changeProfileColors(type, color) {
  const isConnected = await testSupabaseConnection();

  if (type === "primary") {
    activeCartomante.cor_primaria = color;
    document.documentElement.style.setProperty('--public-primary', color);
    document.getElementById("pickerPrimaryColor").style.background = color;
  } else if (type === "secondary") {
    activeCartomante.cor_secundaria = color;
    document.documentElement.style.setProperty('--public-secondary', color);
    document.getElementById("pickerSecondaryColor").style.background = color;
  }

  if (isConnected) {
    const user_id = await getCartomanteId();
    await supabase
      .from("perfis_publicos")
      .update({
        cor_primaria: activeCartomante.cor_primaria,
        cor_secundaria: activeCartomante.cor_secundaria
      })
      .eq("cartomante_id", user_id);
  } else {
    // Atualizar no catálogo demonstrativo
    const idx = MOCK_DIRECTORY_CARTOMANTES.findIndex(c => c.id === activeCartomante.id);
    if (idx !== -1) {
      MOCK_DIRECTORY_CARTOMANTES[idx].cor_primaria = activeCartomante.cor_primaria;
      MOCK_DIRECTORY_CARTOMANTES[idx].cor_secundaria = activeCartomante.cor_secundaria;
    }
  }
}

// Mudar imagem de banner
async function changeProfileBanner(url) {
  const isConnected = await testSupabaseConnection();
  document.getElementById("bannerImg").src = url;
  activeCartomante.banner_url = url;

  if (isConnected) {
    const user_id = await getCartomanteId();
    await supabase
      .from("perfis_publicos")
      .update({ banner_url: url })
      .eq("cartomante_id", user_id);
  }
}

// Mudar texto da bio via Prompt
async function changeProfileBioPrompt() {
  const newBio = prompt("Edite sua mensagem mística / Bio pública:", activeCartomante.bio);
  if (!newBio) return;

  activeCartomante.bio = newBio;
  document.getElementById("lblProfileBio").innerText = `"${newBio}"`;

  const isConnected = await testSupabaseConnection();

  if (isConnected) {
    const user_id = await getCartomanteId();
    await supabase
      .from("perfis_publicos")
      .update({ bio: newBio })
      .eq("cartomante_id", user_id);
  } else {
    const idx = MOCK_DIRECTORY_CARTOMANTES.findIndex(c => c.id === activeCartomante.id);
    if (idx !== -1) {
      MOCK_DIRECTORY_CARTOMANTES[idx].bio = newBio;
    }
  }
}
