// assets/js/login.js - Lógica de Login, Roteamento e Acesso Demonstrativo
// Usa window.supabaseClient (singleton centralizado)

function initLogin() {
  const loginForm = document.getElementById("loginForm");
  const loginBtn = document.getElementById("loginBtn");
  const demoClienteBtn = document.getElementById("demoClienteBtn");
  const demoCartomanteBtn = document.getElementById("demoCartomanteBtn");

  // 1. Lógica do Formulário de Login Real
  if (loginForm) {
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

      let supabase = null;
      try {
        if (window.supabaseClientPromise) {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout de inicialização do Supabase")), 4000)
          );
          supabase = await Promise.race([window.supabaseClientPromise, timeoutPromise]);
        } else {
          supabase = await waitForSupabase(4000);
        }
      } catch (err) {
        console.error("Falha ao obter cliente Supabase:", err);
      }
      
      if (!supabase) {
        const diagErr = window.supabaseClientError || "Não foi possível carregar a biblioteca de autenticação.";
        showError(`Erro de inicialização: ${diagErr}`, loginBtn);
        return;
      }

      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
          showError(translateAuthError(error.message), loginBtn);
          return;
        }

        // Limpar qualquer sessão demo anterior para evitar conflitos
        if (window.clearDemoSession) window.clearDemoSession();

        // Sincronizar perfil no banco real se necessário (auto-recuperação pós-login)
        try {
          if (window.syncUserProfile) {
            await window.syncUserProfile(data.user, supabase);
          }
        } catch (syncErr) {
          console.error("Falha ao criar/sincronizar perfil pós-login:", syncErr);
          showError("Sua conta está ativa, mas houve falha ao criar o perfil. Faça login novamente para completar o cadastro.", loginBtn);
          return;
        }

        // Direcionar o usuário com base no banco de dados real
        await handleRedirectAfterLogin(data.user, supabase);

      } catch (err) {
        console.error("Erro geral de login:", err);
        if (err.message && (err.message.includes("fetch") || err.message.includes("NetworkError") || err.message.includes("Failed to fetch"))) {
          showError("Não foi possível conectar ao servidor. Verifique sua conexão com a internet.", loginBtn);
        } else {
          showError(`Erro ao entrar: ${err.message || "Tente novamente."}`, loginBtn);
        }
      }
    });
  }

  // 2. Lógica do Modo de Demonstração (Consulente)
  if (demoClienteBtn) {
    demoClienteBtn.addEventListener("click", async () => {
      // Limpar sessões anteriores
      if (window.clearDemoSession) window.clearDemoSession();
      await forceRealSignOut();

      // Salvar mock de cliente
      const demoClient = {
        id: "demo-client-1",
        nome_completo: "Consulente de Teste",
        email: "cliente@templo.com",
        celular: "(11) 99999-9999",
        foto_url: "assets/img/default-avatar.png",
        religiao: "Espiritualista",
        sexo: "Feminino",
        pronome: "Ela/Dela",
        estado_civil: "Solteira",
        guia_espiritual: "Caboclo das Sete Encruzilhadas",
        pai_mae_cabeca: "Iemanjá e Oxóssi",
        tradicao_espiritual: "Umbanda",
        criado_em: new Date().toISOString()
      };
      localStorage.setItem("demo_logged_client", JSON.stringify(demoClient));

      console.log("[Login] Modo Demo Consulente ativado.");
      window.location.href = "client_area.html";
    });
  }

  // 3. Lógica do Modo de Demonstração (Cartomante)
  if (demoCartomanteBtn) {
    demoCartomanteBtn.addEventListener("click", async () => {
      // Limpar sessões anteriores
      if (window.clearDemoSession) window.clearDemoSession();
      await forceRealSignOut();

      // Salvar mock de cartomante
      const demoCartomante = {
        id: "demo-cartomante-1",
        email: "cartomante@templo.com",
        nome_completo: "Luana Carito",
        user_metadata: {
          nome_completo: "Luana Carito",
          nome_profissional: "Luana Carito",
          role: "cartomante",
          foto_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop",
          banner_url: "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?w=1200&auto=format&fit=crop",
          bio: "Sacerdotisa dos caminhos, sintonizando sua frequência com a luz do oráculo para revelar segredos da alma."
        }
      };
      localStorage.setItem("demo_logged_user", JSON.stringify(demoCartomante));

      console.log("[Login] Modo Demo Cartomante ativado.");
      window.location.href = "dashboard.html";
    });
  }
}

// Forçar SignOut no Supabase para garantir limpeza
async function forceRealSignOut() {
  const supabase = window.supabaseClient;
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Erro ao fazer signOut do Supabase real:", e);
    }
  }
}

// Aguardar o cliente Supabase centralizado ficar disponível (Fallback)
function waitForSupabase(maxMs) {
  return new Promise((resolve) => {
    if (window.supabaseClient) {
      resolve(window.supabaseClient);
      return;
    }
    const start = Date.now();
    const check = setInterval(() => {
      if (window.supabaseClient || Date.now() - start > maxMs) {
        clearInterval(check);
        resolve(window.supabaseClient || null);
      }
    }, 100);
  });
}

// --- Redirecionamento Pós-Login Online ---
async function handleRedirectAfterLogin(user, supabase) {
  if (!user || !supabase) return;

  // Busca o tipo de conta direto na tabela de perfis
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("tipo_conta")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) console.error("Erro ao buscar perfil:", profileError);

  let tipoConta = profile?.tipo_conta;

  if (!tipoConta && user.user_metadata) {
    tipoConta = user.user_metadata.role || user.user_metadata.tipo_conta;
  }

  if (!tipoConta) {
    window.location.href = "completar-perfil.html";
    return;
  }

  return redirectByRole(tipoConta, user, supabase);
}

// --- Roteador de Permissões ---
async function redirectByRole(tipoConta, user, supabase) {
  const role = tipoConta.toLowerCase().trim();

  if (role === "mestra" || role === "admin" || role === "gerente") {
    window.location.href = "admin_dashboard.html";
    return;
  }

  if (role === "cartomante") {
    window.location.href = "dashboard.html";
    return;
  }

  if (role === "cliente") {
    const pendingIntentStr = sessionStorage.getItem("pending_intent");
    if (pendingIntentStr) {
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
    
    window.location.href = "client_area.html";
    return;
  }

  window.location.href = "index.html";
}

// --- Helpers de Interface ---
function showError(msg, loginBtn) {
  let box = document.getElementById("loginError");
  if (!box) {
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
  if (!msg) return "Erro ao entrar. Tente novamente.";
  const lower = msg.toLowerCase();
  if (lower.includes("invalid login credentials") || lower.includes("invalid credentials"))
    return "E-mail ou senha incorretos. Verifique e tente novamente.";
  if (lower.includes("email not confirmed") || lower.includes("email confirmation required"))
    return "E-mail ainda não confirmado. Verifique sua caixa de entrada.";
  if (lower.includes("too many requests") || lower.includes("rate limit"))
    return "Muitas tentativas. Aguarde alguns minutos.";
  if (lower.includes("user not found"))
    return "Nenhuma conta encontrada com este e-mail.";
  return "Não foi possível entrar. Verifique seus dados e tente novamente.";
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