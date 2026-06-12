// clients.js – core logic for the Clientes UI
// ---------------------------------------------------
const SUPABASE_URL = (window.ENV && window.ENV.SUPABASE_URL) || "https://YOUR_PROJECT_REF.supabase.co";
const SUPABASE_ANON_KEY = (window.ENV && window.ENV.SUPABASE_ANON_KEY) || "YOUR_PUBLIC_ANON_KEY";

// Initialize Supabase client
let supabase = null;
try {
  supabase = supabaseCreateClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) {
  console.warn("Erro ao inicializar Supabase no clients.js", e);
}

// DOM elements
const newClientBtn = document.getElementById("newClientBtn");
if (newClientBtn) {
  newClientBtn.addEventListener("click", () => {
    const modal = document.getElementById("clientModal");
    if (modal) modal.classList.remove("hidden");
  });
}
const closeModal = document.getElementById("closeModal");
if (closeModal) {
  closeModal.addEventListener("click", () => {
    const modal = document.getElementById("clientModal");
    if (modal) modal.classList.add("hidden");
  });
}

const clientListEl = document.getElementById("clientList");
const searchInput = document.getElementById("searchInput");
const tagFilterSelect = document.getElementById("filterTagSelect");
const orderSelect = document.getElementById("orderSelect");
const noClientsMsg = document.getElementById("emptyState");

// Temp tags list for form
let tempTags = [];
const addTagBtn = document.getElementById("addTagBtn");
const tagNameInput = document.getElementById("tagNameInput");
const tagColorInput = document.getElementById("tagColorInput");
const tagListEl = document.getElementById("tagList");

if (addTagBtn && tagNameInput && tagColorInput && tagListEl) {
  addTagBtn.addEventListener("click", () => {
    const tagName = tagNameInput.value.trim();
    const tagColor = tagColorInput.value;
    if (!tagName) return;

    if (tempTags.some(t => t.tag.toLowerCase() === tagName.toLowerCase())) {
      alert("Esta tag já foi adicionada.");
      return;
    }

    tempTags.push({ tag: tagName, cor: tagColor });
    tagNameInput.value = "";
    renderTempTags();
  });
}

function renderTempTags() {
  if (!tagListEl) return;
  tagListEl.innerHTML = "";
  tempTags.forEach((t, index) => {
    const li = document.createElement("li");
    li.style.display = "inline-flex";
    li.style.alignItems = "center";
    li.style.gap = "8px";
    li.style.background = t.cor;
    li.style.color = "#fff";
    li.style.padding = "4px 8px";
    li.style.borderRadius = "6px";
    li.style.fontSize = "0.8rem";
    li.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
    
    li.innerHTML = `
      <span>${t.tag}</span>
      <button type="button" style="background:none; border:none; color:#fff; cursor:pointer; font-weight:bold; font-size:1.1rem; line-height:1;" onclick="removeTempTag(${index})">&times;</button>
    `;
    tagListEl.appendChild(li);
  });
}

window.removeTempTag = function(index) {
  tempTags.splice(index, 1);
  renderTempTags();
};

// Utility: format date
function fmtDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR');
}

// Load current cartomante ID (auth user)
async function getCurrentCartomanteId() {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

// Fetch clients for the logged‑in cartomante
async function fetchClients({ search = "", tag = "", order = "recent" } = {}) {
  const cartomanteId = await getCurrentCartomanteId();
  if (!cartomanteId) return [];

  let query = supabase
    .from("clientes")
    .select(`
      id, 
      nome_completo, 
      foto_url, 
      created_at,
      tags_clientes(tag, cor), 
      cartomante_clientes!inner(cartomante_id), 
      agenda_eventos(inicio)
    `)
    .eq("cartomante_clientes.cartomante_id", cartomanteId);

  if (search) {
    query = query.ilike("nome_completo", `%${search}%`);
  }
  
  if (tag) {
    // Para filtrar por tag, precisamos de tags_clientes como inner join
    query = supabase
      .from("clientes")
      .select(`
        id, 
        nome_completo, 
        foto_url, 
        created_at,
        tags_clientes!inner(tag, cor), 
        cartomante_clientes!inner(cartomante_id), 
        agenda_eventos(inicio)
      `)
      .eq("cartomante_clientes.cartomante_id", cartomanteId)
      .eq("tags_clientes.tag", tag);

    if (search) {
      query = query.ilike("nome_completo", `%${search}%`);
    }
  }

  // ordering
  switch (order) {
    case "oldest":
      query = query.order("created_at", { ascending: true });
      break;
    case "recent":
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching clients:", error);
    return [];
  }
  return data || [];
}

// Render client cards
function renderClients(clients) {
  if (!clientListEl) return;
  clientListEl.innerHTML = "";
  if (!clients.length) {
    if (noClientsMsg) noClientsMsg.classList.remove("hidden");
    return;
  }
  if (noClientsMsg) noClientsMsg.classList.add("hidden");

  clients.forEach(c => {
    const card = document.createElement("a");
    card.href = `profile_cliente.html?cid=${c.id}`;
    card.className = "client-card";
    
    // Sort events to get the latest one
    let lastVisitStr = "—";
    if (c.agenda_eventos && c.agenda_eventos.length > 0) {
      const sortedEvents = [...c.agenda_eventos].sort((a, b) => new Date(b.inicio) - new Date(a.inicio));
      if (sortedEvents[0] && sortedEvents[0].inicio) {
        lastVisitStr = fmtDate(sortedEvents[0].inicio);
      }
    }

    card.innerHTML = `
      <img src="${c.foto_url || "assets/img/default-avatar.png"}" alt="Foto de ${c.nome_completo}" class="client-photo"/>
      <h3 class="client-name">${c.nome_completo}</h3>
      <div class="client-tags">
        ${c.tags_clientes?.map(t => `<span class="tag" style="background:${t.cor || "#ccc"}">${t.tag}</span>`).join("") || ""}
      </div>
      <p class="last-visit"><i class="far fa-calendar-alt"></i> Último atendimento: ${lastVisitStr}</p>
      <p class="financial-status"><i class="far fa-clock"></i> Cadastrado em: ${fmtDate(c.created_at)}</p>
    `;
    clientListEl.appendChild(card);
  });
}

// Load tags to filter dropdown
async function loadTagsDropdown() {
  const cartomanteId = await getCurrentCartomanteId();
  if (!cartomanteId || !tagFilterSelect) return;
  
  const { data, error } = await supabase
    .from("tags_clientes")
    .select("tag")
    .eq("cartomante_id", cartomanteId);
    
  if (error) {
    console.error("Error loading tags dropdown:", error);
    return;
  }
  
  const uniqueTags = [...new Set(data.map(t => t.tag))];
  tagFilterSelect.innerHTML = '<option value="">Todas as tags</option>';
  uniqueTags.forEach(tag => {
    const opt = document.createElement("option");
    opt.value = tag;
    opt.textContent = tag;
    tagFilterSelect.appendChild(opt);
  });
}

// Search / filter handlers
if (searchInput) {
  searchInput.addEventListener("input", async () => {
    await loadAndRender();
  });
}
if (tagFilterSelect) {
  tagFilterSelect.addEventListener("change", async () => {
    await loadAndRender();
  });
}
if (orderSelect) {
  orderSelect.addEventListener("change", async () => {
    await loadAndRender();
  });
}

async function loadAndRender() {
  const clients = await fetchClients({
    search: searchInput?.value.trim(),
    tag: tagFilterSelect?.value,
    order: orderSelect?.value,
  });
  renderClients(clients);
}

// Real‑time subscription
async function subscribeRealtime() {
  const cartomanteId = await getCurrentCartomanteId();
  if (!cartomanteId || !supabase) return;
  
  supabase
    .channel(`public:cartomante_clientes_${cartomanteId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "cartomante_clientes", filter: `cartomante_id=eq.${cartomanteId}` },
      payload => {
        console.log("Relationship changed", payload);
        loadAndRender();
      }
    )
    .subscribe();
}

// New client form submission
async function handleNewClient(event) {
  event.preventDefault();
  const form = event.target;
  
  const cartomanteId = await getCurrentCartomanteId();
  if (!cartomanteId) {
    alert("Você precisa estar logada para cadastrar clientes.");
    return;
  }

  const data = {
    nome_completo: form.nome_completo.value,
    data_nascimento: form.data_nascimento.value || null,
    celular: form.celular.value,
    email: form.email.value || null,
    religiao: form.religiao.value || null,
    sexo: form.sexo.value || null,
    pronome: form.pronome.value || null,
    estado_civil: form.estado_civil.value || null,
    guia_espiritual: form.guia_espiritual.value || null,
    pai_mae_cabeca: form.pai_mae_cabeca.value || null,
    tradicao_espiritual: form.tradicao_espiritual ? form.tradicao_espiritual.value : (form.tradição_espiritual ? form.tradição_espiritual.value : null),
    observacoes_gerais: form.observacoes_gerais.value || null,
    personalidade_percebida: form.personalidade_percebida.value || null,
    padroes_recorrentes: form.padroes_recorrentes.value || null,
    pontos_delicados: form.pontos_delicados.value || null,
    resumo_historia: form.resumo_historia.value || null
  };

  const { data: cliente, error } = await supabase
    .from("clientes")
    .insert([data])
    .select()
    .single();

  if (error) {
    console.error("Erro ao inserir cliente:", error);
    alert("Erro ao criar cliente: " + error.message);
    return;
  }

  // link client to cartomante
  const { error: linkError } = await supabase
    .from("cartomante_clientes")
    .insert({ cartomante_id: cartomanteId, cliente_id: cliente.id, status: "ativo" });

  if (linkError) {
    console.error("Erro ao vincular cliente:", linkError);
  }

  // Insert tags in batch if any
  if (tempTags.length > 0) {
    const tagsData = tempTags.map(t => ({
      cliente_id: cliente.id,
      cartomante_id: cartomanteId,
      tag: t.tag,
      cor: t.cor
    }));
    const { error: tagsError } = await supabase.from("tags_clientes").insert(tagsData);
    if (tagsError) {
      console.error("Erro ao salvar tags:", tagsError);
    }
  }

  alert("Cliente criado com sucesso!");
  
  // Clean form and temp tags
  form.reset();
  tempTags = [];
  renderTempTags();
  
  // Close modal
  const modal = document.getElementById("clientModal");
  if (modal) modal.classList.add("hidden");
  
  // Reload
  await loadAndRender();
  await loadTagsDropdown();
}

// Init
window.addEventListener("load", async () => {
  await loadAndRender();
  await loadTagsDropdown();
  await subscribeRealtime();
  const clientForm = document.getElementById("clientForm");
  if (clientForm) clientForm.addEventListener("submit", handleNewClient);
});

// Helper to create Supabase client via CDN
function supabaseCreateClient(url, key) {
  if (typeof window.supabase !== "undefined") {
    return window.supabase.createClient(url, key);
  }
  return null;
}
