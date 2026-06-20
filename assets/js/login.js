// assets/js/login.js - Lógica de Login e Roteamento
// Usa window._supabaseClient (singleton criado em supabase-client.js)

function initLogin() {
  const loginForm = document.getElementById("loginForm");
  const loginBtn = document.getElementById("loginBtn");
  const errorBox = document.getElementById("loginError");

  if (!loginForm) return;

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("login_email").value.trim().toLowerCase();
    const password = document.getElementById("login_password").value;

    if (!email || !password) {
      showError("Por favor, preencha o e-mail e a senha.", loginBtn);
      return;
    }

    clearError();
    setLoading(loginBtn, true);

    // Aguardar o cliente Supabase estar disponível (máx 3s)
    const supabase = await waitForSupabase(3000);
    const isConnected = supabase ? await testSupabaseConnection(supabase) : false;

    // --- MODO OFFLINE / DEMO ---
    if (!isConnected) {
      handleOfflineLogin(email, loginBtn);
      return;
    }

    // --- MODO ONLINE (Supabase) ---
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        showError(translateAuthError(error.message), loginBtn);
        return;
      }

      // Limpar estados locais anteriores
      localStorage.removeItem("demo_logged_user");
      localStorage.removeItem("demo_logged_client");

      // Sincronizar perfil (cria registro nas tabelas se necessário)
      if (window.syncUserProfile) {
        await window.syncUserProfile(data.user, supabase);
      }

      await handleRedirectAfterLogin(data.user, supabase);

    } catch (err) {
      console.error("Erro geral de login:", err);
      showError("Erro ao processar sua entrada. Tente novamente.", loginBtn);
    }
  });
}

// Aguardar o cliente Supabase ficar disponível
function waitForSupabase(maxMs) {
  return new Promise((resolve) => {
    if (window._supabaseClient !== undefined) {
      resolve(window._supabaseClient);
      return;
    }
    const start = Date.now();
    const check = setInterval(() => {
      if (window._supabaseClient !== undefined || Date.now() - start > maxMs) {
        clearInterval(check);
        resolve(window._supabaseClient || null);
      }
    }, 100);
  });
}

// --- Login Offline / Demo ---
function handleOfflineLogin(email, loginBtn) {
  setTimeout(() => {
    // 1. Verificar usuários demo cadastrados localmente
    const demoUsers = JSON.parse(localStorage.getItem("demo_users") || "[]");
    const matchedUser = demoUsers.find(u => u.email === email);

    if (matchedUser) {
      if (matchedUser.role === "cartomante") {
        localStorage.setItem("demo_logged_user", JSON.stringify(matchedUser));
        localStorage.removeItem("demo_logged_client");
        window.location.href = "dashboard.html";
      } else {
        localStorage.setItem("demo_logged_client", JSON.stringify(matchedUser));
        localStorage.removeItem("demo_logged_user");
        window.location.href = "client_area.html";
      }
      return;
    }

    // 2. Fallbacks padrões
    const isCartomante = email === "admin@templo.com" || email === "cartomante@templo.com";
    const isCliente = email === "cliente@templo.com" || email === "user@templo.com";

    if (isCartomante) {
      localStorage.setItem("demo_logged_user", JSON.stringify({
        id: "demo-admin-id",
        email: email,
        role: "cartomante",
        nome_completo: "Taróloga Administradora",
        user_metadata: { nome_completo: "Taróloga Administradora", nome_profissional: "Luana Carito" }
      }));
      localStorage.removeItem("demo_logged_client");
      window.location.href = "dashboard.html";
    } else if (isCliente) {
      localStorage.setItem("demo_logged_client", JSON.stringify({
        id: "demo-client-id",
        email: email,
        role: "cliente",
        nome_completo: "Consulente de Teste"
      }));
      localStorage.removeItem("demo_logged_user");
      window.location.href = "client_area.html";
    } else {
      showError("Conta não encontrada offline. Tente admin@templo.com ou cliente@templo.com, ou crie uma nova conta.", loginBtn);
    }
  }, 600);
}

// --- Redirecionamento Pós-Login Online ---
async function handleRedirectAfterLogin(user, supabase) {
  if (!user || !supabase) return;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("tipo_conta")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) console.error("Erro ao buscar perfil:", profileError);

  const tipoConta = profile?.tipo_conta;

  if (!tipoConta) {
    if (user.user_metadata && user.user_metadata.role) {
      if (window.syncUserProfile) {
        await window.syncUserProfile(user, supabase);
      }
      const { data: profileRetry } = await supabase
        .from("profiles")
        .select("tipo_conta")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileRetry?.tipo_conta) {
        return redirectByRole(profileRetry.tipo_conta, user, supabase);
      }
    }
    window.location.href = "completar-perfil.html";
    return;
  }

  return redirectByRole(tipoConta, user, supabase);
}

async function redirectByRole(tipoConta, user, supabase) {
  const isClient = tipoConta === "cliente";

  const pendingIntentStr = sessionStorage.getItem("pending_intent");
  if (pendingIntentStr && isClient) {
    try {
      const intent = JSON.parse(pendingIntentStr);
      const { data: client } = await supabase
        .from("clientes").select("id").eq("user_id", user.id).maybeSingle();
      const clientDbId = client?.id;

      if (clientDbId) {
        sessionStorage.removeItem("pending_intent");
        await supabase.from("cartomante_clientes").insert({
          cartomante_id: intent.cartomante_id, cliente_id: clientDbId, status: "ativo"
        }).select().maybeSingle();

        let { data: conversa } = await supabase.from("conversas").select("id")
          .eq("cartomante_id", intent.cartomante_id).eq("cliente_id", clientDbId).maybeSingle();

        let cid = conversa?.id;
        if (!cid) {
          const { data: newConv } = await supabase.from("conversas")
            .insert({ cartomante_id: intent.cartomante_id, cliente_id: clientDbId })
            .select().single();
          cid = newConv?.id;
        }

        const suffix = intent.action === "ask_baralho" ? `&action=ask_baralho` : "";
        window.location.href = `client_chat.html?cid=${cid}${suffix}`;
        return;
      }
    } catch (err) {
      console.error("Erro ao resolver intenção pendente:", err);
    }
  }

  window.location.href = tipoConta === "cartomante" ? "dashboard.html" : "client_area.html";
}

// --- Helpers ---
async function testSupabaseConnection(supabase) {
  if (!supabase) return false;
  if (typeof navigator !== "undefined" && !navigator.onLine) return false;
  try {
    const { error } = await supabase.from("profiles").select("id").limit(1);
    return !error;
  } catch (e) {
    return false;
  }
}

function showError(msg, loginBtn) {
  // Mostrar erro inline (não alert)
  let box = document.getElementById("loginError");
  if (!box) {
    // Criar elemento de erro se não existir
    box = document.createElement("div");
    box.id = "loginError";
    box.style.cssText = `
      display: flex; align-items: center; gap: 10px;
      padding: 12px 16px; border-radius: 8px; margin-bottom: 16px;
      background: rgba(220, 38, 38, 0.12); border: 1px solid rgba(220, 38, 38, 0.35);
      color: #ff8888; font-size: 0.875rem; font-family: var(--font-modern);
      animation: fadeInDown 0.3s ease-out;
    `;
    box.innerHTML = '<i class="fas fa-exclamation-circle"></i><span id="loginErrorText"></span>';

    const form = document.getElementById("loginForm");
    if (form) form.insertAdjacentElement("beforebegin", box);
  }

  const textEl = box.querySelector("#loginErrorText") || box;
  if (textEl !== box) textEl.textContent = msg;
  else box.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${msg}`;

  box.style.display = "flex";

  if (loginBtn) {
    loginBtn.disabled = false;
    loginBtn.innerHTML = '<i class="fas fa-sign-in-alt" style="margin-right: 8px;"></i> Entrar no Portal';
  }
}

function clearError() {
  const box = document.getElementById("loginError");
  if (box) box.style.display = "none";
}

function setLoading(btn, loading) {
  if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = loading
    ? '<i class="fas fa-spinner fa-spin" style="margin-right: 8px;"></i> Abrindo Portais...'
    : '<i class="fas fa-sign-in-alt" style="margin-right: 8px;"></i> Entrar no Portal';
}

function translateAuthError(msg) {
  if (msg.includes("Invalid login credentials")) return "Senha ou e-mail incorretos. Verifique e tente novamente.";
  if (msg.includes("Email not confirmed") || msg.includes("Email confirmation required"))
    return "E-mail ainda não confirmado. Verifique sua caixa de entrada.";
  if (msg.includes("Too many requests")) return "Muitas tentativas. Aguarde alguns minutos.";
  if (msg.includes("User not found")) return "Nenhuma conta encontrada com este e-mail.";
  return "Senha ou e-mail incorretos.";
}

function checkPendingConfirmation() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("pending_confirmation") === "true") {
    const alertDiv = document.getElementById("pendingConfirmationAlert");
    if (alertDiv) alertDiv.style.display = "block";
  }
}

// --- Inicialização ---
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initLogin();
    checkPendingConfirmation();
  });
} else {
  initLogin();
  checkPendingConfirmation();
}
