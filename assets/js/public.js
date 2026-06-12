// public.js – Lógica da Vitrine Pública, Mural Espiritual, Ações de Cliente e Edição
// --------------------------------------------------------------------------

// Credenciais do Supabase
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
  console.warn("Supabase não disponível no public.js.");
}

// Estado
let activeCartomante = null;
let loggedUser = null;
let userRole = "visitante";
let isDona = false;

// Inicialização
document.addEventListener("DOMContentLoaded", async () => {
  const isProfilePage = document.getElementById("muralFeedContainer") !== null;

  if (isProfilePage) {
    initBookingSystem();
    const isConnected = await testSupabaseConnection();
    
    // Obter parâmetros da URL
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get("slug") || "luana-carito";
    
    if (isConnected) {
      await checkUserSession(slug);
      await loadRealProfile(slug);
    } else {
      console.warn("Usando perfil demonstrativo...");
      loadDemonstrativeProfile(slug);
    }
  }
});

async function testSupabaseConnection() {
  if (!supabase || SUPABASE_URL.includes("YOUR_PROJECT_REF")) return false;
  try {
    const { data, error } = await supabase.from("perfis_publicos").select("slug").limit(1);
    return error ? false : true;
  } catch (e) {
    return false;
  }
}

// Verificar sessão e permissões
async function checkUserSession(slug) {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    loggedUser = user;
    
    // Verificar se é cliente
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
  }
}

// Carregar Perfil Real do Supabase
async function loadRealProfile(slug) {
  if (!supabase) return;

  // 1. Carregar perfil público
  const { data: perfil, error } = await supabase
    .from("perfis_publicos")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !perfil) {
    console.error("Erro ao buscar perfil público:", error);
    loadDemonstrativeProfile(slug);
    return;
  }

  // 2. Buscar informações artísticas da cartomante
  const { data: cartomante } = await supabase
    .from("cartomantes")
    .select("nome, funcao, bio, foto_url, banner_url")
    .eq("user_id", perfil.cartomante_id)
    .maybeSingle();

  activeCartomante = {
    id: perfil.cartomante_id,
    slug: perfil.slug,
    nome: cartomante?.nome || perfil.nome_completo || "Cartomante",
    funcao: cartomante?.funcao || "Oraculista",
    foto_url: cartomante?.foto_url || perfil.foto_url || "assets/img/default-avatar.png",
    banner_url: cartomante?.banner_url || perfil.banner_url || "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?w=1200&auto=format&fit=crop",
    bio: cartomante?.bio || perfil.bio || "",
    especialidades: perfil.especialidades || [],
    categorias: perfil.redes_sociais?.categorias || [],
    redes: perfil.redes_sociais || {},
    cor_primaria: perfil.cor_primaria || "#C7A27A",
    cor_secundaria: perfil.cor_secundaria || "#6E5AAB"
  };

  // Verificar se o usuário autenticado é a dona do perfil
  if (loggedUser && loggedUser.id === activeCartomante.id) {
    isDona = true;
  }

  // Aplicar cores da aura no CSS Root
  applyCustomCSSAura(activeCartomante.cor_primaria, activeCartomante.cor_secundaria);

  // Injetar na UI
  const nameEl = document.getElementById("lblProfileName");
  if (nameEl) {
    nameEl.innerHTML = `${activeCartomante.nome} <span class="profile-badge-online"><i class="fas fa-bolt"></i> Sintonizada</span>`;
  }
  
  const bioEl = document.getElementById("lblProfileBio");
  if (bioEl) bioEl.innerText = `"${activeCartomante.bio}"`;
  
  const avatarEl = document.getElementById("profileAvatar");
  if (avatarEl) avatarEl.src = activeCartomante.foto_url;
  
  const bannerEl = document.getElementById("bannerImg");
  if (bannerEl) bannerEl.src = activeCartomante.banner_url;

  // Injetar Especialidades
  const specsEl = document.getElementById("lblSpecialties");
  if (specsEl) {
    specsEl.innerHTML = activeCartomante.especialidades.map(sp => `<span class="specialty-badge">${sp}</span>`).join(" ");
  }

  // Injetar Categorias
  const catsEl = document.getElementById("lblCategorias");
  if (catsEl) {
    catsEl.innerHTML = activeCartomante.categorias.map(cat => `<span class="category-badge">${cat}</span>`).join(" ");
  }

  // Injetar Redes
  const socialsEl = document.getElementById("lblSocials");
  if (socialsEl) {
    socialsEl.innerHTML = `
      <a href="#" class="social-link-item"><i class="fab fa-instagram"></i> ${activeCartomante.redes.instagram || "@oraculista"}</a>
      <a href="mailto:${activeCartomante.redes.email || "contato@templo.com"}" class="social-link-item"><i class="fas fa-envelope"></i> Contato Direct</a>
    `;
  }

  // Roteamento de Layout por Permissões (Dona vs Visitante/Cliente)
  adjustLayoutForRole();

  // Carregar mural e serviços
  await loadRealMuralFeed();
  await loadRealServices();
}

function adjustLayoutForRole() {
  const sidebar = document.getElementById("adminSidebar");
  const mainContent = document.getElementById("profileMainContent");
  const customizerBar = document.getElementById("profileCustomizerBar");
  const createPostCard = document.getElementById("createPostCard");
  const createServiceCard = document.getElementById("createServiceCard");
  const clientActionsWidget = document.getElementById("clientActionsWidget");
  const btnEntrar = document.getElementById("btnEntrarContaPublic");

  // Parâmetro da URL para testar visualização limpa
  const urlParams = new URLSearchParams(window.location.search);
  const forceClientMode = urlParams.get("view_as_client") === "true";

  if (isDona && !forceClientMode) {
    // É DONA DO PERFIL
    if (sidebar) sidebar.style.display = "flex";
    if (mainContent) mainContent.style.marginLeft = "260px";
    if (customizerBar) customizerBar.classList.remove("hidden");
    if (createPostCard) createPostCard.classList.remove("hidden");
    if (createServiceCard) createServiceCard.classList.remove("hidden");
    if (clientActionsWidget) clientActionsWidget.classList.add("hidden");

    // Adiciona botão para Visualizar como Consulente
    const profileNameEl = document.getElementById("lblProfileName");
    if (profileNameEl && !document.getElementById("btnViewAsClient")) {
      const viewAsClientBtn = document.createElement("a");
      viewAsClientBtn.id = "btnViewAsClient";
      viewAsClientBtn.href = window.location.pathname + "?slug=" + activeCartomante.slug + "&view_as_client=true";
      viewAsClientBtn.className = "glass-button";
      viewAsClientBtn.style.fontSize = "0.72rem";
      viewAsClientBtn.style.marginLeft = "15px";
      viewAsClientBtn.style.padding = "4px 10px";
      viewAsClientBtn.style.borderColor = "var(--gold-color)";
      viewAsClientBtn.innerHTML = '<i class="fas fa-eye"></i> Visualizar como Consulente';
      profileNameEl.appendChild(viewAsClientBtn);
    }
  } else {
    // VISITANTE OU CLIENTE
    if (sidebar) sidebar.style.display = "none";
    if (mainContent) {
      mainContent.style.marginLeft = "0";
      mainContent.style.maxWidth = "1100px";
      mainContent.style.margin = "0 auto";
      mainContent.style.padding = "20px";
    }
    if (customizerBar) customizerBar.classList.add("hidden");
    if (createPostCard) createPostCard.classList.add("hidden");
    if (createServiceCard) createServiceCard.classList.add("hidden");
    if (clientActionsWidget) clientActionsWidget.classList.remove("hidden");

    // Mostrar ou esconder botão de Entrar Conta se logado
    if (loggedUser && btnEntrar) {
      btnEntrar.classList.add("hidden");
    }

    // Configurar botões de ação do consulente
    setupClientActionButtons();
  }
}

// Configura os botões de ação rápida e modal de login
function setupClientActionButtons() {
  const btnConversar = document.getElementById("btnConversarPublic");
  const btnPergunta = document.getElementById("btnPerguntaPublic");
  const btnSolicitar = document.getElementById("btnSolicitarAtendimento");

  if (btnConversar) {
    btnConversar.addEventListener("click", () => handleClientAction("conversar"));
  }
  if (btnPergunta) {
    btnPergunta.addEventListener("click", () => handleClientAction("ask_baralho"));
  }
  if (btnSolicitar) {
    btnSolicitar.addEventListener("click", () => openBookingModalAction());
  }
}

// Ação Inteligente do Cliente
async function handleClientAction(actionName) {
  if (!supabase || !activeCartomante) return;

  if (userRole === "visitante") {
    // Visitante público, salvar intenção e enviar para login inteligente
    sessionStorage.setItem("pending_intent", JSON.stringify({
      action: actionName,
      cartomante_id: activeCartomante.id,
      cartomante_slug: activeCartomante.slug
    }));
    window.location.href = "login.html";
    return;
  }

  // Se já estiver logado como cliente
  if (userRole === "cliente") {
    // Obter ID do cliente na tabela clientes
    const { data: client } = await supabase
      .from("clientes")
      .select("id")
      .eq("user_id", loggedUser.id)
      .maybeSingle();

    if (!client) return;

    // Vincular cliente à cartomante na tabela cartomante_clientes
    await supabase.from("cartomante_clientes").insert({
      cartomante_id: activeCartomante.id,
      cliente_id: client.id,
      status: "ativo"
    }).select().maybeSingle();

    // Procurar conversa
    const { data: conversa } = await supabase
      .from("conversas")
      .select("id")
      .eq("cartomante_id", activeCartomante.id)
      .eq("cliente_id", client.id)
      .maybeSingle();

    let cid = conversa?.id;
    if (!cid) {
      const { data: newConv } = await supabase
        .from("conversas")
        .insert({
          cartomante_id: activeCartomante.id,
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
  } else {
    alert("Como cartomante, você não pode consultar outras oraculistas no chat.");
  }
}

// Carregar Mural Real do Supabase
async function loadRealMuralFeed() {
  const container = document.getElementById("muralFeedContainer");
  if (!container || !supabase || !activeCartomante) return;

  const { data: posts, error } = await supabase
    .from("mural_postagens")
    .select("*")
    .eq("cartomante_id", activeCartomante.id)
    .order("created_at", { ascending: false });

  container.innerHTML = "";
  if (error || !posts || posts.length === 0) {
    container.innerHTML = `
      <div class="chat-empty-state" style="padding: 40px; text-align: center; color: var(--text-secondary);">
        <i class="fas fa-feather" style="font-size: 2rem; color: var(--gold-color); margin-bottom: 10px;"></i>
        <p style="font-family: var(--font-classic); font-style: italic;">O mural está aguardando as primeiras sementes de sabedoria...</p>
      </div>
    `;
    return;
  }

  posts.forEach(p => {
    const card = document.createElement("div");
    card.className = "mural-post-item glass-panel";
    
    let imgHTML = "";
    if (p.imagem_url) {
      imgHTML = `<div style="margin-top:15px; margin-bottom:15px; border-radius:12px; overflow:hidden;"><img src="${p.imagem_url}" style="width:100%; max-height:300px; object-fit:cover;" /></div>`;
    }

    const dataStr = new Date(p.created_at).toLocaleDateString('pt-BR');

    card.innerHTML = `
      <div class="post-header">
        <h3 class="post-title">${p.titulo}</h3>
      </div>
      <p class="post-body">${p.conteudo}</p>
      ${imgHTML}
      <div class="post-footer">
        <span>Sintonizado em: ${dataStr}</span>
        ${isDona ? `<button onclick="deletePost('${p.id}')" style="background:none; border:none; color:#ff8888; cursor:pointer;"><i class="fas fa-trash"></i></button>` : ''}
      </div>
    `;
    container.appendChild(card);
  });
}

// Excluir postagem do mural (para a dona)
window.deletePost = async function(id) {
  if (!confirm("Deseja deletar esta postagem do mural?")) return;
  const { error } = await supabase.from("mural_postagens").delete().eq("id", id);
  if (error) {
    alert("Erro ao excluir: " + error.message);
  } else {
    await loadRealMuralFeed();
  }
};

// Criar nova postagem no mural (para a dona)
const postForm = document.getElementById("frmCreatePost");
if (postForm) {
  postForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!supabase || !activeCartomante || !isDona) return;

    const title = document.getElementById("postTitle").value.trim();
    const content = document.getElementById("postContent").value.trim();
    const image = document.getElementById("postImage").value.trim() || null;

    const { error } = await supabase
      .from("mural_postagens")
      .insert({
        cartomante_id: activeCartomante.id,
        titulo: title,
        conteudo: content,
        imagem_url: image,
        visibilidade: "publico"
      });

    if (error) {
      alert("Erro ao propagar mensagem: " + error.message);
    } else {
      postForm.reset();
      await loadRealMuralFeed();
    }
  });
}

// Carregar Serviços Reais do Supabase
async function loadRealServices() {
  const container = document.getElementById("servicesGridContainer");
  if (!container || !supabase || !activeCartomante) return;

  const { data: services, error } = await supabase
    .from("servicos_publicos")
    .select("*")
    .eq("cartomante_id", activeCartomante.id)
    .eq("ativo", true)
    .order("preco", { ascending: true });

  container.innerHTML = "";
  if (error || !services || services.length === 0) {
    container.innerHTML = `
      <div class="chat-empty-state" style="padding: 40px; text-align: center; color: var(--text-secondary);">
        <i class="fas fa-concierge-bell" style="font-size: 2rem; color: var(--gold-color); margin-bottom: 10px;"></i>
        <p style="font-family: var(--font-classic); font-style: italic;">Nenhum serviço público disponível no momento.</p>
      </div>
    `;
    return;
  }

  services.forEach(s => {
    const card = document.createElement("div");
    card.className = "service-item-card glass-panel";
    
    card.innerHTML = `
      <div class="service-meta" style="flex:1;">
        <h4>${s.titulo} <span class="service-duration"><i class="far fa-clock"></i> ${s.duracao_minutos} min</span></h4>
        <p class="service-desc">${s.descricao}</p>
        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:8px;">Prazo de revelação: ${s.prazo_dias} dia(s)</div>
      </div>
      <div class="service-price-tag">
        <div class="service-price">R$ ${s.preco.toFixed(2).replace('.', ',')}</div>
        <button onclick="handleClientAction('conversar')" class="glass-button" style="border-color:var(--gold-color); font-size:0.72rem; margin-top:10px; width:100%; justify-content:center;">
          <i class="fas fa-shopping-cart"></i> Solicitar
        </button>
        ${isDona ? `<button onclick="deleteService('${s.id}')" class="glass-button" style="border-color:#ff8888; color:#ff8888; font-size:0.72rem; margin-top:5px; width:100%; justify-content:center;"><i class="fas fa-trash"></i> Excluir</button>` : ''}
      </div>
    `;
    container.appendChild(card);
  });
}

// Excluir serviço (para a dona)
window.deleteService = async function(id) {
  if (!confirm("Deseja desativar este serviço do perfil?")) return;
  const { error } = await supabase.from("servicos_publicos").delete().eq("id", id);
  if (error) {
    alert("Erro ao excluir: " + error.message);
  } else {
    await loadRealServices();
  }
};

// Criar novo serviço (para a dona)
const serviceForm = document.getElementById("frmCreateService");
if (serviceForm) {
  serviceForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!supabase || !activeCartomante || !isDona) return;

    const title = document.getElementById("serviceTitle").value.trim();
    const price = parseFloat(document.getElementById("servicePrice").value);
    const duration = parseInt(document.getElementById("serviceDuration").value);
    const deadline = parseInt(document.getElementById("serviceDeadline").value);
    const desc = document.getElementById("serviceDesc").value.trim();

    const { error } = await supabase
      .from("servicos_publicos")
      .insert({
        cartomante_id: activeCartomante.id,
        titulo: title,
        preco: price,
        duracao_minutos: duration,
        prazo_dias: deadline,
        descricao: desc,
        ativo: true
      });

    if (error) {
      alert("Erro ao salvar serviço: " + error.message);
    } else {
      serviceForm.reset();
      await loadRealServices();
    }
  });
}

// Aba de Navegação do Perfil
window.switchProfileTab = function(tabName) {
  document.getElementById("tab-profile-mural").classList.add("hidden");
  document.getElementById("tab-profile-servicos").classList.add("hidden");
  
  document.getElementById("tab-mural-btn").classList.remove("active");
  document.getElementById("tab-servicos-btn").classList.remove("active");

  if (tabName === "mural") {
    document.getElementById("tab-profile-mural").classList.remove("hidden");
    document.getElementById("tab-mural-btn").classList.add("active");
  } else if (tabName === "servicos") {
    document.getElementById("tab-profile-servicos").classList.remove("hidden");
    document.getElementById("tab-servicos-btn").classList.add("active");
  }
};

// Modais de Edição de Perfil
window.openEditProfileModal = function() {
  if (!activeCartomante) return;
  
  document.getElementById("editBio").value = activeCartomante.bio;
  document.getElementById("editFoto").value = activeCartomante.foto_url;
  document.getElementById("editBanner").value = activeCartomante.banner_url;
  document.getElementById("editSpecs").value = activeCartomante.especialidades.join(", ");

  document.getElementById("editProfileModal").classList.remove("hidden");
};

window.closeEditProfileModal = function() {
  document.getElementById("editProfileModal").classList.add("hidden");
};

// Salvar Edição do Perfil (Dona)
const editProfileForm = document.getElementById("editProfileForm");
if (editProfileForm) {
  editProfileForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!supabase || !activeCartomante || !isDona) return;

    const saveBtn = document.getElementById("saveEditBtn");
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

    const bio = document.getElementById("editBio").value.trim();
    const foto = document.getElementById("editFoto").value.trim();
    const banner = document.getElementById("editBanner").value.trim();
    const specsInput = document.getElementById("editSpecs").value.trim();
    const especialidades = specsInput.split(",").map(s => s.trim()).filter(s => s.length > 0);

    try {
      // 1. Atualizar na tabela perfis_publicos
      const { error: perfilErr } = await supabase
        .from("perfis_publicos")
        .update({
          bio: bio,
          foto_url: foto,
          banner_url: banner,
          especialidades: especialidades,
          updated_at: new Date().toISOString()
        })
        .eq("cartomante_id", activeCartomante.id);

      // 2. Atualizar na tabela cartomantes
      const { error: cartErr } = await supabase
        .from("cartomantes")
        .update({
          bio: bio,
          foto_url: foto,
          banner_url: banner
        })
        .eq("user_id", activeCartomante.id);

      if (perfilErr || cartErr) {
        alert("Ocorreram alguns avisos ao salvar o perfil.");
      } else {
        alert("Templo Virtual reconfigurado com sucesso!");
        closeEditProfileModal();
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="fas fa-save"></i> Propagar Alterações no Templo';
    }
  });
}

// Alteração Interativa de Cores da Aura Visual
const primaryColorInput = document.getElementById("primaryColorInput");
const secondaryColorInput = document.getElementById("secondaryColorInput");

if (primaryColorInput) {
  primaryColorInput.addEventListener("change", async (e) => {
    const val = e.target.value;
    document.getElementById("pickerPrimaryColor").style.background = val;
    await updateAuraColors(val, activeCartomante.cor_secundaria);
  });
}
if (secondaryColorInput) {
  secondaryColorInput.addEventListener("change", async (e) => {
    const val = e.target.value;
    document.getElementById("pickerSecondaryColor").style.background = val;
    await updateAuraColors(activeCartomante.cor_primaria, val);
  });
}

async function updateAuraColors(primary, secondary) {
  if (!supabase || !activeCartomante || !isDona) return;
  applyCustomCSSAura(primary, secondary);
  activeCartomante.cor_primaria = primary;
  activeCartomante.cor_secundaria = secondary;
  
  await supabase
    .from("perfis_publicos")
    .update({ cor_primaria: primary, cor_secundaria: secondary })
    .eq("cartomante_id", activeCartomante.id);
}

// CSS Roots para Aura Visual Customizada
function applyCustomCSSAura(primary, secondary) {
  document.documentElement.style.setProperty("--public-primary", primary);
  document.documentElement.style.setProperty("--public-secondary", secondary);
  document.documentElement.style.setProperty("--gold-color", primary);
}

// Fallback do Modo Demonstrativo
function loadDemonstrativeProfile(slug) {
  activeCartomante = {
    id: "cartomante-luana",
    slug: "luana-carito",
    nome: "Luana Carito",
    funcao: "Sacerdotisa / Oraculista",
    foto_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop",
    banner_url: "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?w=1200&auto=format&fit=crop",
    bio: "Sacerdotisa dos caminhos, sintonizando sua frequência com a luz do oráculo para revelar segredos da alma.",
    especialidades: ["Tarô Terapêutico", "Baralho Cigano", "Astrologia Lunar"],
    categorias: ["Tarot", "Baralho Cigano", "Espiritualidade"],
    redes: { instagram: "@luanacarito" },
    cor_primaria: "#C7A27A",
    cor_secundaria: "#6E5AAB"
  };

  applyCustomCSSAura(activeCartomante.cor_primaria, activeCartomante.cor_secundaria);

  const lblName = document.getElementById("lblProfileName");
  if (lblName) lblName.innerHTML = `${activeCartomante.nome} <span class="profile-badge-online"><i class="fas fa-bolt"></i> Sintonizada</span>`;
  
  const lblBio = document.getElementById("lblProfileBio");
  if (lblBio) lblBio.innerText = `"${activeCartomante.bio}"`;
  
  const imgAvatar = document.getElementById("profileAvatar");
  if (imgAvatar) imgAvatar.src = activeCartomante.foto_url;
  
  const imgBanner = document.getElementById("bannerImg");
  if (imgBanner) imgBanner.src = activeCartomante.banner_url;

  const lblSpecs = document.getElementById("lblSpecialties");
  if (lblSpecs) lblSpecs.innerHTML = activeCartomante.especialidades.map(sp => `<span class="specialty-badge">${sp}</span>`).join(" ");
  
  const lblCats = document.getElementById("lblCategorias");
  if (lblCats) lblCats.innerHTML = activeCartomante.categorias.map(cat => `<span class="category-badge">${cat}</span>`).join(" ");
  
  const lblSoc = document.getElementById("lblSocials");
  if (lblSoc) {
    lblSoc.innerHTML = `
      <a href="#" class="social-link-item"><i class="fab fa-instagram"></i> ${activeCartomante.redes.instagram}</a>
    `;
  }

  // Renderizar mural mockado
  const container = document.getElementById("muralFeedContainer");
  if (container) {
    container.innerHTML = `
      <div class="mural-post-item glass-panel">
        <div class="post-header"><h3 class="post-title">Conselhos da Lua Nova</h3></div>
        <p class="post-body">O período é excelente para iniciar projetos espirituais e assentar as energias.</p>
        <div class="post-footer"><span>Sintonizado em: 11/06/2026</span></div>
      </div>
    `;
  }
}

// --- LÓGICA DO AGENDADOR COOPERATIVO (ESTILO NUTRILUAR) ---
let bookingDate = new Date();
let selectedBookingDate = null;
let selectedBookingHour = null;

async function testSupabaseConnection() {
  if (!supabase || SUPABASE_URL.includes("YOUR_PROJECT_REF")) return false;
  try {
    const { data, error } = await supabase.from("perfis_publicos").select("slug").limit(1);
    return error ? false : true;
  } catch (e) {
    return false;
  }
}

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

window.openBookingModalAction = function() {
  const modal = document.getElementById("bookingModal");
  if (!modal) return;
  modal.classList.remove("hidden");
  
  // Limpar seleções anteriores
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

  // Preencher espaços vazios anteriores
  for (let i = 0; i < firstDayIndex; i++) {
    const space = document.createElement("div");
    grid.appendChild(space);
  }

  const today = new Date();
  today.setHours(0,0,0,0);

  // Renderizar dias
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
  
  if (isConnected && activeCartomante) {
    try {
      const { data: eventos } = await supabase
        .from("agenda_eventos")
        .select("inicio")
        .eq("cartomante_id", activeCartomante.id)
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
        return evDate.toDateString() === date.toDateString();
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
  if (!selectedBookingDate || !selectedBookingHour) {
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

  if (isConnected && activeCartomante) {
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
          cartomante_id: activeCartomante.id,
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
          user_id: activeCartomante.id,
          titulo: "Novo Agendamento Confirmado",
          mensagem: `O consulente ${client.nome_completo} agendou uma consulta para ${bookingDateTime.toLocaleDateString('pt-BR')} às ${selectedBookingHour}.`,
          tipo: "atendimento"
        }]);

        await supabase.from("historico_acoes").insert([{
          cartomante_id: activeCartomante.id,
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
      const demoClient = JSON.parse(localStorage.getItem("demo_logged_client") || '{"id":"demo-client-1","nome_completo":"Consulente de Teste"}');
      
      const newEvent = {
        id: "demo-event-" + Date.now(),
        cartomante_id: activeCartomante ? activeCartomante.id : "cartomante-luana",
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
}

