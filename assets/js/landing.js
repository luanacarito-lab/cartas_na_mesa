// landing.js - Lógica Dinâmica da Landing Page Pública do Portal
// --------------------------------------------------------------------------
const SUPABASE_URL = (window.ENV && window.ENV.SUPABASE_URL) || "";
const SUPABASE_ANON_KEY = (window.ENV && window.ENV.SUPABASE_ANON_KEY) || "";

let supabase = null;
try {
  if (typeof window.supabase !== "undefined" && SUPABASE_URL && !SUPABASE_URL.includes("YOUR_PROJECT_REF")) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch (e) {
  console.warn("Supabase offline na landing page.");
}

// Estados Locais
let loggedUser = null;
let userRole = "visitante";

// Mocks para Fallback Offline
const MOCK_CARTOMANTES = [
  {
    user_id: "cartomante-luana",
    nome: "Luana Carito",
    funcao: "Sacerdotisa & Oraculista",
    bio: "Canalizadora das frequências sutis do tarô terapêutico e baralho cigano para orientação de alma.",
    foto_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop",
    slug: "luana-carito",
    status: "online"
  },
  {
    user_id: "cartomante-morgana",
    nome: "Morgana das Runas",
    funcao: "Runóloga & Astróloga",
    bio: "Leitura de runas nórdicas e leitura de mapa astral focando na resolução de bloqueios kármicos.",
    foto_url: "https://images.unsplash.com/photo-1554151228-14d9def656e4?w=150&auto=format&fit=crop",
    slug: "morgana-runas",
    status: "online"
  }
];

document.addEventListener("DOMContentLoaded", async () => {
  const isConnected = await testSupabaseConnection();

  if (isConnected && supabase) {
    await checkUserSession();
    await loadRealCartomantes();
    await loadRealMuralToday();
  } else {
    await checkMockSession();
    loadMockCartomantes();
    loadMockMuralToday();
  }

  setupMenuScrolls();
});

async function testSupabaseConnection() {
  if (!supabase || SUPABASE_URL.includes("YOUR_PROJECT_REF")) return false;
  try {
    const { data, error } = await supabase.from("perfis_publicos").select("slug").limit(1);
    return !error;
  } catch (e) {
    return false;
  }
}

// Verifica sessão real do Supabase
async function checkUserSession() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      loggedUser = user;
      
      const { data: client } = await supabase
        .from("clientes")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (client) {
        userRole = "cliente";
      } else {
        userRole = "cartomante";
      }
      adjustHeaderForLoggedUser();
    }
  } catch (err) {
    console.error("Erro ao verificar sessão real:", err);
  }
}

// Verifica sessão mockada do LocalStorage
async function checkMockSession() {
  const mockCartomante = localStorage.getItem("demo_logged_user");
  const mockCliente = localStorage.getItem("demo_logged_client");

  if (mockCartomante) {
    loggedUser = JSON.parse(mockCartomante);
    userRole = "cartomante";
    adjustHeaderForLoggedUser();
  } else if (mockCliente) {
    loggedUser = JSON.parse(mockCliente);
    userRole = "cliente";
    adjustHeaderForLoggedUser();
  }
}

// Ajusta a navegação se o usuário já estiver logado
function adjustHeaderForLoggedUser() {
  const btnLogin = document.getElementById("btnHeaderLogin");
  const btnRegister = document.getElementById("btnHeaderRegister");
  const btnHeroEnter = document.getElementById("btnHeroEnter");
  const btnHeroRegister = document.getElementById("btnHeroRegister");

  const dashboardUrl = userRole === "cartomante" ? "dashboard.html" : "client_area.html";
  const btnText = userRole === "cartomante" ? "Acessar Painel" : "Minha Área";

  if (btnLogin) {
    btnLogin.href = dashboardUrl;
    btnLogin.textContent = btnText;
    btnLogin.style.borderColor = "var(--gold-color)";
  }

  if (btnRegister) {
    btnRegister.classList.add("hidden");
  }

  if (btnHeroEnter) {
    btnHeroEnter.href = dashboardUrl;
    btnHeroEnter.textContent = btnText;
  }

  if (btnHeroRegister) {
    btnHeroRegister.classList.add("hidden");
  }
}

// Rolar suavemente para as âncoras da landing page
function setupMenuScrolls() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      if (targetId === "#") return;
      
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        targetEl.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
}

// --- CARREGAR CARTOMANTES ---
async function loadRealCartomantes() {
  const grid = document.getElementById("landingCartomantesGrid");
  if (!grid) return;

  try {
    const { data: perfis, error } = await supabase
      .from("perfis_publicos")
      .select("*")
      .eq("publicado", true);

    if (error || !perfis || perfis.length === 0) {
      loadMockCartomantes();
      return;
    }

    grid.innerHTML = "";
    for (const p of perfis) {
      const { data: cart } = await supabase
        .from("cartomantes")
        .select("nome, funcao, bio, foto_url")
        .eq("user_id", p.cartomante_id)
        .maybeSingle();

      const name = cart?.nome || "Oraculista";
      const funcao = cart?.funcao || "Canalizadora";
      const bio = cart?.bio || p.bio || "Oraculista dedicada.";
      const foto = cart?.foto_url || p.foto_url || "assets/img/default-avatar.png";

      grid.appendChild(createCartomanteCard({
        user_id: p.cartomante_id,
        nome: name,
        funcao: funcao,
        bio: bio,
        foto_url: foto,
        slug: p.slug,
        status: "online"
      }));
    }
  } catch (err) {
    console.error("Erro ao carregar cartomantes reais:", err);
    loadMockCartomantes();
  }
}

function loadMockCartomantes() {
  const grid = document.getElementById("landingCartomantesGrid");
  if (!grid) return;

  grid.innerHTML = "";
  MOCK_CARTOMANTES.forEach(c => {
    grid.appendChild(createCartomanteCard(c));
  });
}

function createCartomanteCard(c) {
  const card = document.createElement("div");
  card.className = "cartomante-card glass-panel";

  card.innerHTML = `
    <div>
      <div class="cartomante-header">
        <img src="${c.foto_url}" alt="${c.nome}" class="cartomante-avatar" />
        <div class="cartomante-meta">
          <h3>${c.nome}</h3>
          <span>${c.funcao}</span>
        </div>
      </div>
      <p class="cartomante-bio">"${c.bio}"</p>
      <div class="cartomante-status-badge">
        <div class="status-dot"></div>
        <span>Atendendo Hoje</span>
      </div>
    </div>
    <div class="cartomante-actions">
      <a href="public_profile.html?slug=${c.slug}" class="glass-button" style="text-align: center; justify-content: center; font-size: 0.8rem;"><i class="fas fa-eye"></i> Ver Perfil</a>
      <button onclick="handleLandingAction('${c.user_id}', '${c.slug}', 'conversar')" class="glass-button" style="border-color: var(--gold-color); justify-content: center; font-size: 0.8rem; font-weight: 600;"><i class="fas fa-comments"></i> Iniciar Atendimento</button>
      <button onclick="handleLandingAction('${c.user_id}', '${c.slug}', 'ask_baralho')" class="glass-button" style="border-color: #a29bfe; justify-content: center; font-size: 0.8rem;"><i class="fas fa-crown"></i> Enviar Pergunta</button>
    </div>
  `;
  return card;
}

// --- CARREGAR MURAL DO DIA ---
async function loadRealMuralToday() {
  const container = document.getElementById("landingMuralContainer");
  if (!container) return;

  try {
    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);
    const todayEnd = new Date();
    todayEnd.setHours(23,59,59,999);

    const { data: posts, error } = await supabase
      .from("mural_postagens")
      .select("*")
      .eq("visibilidade", "publico")
      .gte("created_at", todayStart.toISOString())
      .lte("created_at", todayEnd.toISOString())
      .order("created_at", { ascending: false });

    if (error || !posts || posts.length === 0) {
      renderEmptyMural();
      return;
    }

    container.innerHTML = `<div class="mural-landing-grid" id="muralLandingGrid"></div>`;
    const grid = document.getElementById("muralLandingGrid");

    for (const p of posts) {
      const { data: cart } = await supabase
        .from("cartomantes")
        .select("nome, foto_url, user_id")
        .eq("user_id", p.cartomante_id)
        .maybeSingle();

      const { data: perf } = await supabase
        .from("perfis_publicos")
        .select("slug")
        .eq("cartomante_id", p.cartomante_id)
        .maybeSingle();

      const name = cart?.nome || "Oraculista";
      const foto = cart?.foto_url || "assets/img/default-avatar.png";
      const slug = perf?.slug || "";

      grid.appendChild(createMuralCard(p, name, foto, slug));
    }
  } catch (err) {
    console.error("Erro ao carregar mural real:", err);
    renderEmptyMural();
  }
}

function loadMockMuralToday() {
  // Por padrão no modo offline, vamos simular que não há mensagens criadas HOJE
  // para exibir a mensagem mística de mural vazio exigida nas regras.
  renderEmptyMural();
}

function renderEmptyMural() {
  const container = document.getElementById("landingMuralContainer");
  if (!container) return;

  container.innerHTML = `
    <div class="mural-empty-box">
      <i class="fas fa-star" style="color: var(--gold-color); font-size: 1.5rem; margin-bottom: 5px;"></i>
      <p>Ainda não há mensagens no mural de hoje. Volte mais tarde para ver as novidades das cartomantes.</p>
    </div>
  `;
}

function createMuralCard(p, name, foto, slug) {
  const card = document.createElement("div");
  card.className = "mural-landing-card glass-panel";
  
  const timeStr = new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = new Date(p.created_at).toLocaleDateString('pt-BR');

  let imgHTML = "";
  if (p.imagem_url) {
    imgHTML = `<img src="${p.imagem_url}" style="width:100%; max-height: 180px; object-fit: cover; border-radius: 8px; margin: 10px 0;" />`;
  }

  card.innerHTML = `
    <div class="mural-landing-header">
      <img src="${foto}" alt="${name}" class="mural-landing-avatar" />
      <div class="mural-landing-meta">
        <h4>${name}</h4>
        <span>Semeado hoje às ${timeStr} (${dateStr})</span>
      </div>
    </div>
    <div style="flex:1; display:flex; flex-direction:column; gap:5px;">
      <h3 style="font-family: var(--font-decorative); color: var(--gold-color); font-size: 1rem; margin: 5px 0;">${p.titulo}</h3>
      <p class="mural-landing-body">${p.conteudo}</p>
      ${imgHTML}
    </div>
    <div class="mural-landing-actions">
      <a href="public_profile.html?slug=${slug}" class="glass-button" style="font-size:0.75rem; padding:5px 12px;"><i class="fas fa-eye"></i> Perfil</a>
      <button onclick="handleLandingAction('${p.cartomante_id}', '${slug}', 'conversar')" class="glass-button" style="border-color: var(--gold-color); font-size:0.75rem; padding:5px 12px; font-weight:600;"><i class="fas fa-comments"></i> Consultar</button>
    </div>
  `;
  return card;
}

// --- AÇÕES DA LANDING PAGE COM SUPORTE A INTENÇÃO PENDENTE ---
window.handleLandingAction = async function(cartomanteId, slug, actionName) {
  if (userRole === "visitante") {
    // Salvar intenção de ação pendente no sessionStorage
    sessionStorage.setItem("pending_intent", JSON.stringify({
      action: actionName,
      cartomante_id: cartomanteId,
      cartomante_slug: slug
    }));
    // Envia para o login
    window.location.href = "login.html";
    return;
  }

  if (userRole === "cliente") {
    // Redireciona para o fluxo da área do cliente (vincular conversa e ir pro chat)
    // Se for offline, define os dados do chat localmente
    const isConnected = await testSupabaseConnection();

    if (isConnected && supabase) {
      try {
        const { data: client } = await supabase
          .from("clientes")
          .select("id")
          .eq("user_id", loggedUser.id)
          .maybeSingle();

        if (!client) return;

        // Cria o vínculo na tabela cartomante_clientes
        await supabase.from("cartomante_clientes").insert({
          cartomante_id: cartomanteId,
          cliente_id: client.id,
          status: "ativo"
        }).select().maybeSingle();

        // Procura conversa ou cria nova
        const { data: conversa } = await supabase
          .from("conversas")
          .select("id")
          .eq("cartomante_id", cartomanteId)
          .eq("cliente_id", client.id)
          .maybeSingle();

        let cid = conversa?.id;
        if (!cid) {
          const { data: newConv } = await supabase
            .from("conversas")
            .insert({
              cartomante_id: cartomanteId,
              cliente_id: client.id
            })
            .select()
            .single();
          cid = newConv?.id;
        }

        if (actionName === "ask_baralho") {
          window.location.href = `client_chat.html?cid=${cid}&action=ask_baralho`;
        } else {
          window.location.href = `client_chat.html?cid=${cid}`;
        }
      } catch (err) {
        console.error("Erro ao processar ação de atendimento:", err);
      }
    } else {
      // Offline/mock
      // Simular redirecionamento para o chat de cliente demonstrativo
      window.location.href = `client_chat.html?cid=demo-conversa-1${actionName === 'ask_baralho' ? '&action=ask_baralho' : ''}`;
    }
  } else {
    alert("Como cartomante cadastrada, você não pode iniciar atendimento com outras oraculistas.");
  }
};
