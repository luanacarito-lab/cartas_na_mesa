// client_area.js - Lógica principal do Templo do Consulente (Área do Cliente)
// -------------------------------------------------------------------------
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

// Global state for client area
let loggedClient = null;
let cartomantesList = [];

// Tab switching
window.switchClientTab = function(tabId) {
  document.querySelectorAll('.client-menu-item').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelectorAll('.tab-section').forEach(sec => {
    sec.classList.remove('active');
  });

  // Activate matching menu button
  const matchingBtn = Array.from(document.querySelectorAll('.client-menu-item')).find(btn => 
    btn.getAttribute('onclick').includes(tabId)
  );
  if (matchingBtn) matchingBtn.classList.add('active');

  const matchingSec = document.getElementById(`tab-${tabId}`);
  if (matchingSec) matchingSec.classList.add('active');
};

// Check authentication and load profile
async function checkAuthAndLoadProfile() {
  if (!supabase) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  // Load client from DB using user_id
  const { data: client, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar perfil do cliente:", error);
  }

  if (!client) {
    // Se não for cliente, talvez seja cartomante. Redirecionar para dashboard principal.
    window.location.href = "index.html";
    return;
  }

  loggedClient = client;

  // Update DOM badges
  const nameBadge = document.getElementById("clientNameBadge");
  if (nameBadge) nameBadge.textContent = client.nome_completo;

  // Populate form fields
  populateProfileForm(client);
}

// Fill profile fields
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

  // Toggle religious fields visibility
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

// Update profiles conditonal view on select change
const profileReligiao = document.getElementById("profile_religiao");
if (profileReligiao) {
  profileReligiao.addEventListener("change", () => {
    toggleReligiousExtras(profileReligiao.value);
  });
}

// Save profile changes
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
      alert("Erro ao atualizar ficha cadastral: " + error.message);
    } else {
      alert("Sua ficha espiritual foi atualizada com sucesso!");
      // Atualizar local
      loggedClient = { ...loggedClient, ...updatedData };
      const nameBadge = document.getElementById("clientNameBadge");
      if (nameBadge) nameBadge.textContent = loggedClient.nome_completo;
    }

    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="fas fa-save"></i> Atualizar Minha Ficha';
    }
  });
}

// Load cartomantes catalog
async function fetchCartomantes() {
  if (!supabase) return;

  const { data, error } = await supabase
    .from("cartomantes")
    .select("*")
    .order("nome", { ascending: true });

  if (error) {
    console.error("Erro ao carregar oraculistas:", error);
    return;
  }

  cartomantesList = data || [];
  renderCartomantes(cartomantesList);
}

// Render cartomantes grid
function renderCartomantes(list) {
  const container = document.getElementById("cartomanteList");
  const emptyMsg = document.getElementById("emptyCartomanteMsg");
  if (!container) return;

  container.innerHTML = "";
  if (list.length === 0) {
    if (emptyMsg) emptyMsg.classList.remove("hidden");
    return;
  }
  if (emptyMsg) emptyMsg.classList.add("hidden");

  list.forEach(c => {
    const card = document.createElement("div");
    card.className = "cartomante-card";
    
    card.innerHTML = `
      <div class="cartomante-info">
        <img src="${c.foto_url || "assets/img/default-avatar.png"}" alt="Foto de ${c.nome}" class="cartomante-photo"/>
        <div class="cartomante-meta">
          <h3>${c.nome}</h3>
          <span>${c.funcao || "Oraculista"}</span>
        </div>
      </div>
      <p class="cartomante-bio">${c.bio || "Oraculista sintonizada no Templo Cósmico."}</p>
      <div class="cartomante-actions">
        <button onclick="viewCartomanteProfile('${c.user_id}')" class="glass-button" style="border-color: rgba(255,255,255,0.1);"><i class="fas fa-eye"></i> Perfil</button>
        <button onclick="startConversa('${c.user_id}')" class="glass-button" style="border-color: var(--gold-color);"><i class="fas fa-comments"></i> Conversar</button>
      </div>
    `;
    container.appendChild(card);
  });
}

// Search filter in catalog
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
      (c.bio && c.bio.toLowerCase().includes(term))
    );
    renderCartomantes(filtered);
  });
}

// View cartomante profile modal
window.viewCartomanteProfile = function(cartomanteUserId) {
  const cartomante = cartomantesList.find(c => c.user_id === cartomanteUserId);
  if (!cartomante) return;

  const modal = document.getElementById("cartomanteModal");
  const modalFoto = document.getElementById("modalCartomanteFoto");
  const modalNome = document.getElementById("modalCartomanteNome");
  const modalFuncao = document.getElementById("modalCartomanteFuncao");
  const modalBio = document.getElementById("modalCartomanteBio");
  const modalBtn = document.getElementById("modalConversarBtn");

  if (modalFoto) modalFoto.src = cartomante.foto_url || "assets/img/default-avatar.png";
  if (modalNome) modalNome.textContent = cartomante.nome;
  if (modalFuncao) modalFuncao.textContent = cartomante.funcao || "Oraculista";
  if (modalBio) modalBio.textContent = cartomante.bio || "Sem bio cadastrada.";
  if (modalBtn) {
    modalBtn.setAttribute("onclick", `startConversa('${cartomante.user_id}')`);
  }

  if (modal) modal.classList.remove("hidden");
};

window.closeCartomanteModal = function() {
  const modal = document.getElementById("cartomanteModal");
  if (modal) modal.classList.add("hidden");
};

// Start or retrieve conversation
window.startConversa = async function(cartomanteUserId) {
  if (!supabase || !loggedClient) return;

  // Close modal if open
  closeCartomanteModal();

  try {
    // Procuramos se já existe uma conversa entre esse cliente e essa cartomante
    const { data: conversa, error } = await supabase
      .from("conversas")
      .select("id")
      .eq("cartomante_id", cartomanteUserId)
      .eq("cliente_id", loggedClient.id)
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar conversa:", error);
      alert("Erro ao conectar ao canal de conversa.");
      return;
    }

    if (conversa) {
      // Já existe conversa, redireciona
      window.location.href = `client_chat.html?cid=${conversa.id}`;
    } else {
      // Criar nova conversa
      const { data: novaConversa, error: createError } = await supabase
        .from("conversas")
        .insert({
          cartomante_id: cartomanteUserId,
          cliente_id: loggedClient.id
        })
        .select()
        .single();

      if (createError) {
        console.error("Erro ao criar conversa:", createError);
        alert("Erro ao criar canal de consulta.");
        return;
      }

      // Adicionar link na tabela cartomante_clientes para associar na listagem de clientes dela
      await supabase
        .from("cartomante_clientes")
        .insert({
          cartomante_id: cartomanteUserId,
          cliente_id: loggedClient.id,
          status: "ativo"
        });

      window.location.href = `client_chat.html?cid=${novaConversa.id}`;
    }
  } catch (err) {
    console.error("Erro geral ao iniciar conversa:", err);
  }
};

// Logout handling
window.handleLogout = async function() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) console.error("Erro no logout:", error);
  window.location.href = "login.html";
};

// Init
window.addEventListener("load", async () => {
  await checkAuthAndLoadProfile();
  await fetchCartomantes();
});
