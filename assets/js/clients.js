// clients.js – core logic for the Clientes UI
// ---------------------------------------------------
// NOTE: Replace the placeholder values with your Supabase project credentials.
const SUPABASE_URL = (window.ENV && window.ENV.SUPABASE_URL) || "https://YOUR_PROJECT_REF.supabase.co";
const SUPABASE_ANON_KEY = (window.ENV && window.ENV.SUPABASE_ANON_KEY) || "YOUR_PUBLIC_ANON_KEY";

// Initialize Supabase client (using the CDN version)
const supabase = supabaseCreateClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM elements
// Modal open/close handling
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

// Utility: format date
function fmtDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString();
}

// Load current cartomante ID (auth user)
async function getCurrentCartomanteId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

// Fetch clients for the logged‑in cartomante
async function fetchClients({ search = "", tag = "", order = "recent" } = {}) {
  const cartomanteId = await getCurrentCartomanteId();
  if (!cartomanteId) return [];

  let query = supabase
    .from("clientes")
    .select(`id, nome_completo, foto_url, tags_clientes(tag, cor), agenda_eventos!inner(data_inicio, status)`)
    .eq("cartomante_id", cartomanteId);

  if (search) query = query.ilike("nome_completo", `%${search}%`);
  if (tag) query = query.textSearch("tags_clientes.tag", tag, { type: "plain" });

  // ordering
  switch (order) {
    case "oldest":
      query = query.order("created_at", { ascending: true });
      break;
    case "recurring":
      // placeholder – you can implement a custom ordering based on number of events
      query = query.order("id", { ascending: true });
      break;
    case "financial":
      // placeholder – order by pending financial amount
      query = query.order("financeiro_status", { ascending: false });
      break;
    default: // "recent"
      query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;
  if (error) console.error("Error fetching clients:", error);
  return data || [];
}

// Render client cards
function renderClients(clients) {
  clientListEl.innerHTML = "";
  if (!clients.length) {
    noClientsMsg.style.display = "block";
    return;
  }
  noClientsMsg.style.display = "none";

  clients.forEach(c => {
    const card = document.createElement("div");
    card.className = "client-card";
    card.innerHTML = `
      <img src="${c.foto_url || "assets/img/default-avatar.png"}" alt="Foto" class="client-photo"/>
      <h3 class="client-name">${c.nome_completo}</h3>
      <div class="client-tags">
        ${c.tags_clientes?.map(t => `<span class="tag" style="background:${t.cor || "#ccc"}">${t.tag}</span>`).join("") || ""}
      </div>
      <p class="last-visit">Último atendimento: ${c.agenda_eventos?.[0]?.data_inicio ? fmtDate(c.agenda_eventos[0].data_inicio) : "—"}</p>
      <p class="financial-status">Financeiro: ${c.financeiro_status ?? "—"}</p>
    `;
    clientListEl.appendChild(card);
  });
}

// Search / filter handlers
searchInput?.addEventListener("input", async e => {
  await loadAndRender();
});
if (tagFilterSelect) tagFilterSelect.addEventListener("change", async () => await loadAndRender());
if (orderSelect) orderSelect.addEventListener("change", async () => await loadAndRender());

async function loadAndRender() {
  const clients = await fetchClients({
    search: searchInput?.value.trim(),
    tag: tagFilterSelect?.value,
    order: orderSelect?.value,
  });
  renderClients(clients);
}

// Real‑time subscription – updates the list automatically
async function subscribeRealtime() {
  const cartomanteId = await getCurrentCartomanteId();
  if (!cartomanteId) return;
  const channel = supabase
    .channel(`public:clientes_cartomante_${cartomanteId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "clientes" },
      payload => {
        console.log("New client inserted", payload);
        loadAndRender();
      }
    )
    .subscribe();
}

// New client form – simplified submission
async function handleNewClient(event) {
  event.preventDefault();
  const form = event.target;
  const data = {
    nome_completo: form.nome_completo.value,
    data_nascimento: form.data_nascimento.value,
    celular: form.celular.value,
    email: form.email.value,
    religiao: form.religiao.value,
    sexo: form.sexo.value,
    pronome: form.pronome.value,
    estado_civil: form.estado_civil.value,
    // other optional fields can be added here
  };
  const { data: cliente, error } = await supabase.from("clientes").insert([data]).single();
  if (error) return console.error(error);
  // link client to cartomante
  const cartomanteId = await getCurrentCartomanteId();
  await supabase.from("cartomante_clientes").insert({ cartomante_id: cartomanteId, cliente_id: cliente.id, status: "ativo" });
  // show success toast
  alert("Cliente criado com sucesso!");
  // redirect to client profile page
  window.location.href = `profile_cliente.html?cid=${cliente.id}`;
}

// File upload – gallery (client‑specific bucket folder)
async function uploadFile(clientId, file) {
  const filePath = `${clientId}/${file.name}`;
  const { data, error } = await supabase.storage.from("client-gallery").upload(filePath, file);
  if (error) console.error("Upload error", error);
  return data?.path;
}

// Init
window.addEventListener("load", async () => {
  await loadAndRender();
  await subscribeRealtime();
  const clientForm = document.getElementById("clientForm");
  if (clientForm) clientForm.addEventListener("submit", handleNewClient);
});

// Helper to create Supabase client via CDN (makes the file self‑contained)
function supabaseCreateClient(url, key) {
  // The CDN script must be loaded before this file runs.
  // eslint-disable-next-line no-undef
  return supabase.createClient(url, key);
}

// -------------------------------------------------------------------
// End of clients.js
