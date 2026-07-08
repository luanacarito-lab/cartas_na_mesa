// clients.js – Core logic for the Clientes UI (Real e Demo)
// Usa o cliente centralizado window.supabaseClient

let supabase = window.supabaseClient;

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

// Centralização de verificação
async function testSupabaseConnection() {
  return await window.testSupabaseConnection();
}

// Load current cartomante ID (auth user)
async function getCurrentCartomanteId() {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

// Mocks de Demonstração
function getDemoClients({ search = "", tag = "", order = "recent" } = {}) {
  const initial = [
    {
      id: "c1-uuid-helena",
      nome_completo: "Helena de Souza",
      foto_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop",
      created_at: new Date(Date.now() - 3600000 * 240).toISOString(),
      tags_clientes: [{ tag: "Amor", cor: "#ff9f1c" }, { tag: "Frequente", cor: "#6e5aab" }],
      agenda_eventos: [{ inicio: new Date(Date.now() - 3600000 * 2).toISOString() }]
    },
    {
      id: "c2-uuid-gabriel",
      nome_completo: "Gabriel Medeiros",
      foto_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop",
      created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
      tags_clientes: [{ tag: "Trabalho", cor: "#2ec4b6" }],
      agenda_eventos: [{ inicio: new Date(Date.now() - 3600000 * 48).toISOString() }]
    },
    {
      id: "c3-uuid-valentina",
      nome_completo: "Valentina Rocha",
      foto_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop",
      created_at: new Date(Date.now() - 3600000 * 140).toISOString(),
      tags_clientes: [{ tag: "Espiritual", cor: "#e0924b" }, { tag: "Urgente", cor: "#ff4d4d" }],
      agenda_eventos: [{ inicio: new Date(Date.now() - 3600000 * 140).toISOString() }]
    }
  ];

  const local = JSON.parse(localStorage.getItem("demo_clients_db") || "[]");
  let list = [...initial, ...local];

  if (search) {
    list = list.filter(c => c.nome_completo.toLowerCase().includes(search.toLowerCase()));
  }
  if (tag) {
    list = list.filter(c => c.tags_clientes.some(t => t.tag.toLowerCase() === tag.toLowerCase()));
  }
  if (order === "oldest") {
    list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  } else {
    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
  return list;
}

// Fetch clients for the logged‑in cartomante
async function fetchClients({ search = "", tag = "", order = "recent" } = {}) {
  const isConnected = await testSupabaseConnection();

  if (!isConnected) {
    return getDemoClients({ search, tag, order });
  }

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
    // Se for modo demo, a ficha do cliente abre em modo fictício
    card.href = `profile_cliente.html?cid=${c.id}`;
    card.className = "client-card";
    
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
  const isConnected = await testSupabaseConnection();
  if (!tagFilterSelect) return;

  if (!isConnected) {
    const clients = getDemoClients();
    const tags = [];
    clients.forEach(c => {
      if (c.tags_clientes) {
        c.tags_clientes.forEach(t => tags.push(t.tag));
      }
    });
    const uniqueTags = [...new Set(tags)];
    tagFilterSelect.innerHTML = '<option value="">Todas as tags</option>';
    uniqueTags.forEach(tag => {
      const opt = document.createElement("option");
      opt.value = tag;
      opt.textContent = tag;
      tagFilterSelect.appendChild(opt);
    });
    return;
  }

  const cartomanteId = await getCurrentCartomanteId();
  if (!cartomanteId) return;
  
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
  const isConnected = await testSupabaseConnection();
  if (!isConnected) return;

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
  
  const isConnected = await testSupabaseConnection();

  const data = {
    nome_completo: form.nome_completo.value.trim(),
    data_nascimento: form.data_nascimento.value || null,
    celular: form.celular.value.trim(),
    email: form.email.value.trim() || null,
    religiao: form.religiao.value || null,
    sexo: form.sexo.value || null,
    pronome: form.pronome.value.trim() || null,
    estado_civil: form.estado_civil.value.trim() || null,
    guia_espiritual: form.guia_espiritual.value.trim() || null,
    pai_mae_cabeca: form.pai_mae_cabeca.value.trim() || null,
    tradicao_espiritual: form.tradicao_espiritual ? form.tradicao_espiritual.value.trim() : (form.tradição_espiritual ? form.tradição_espiritual.value.trim() : null),
    observacoes_gerais: form.observacoes_gerais.value.trim() || null,
    personalidade_percebida: form.personalidade_percebida.value.trim() || null,
    padroes_recorrentes: form.padroes_recorrentes.value.trim() || null,
    pontos_delicados: form.pontos_delicados.value.trim() || null,
    resumo_historia: form.resumo_historia.value.trim() || null
  };

  if (!isConnected) {
    // Cadastro de cliente em modo demo
    const newDemoClient = {
      id: "c-new-demo-" + Date.now(),
      nome_completo: data.nome_completo,
      foto_url: "assets/img/default-avatar.png",
      created_at: new Date().toISOString(),
      tags_clientes: tempTags.map(t => ({ tag: t.tag, cor: t.cor })),
      agenda_eventos: []
    };
    
    const localClients = JSON.parse(localStorage.getItem("demo_clients_db") || "[]");
    localClients.push(newDemoClient);
    localStorage.setItem("demo_clients_db", JSON.stringify(localClients));
    
    alert("Consulente demo criada e sintonizada localmente!");
    form.reset();
    tempTags = [];
    renderTempTags();
    const modal = document.getElementById("clientModal");
    if (modal) modal.classList.add("hidden");
    await loadAndRender();
    await loadTagsDropdown();
    return;
  }

  const cartomanteId = await getCurrentCartomanteId();
  if (!cartomanteId) {
    alert("Você precisa estar logada para cadastrar clientes.");
    return;
  }

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

  // Link client to cartomante
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
  
  form.reset();
  tempTags = [];
  renderTempTags();
  
  const modal = document.getElementById("clientModal");
  if (modal) modal.classList.add("hidden");
  
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
