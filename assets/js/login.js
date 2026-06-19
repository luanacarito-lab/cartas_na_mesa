// assets/js/login.js - Lógica de Login e Roteamento
// Usa window._supabaseClient (singleton criado em supabase-client.js)
console.log("=== LOGIN.JS CARREGADO ===");

function initLogin() {
  const loginForm = document.getElementById("loginForm");
  const loginBtn = document.getElementById("loginBtn");

  if (!loginForm) return;

  loginForm.addEventListener("submit", async (e) => {
    console.log("=== SUBMIT INTERCEPTADO ===");
    e.preventDefault();

    const email = document.getElementById("login_email").value.trim().toLowerCase();
    const password = document.getElementById("login_password").value;

    if (!email || !password) return;

    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right: 8px;"></i> Abrindo Portais...';
    }

    const supabase = window._supabaseClient;
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

// --- Login Offline / Demo ---
function handleOfflineLogin(email, loginBtn) {
  setTimeout(() => {
    const isCartomante = email === "admin@templo.com" || email === "cartomante@templo.com";

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
    } else {
      const registeredUsers = JSON.parse(localStorage.getItem("demo_registered_users") || "[]");
      const localUser = registeredUsers.find(u => u.email === email) || { nome: "Cliente Demonstrativo" };

      localStorage.setItem("demo_logged_client", JSON.stringify({
        id: localUser.id || "demo-client-1",
        nome_completo: localUser.nome || "Cliente Demonstrativo",
        email: email,
        role: "cliente"
      }));
      localStorage.removeItem("demo_logged_user");
      window.location.href = "client_area.html";
    }
  }, 800);
}

// --- Redirecionamento Pós-Login Online ---
async function handleRedirectAfterLogin(user, supabase) {
  if (!user || !supabase) return;

  // Buscar perfil no banco para saber o tipo_conta
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("tipo_conta")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Erro ao buscar perfil:", profileError);
  }

  const tipoConta = profile?.tipo_conta;

  if (!tipoConta) {
    // Nenhum perfil encontrado → tentar criar pelo metadata
    if (user.user_metadata && user.user_metadata.role) {
      if (window.syncUserProfile) {
        await window.syncUserProfile(user, supabase);
      }
      // Tentar buscar novamente
      const { data: profileRetry } = await supabase
        .from("profiles")
        .select("tipo_conta")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileRetry?.tipo_conta) {
        return redirectByRole(profileRetry.tipo_conta, user, supabase);
      }
    }
    // Ainda sem perfil → completar perfil
    window.location.href = "completar-perfil.html";
    return;
  }

  return redirectByRole(tipoConta, user, supabase);
}

async function redirectByRole(tipoConta, user, supabase) {
  const isClient = tipoConta === "cliente";

  // Verificar intenção pendente
  const pendingIntentStr = sessionStorage.getItem("pending_intent");
  if (pendingIntentStr && isClient) {
    try {
      const intent = JSON.parse(pendingIntentStr);

      // Buscar ID da tabela clientes
      const { data: client } = await supabase
        .from("clientes")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      const clientDbId = client?.id;
      if (clientDbId) {
        sessionStorage.removeItem("pending_intent");

        // Vincular cliente à cartomante
        await supabase.from("cartomante_clientes").insert({
          cartomante_id: intent.cartomante_id,
          cliente_id: clientDbId,
          status: "ativo"
        }).select().maybeSingle();

        // Buscar/criar conversa
        let { data: conversa } = await supabase
          .from("conversas")
          .select("id")
          .eq("cartomante_id", intent.cartomante_id)
          .eq("cliente_id", clientDbId)
          .maybeSingle();

        let cid = conversa?.id;
        if (!cid) {
          const { data: newConv } = await supabase
            .from("conversas")
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

  // Redirecionar pela role
  if (tipoConta === "cartomante") {
    window.location.href = "dashboard.html";
  } else {
    window.location.href = "client_area.html";
  }
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
  alert(msg);
  if (loginBtn) {
    loginBtn.disabled = false;
    loginBtn.innerHTML = '<i class="fas fa-sign-in-alt" style="margin-right: 8px;"></i> Entrar no Portal';
  }
}

function translateAuthError(msg) {
  if (msg.includes("Invalid login credentials")) {
    return "E-mail ou senha incorretos. Verifique e tente novamente.";
  }
  if (msg.includes("Email not confirmed") || msg.includes("Email confirmation required")) {
    return "Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada e clique no link de ativação.";
  }
  if (msg.includes("Too many requests")) {
    return "Muitas tentativas de login. Aguarde alguns minutos e tente novamente.";
  }
  return msg;
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
