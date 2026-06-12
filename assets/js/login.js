// login.js - Lógica de Login Inteligente e Roteamento Avançado
// -----------------------------------------------------------------
const SUPABASE_URL = (window.ENV && window.ENV.SUPABASE_URL) || "https://YOUR_PROJECT_REF.supabase.co";
const SUPABASE_ANON_KEY = (window.ENV && window.ENV.SUPABASE_ANON_KEY) || "YOUR_PUBLIC_ANON_KEY";

// Initialize Supabase client
let supabase = null;
try {
  supabase = supabaseCreateClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) {
  console.warn("Erro ao inicializar Supabase no login.js", e);
}

// Helper to create Supabase client via CDN
function supabaseCreateClient(url, key) {
  if (typeof window.supabase !== "undefined") {
    return window.supabase.createClient(url, key);
  }
  return null;
}

// Forms and Steps Elements
const emailForm = document.getElementById("emailForm");
const loginPasswordForm = document.getElementById("loginPasswordForm");
const registerClienteForm = document.getElementById("registerClienteForm");
const btnNextStep = document.getElementById("btnNextStep");

// Displays
const loginEmailDisplay = document.getElementById("login_email_display");
const registerEmailDisplay = document.getElementById("register_email_display");

let userEmail = "";

// STEP 1: Verify Email
if (emailForm) {
  emailForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!supabase) return alert("Erro de conexão com o portal místico.");

    const emailInput = document.getElementById("check_email").value.trim().toLowerCase();
    if (!emailInput) return;

    userEmail = emailInput;

    if (btnNextStep) {
      btnNextStep.disabled = true;
      btnNextStep.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Consultando Oráculos...';
    }

    try {
      // Verificar se e-mail existe em clientes
      const { data: client, error: clientErr } = await supabase
        .from("clientes")
        .select("id")
        .eq("email", userEmail)
        .maybeSingle();

      // Verificar se e-mail existe em cartomantes
      const { data: cartomante, error: cartErr } = await supabase
        .from("cartomantes")
        .select("id")
        .eq("email", userEmail)
        .maybeSingle();

      // Se existir em qualquer uma das duas tabelas
      if (client || cartomante) {
        // Exibir formulário de login por senha
        emailForm.classList.add("hidden");
        loginPasswordForm.classList.remove("hidden");
        if (loginEmailDisplay) loginEmailDisplay.value = userEmail;
        document.getElementById("password").focus();
      } else {
        // Exibir formulário de cadastro de cliente
        emailForm.classList.add("hidden");
        registerClienteForm.classList.remove("hidden");
        if (registerEmailDisplay) registerEmailDisplay.value = userEmail;
        document.getElementById("register_nome").focus();
      }
    } catch (err) {
      console.error("Erro ao verificar e-mail:", err);
      alert("Ocorreu um erro ao verificar sua sintonia espiritual.");
    } finally {
      if (btnNextStep) {
        btnNextStep.disabled = false;
        btnNextStep.innerHTML = 'Avançar <i class="fas fa-arrow-right" style="margin-left: 8px;"></i>';
      }
    }
  });
}

// Reset steps
window.resetToEmailStep = function() {
  loginPasswordForm.classList.add("hidden");
  registerClienteForm.classList.add("hidden");
  emailForm.classList.remove("hidden");
  document.getElementById("check_email").focus();
};

// STEP 2A: Handle Login with Password
if (loginPasswordForm) {
  loginPasswordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!supabase) return;

    const password = document.getElementById("password").value;
    const loginBtn = document.getElementById("loginBtn");

    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password
      });

      if (error) {
        alert("Chave incorreta ou erro de acesso: " + translateAuthError(error.message));
        if (loginBtn) {
          loginBtn.disabled = false;
          loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar no Portal';
        }
        return;
      }

      await handleRedirectAfterLogin(data.user);
    } catch (err) {
      console.error("Erro geral de login:", err);
      alert("Erro ao processar sua entrada.");
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar no Portal';
      }
    }
  });
}

// STEP 2B: Handle Cliente Registration
if (registerClienteForm) {
  registerClienteForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!supabase) return;

    const nome = document.getElementById("register_nome").value.trim();
    const senha = document.getElementById("register_senha").value;
    const confirma = document.getElementById("register_confirma").value;

    if (senha !== confirma) {
      alert("As chaves secretas não coincidem.");
      return;
    }

    if (senha.length < 6) {
      alert("A senha precisa ter no mínimo 6 caracteres.");
      return;
    }

    const registerBtn = document.getElementById("registerBtn");
    if (registerBtn) {
      registerBtn.disabled = true;
      registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Firmando Acordo...';
    }

    // Coleta dos campos opcionais
    const celular = document.getElementById("register_celular").value.trim() || null;
    const nascimento = document.getElementById("register_nascimento").value || null;
    const religiao = document.getElementById("register_religiao").value || null;
    const sexo = document.getElementById("register_sexo").value || null;
    const pronome = document.getElementById("register_pronome").value.trim() || null;
    const estadoCivil = document.getElementById("register_estado_civil").value.trim() || null;

    // Campos religiosos opcionais
    const isMistic = ["Umbanda", "Candomblé", "Quimbanda", "Wicca", "Xamanismo", "Espiritualista"].includes(religiao);
    const guia = isMistic ? (document.getElementById("register_guia").value.trim() || null) : null;
    const paiMae = isMistic ? (document.getElementById("register_pai_mae").value.trim() || null) : null;
    const tradicao = isMistic ? (document.getElementById("register_tradicao").value.trim() || null) : null;

    try {
      // 1. Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userEmail,
        password: senha,
        options: {
          data: {
            nome_completo: nome,
            role: "cliente"
          }
        }
      });

      if (authError) {
        alert("Erro ao registrar: " + authError.message);
        resetRegisterBtn();
        return;
      }

      const user = authData.user;
      if (!user) {
        alert("Não foi possível carregar os dados de iniciação.");
        resetRegisterBtn();
        return;
      }

      // 2. Inserir na tabela clientes do banco de dados
      const clientRecord = {
        user_id: user.id,
        nome_completo: nome,
        email: userEmail,
        celular,
        data_nascimento: nascimento,
        religiao,
        sexo,
        pronome,
        estado_civil: estadoCivil,
        guia_espiritual: guia,
        pai_mae_cabeca: paiMae,
        tradicao_espiritual: tradicao,
        foto_url: "assets/img/default-avatar.png"
      };

      const { error: dbError } = await supabase
        .from("clientes")
        .insert([clientRecord]);

      if (dbError) {
        console.error("Erro ao salvar cliente no DB:", dbError);
        alert("Cadastro na egrégora mística concluído com avisos: " + dbError.message);
      }

      await handleRedirectAfterLogin(user);

    } catch (err) {
      console.error("Erro geral no cadastro:", err);
      alert("Erro ao firmar cadastro.");
      resetRegisterBtn();
    }
  });
}

function resetRegisterBtn() {
  const registerBtn = document.getElementById("registerBtn");
  if (registerBtn) {
    registerBtn.disabled = false;
    registerBtn.innerHTML = '<i class="fas fa-user-sparkles"></i> Firmar Cadastro & Entrar';
  }
}

// Global Routing logic with pending intents support
async function handleRedirectAfterLogin(user) {
  if (!user || !supabase) return;

  // 1. Check if user is a client in the DB
  const { data: client, error: clientError } = await supabase
    .from("clientes")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const isClient = client !== null;
  const clientDbId = client?.id;

  // 2. Check for pending intent in sessionStorage
  const pendingIntentStr = sessionStorage.getItem("pending_intent");
  
  if (pendingIntentStr && isClient && clientDbId) {
    try {
      const intent = JSON.parse(pendingIntentStr);
      sessionStorage.removeItem("pending_intent");

      // Vincular cliente à cartomante se for uma ação pendente de perfil
      await supabase
        .from("cartomante_clientes")
        .insert({
          cartomante_id: intent.cartomante_id,
          cliente_id: clientDbId,
          status: "ativo"
        })
        .select()
        .maybeSingle();

      // Buscar conversa ou criar nova
      const { data: conversa } = await supabase
        .from("conversas")
        .select("id")
        .eq("cartomante_id", intent.cartomante_id)
        .eq("cliente_id", clientDbId)
        .maybeSingle();

      let cid = conversa?.id;
      if (!cid) {
        const { data: newConv } = await supabase
          .from("conversas")
          .insert({
            cartomante_id: intent.cartomante_id,
            cliente_id: clientDbId
          })
          .select()
          .single();
        cid = newConv?.id;
      }

      // Adicionar link na tabela cartomante_clientes para associar na listagem de clientes dela
      await supabase
        .from("cartomante_clientes")
        .insert({
          cartomante_id: intent.cartomante_id,
          cliente_id: clientDbId,
          status: "ativo"
        })
        .select()
        .maybeSingle();

      // Redirecionar
      if (intent.action === "ask_baralho") {
        window.location.href = `client_chat.html?cid=${cid}&action=ask_baralho`;
      } else {
        window.location.href = `client_chat.html?cid=${cid}`;
      }
      return;
    } catch (err) {
      console.error("Erro ao resolver intenção pendente:", err);
    }
  }

  // 3. Fallback routing if no pending intent
  if (isClient) {
    window.location.href = "client_area.html";
  } else {
    window.location.href = "index.html";
  }
}

function translateAuthError(msg) {
  if (msg.includes("Invalid login credentials")) {
    return "E-mail ou senha incorretos.";
  }
  return msg;
}
