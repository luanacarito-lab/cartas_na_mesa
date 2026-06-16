// assets/js/login.js - Lógica de Login Simplificada, Mística e Roteamento Avançado
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

// Form Elements
const loginForm = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("login_email").value.trim().toLowerCase();
    const password = document.getElementById("login_password").value;

    if (!email || !password) return;

    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right: 8px;"></i> Abrindo Portais...';
    }

    const isConnected = await testSupabaseConnection();

    if (!isConnected) {
      // Login offline/mock
      setTimeout(async () => {
        const isCartomante = email === "admin@templo.com" || email === "cartomante@templo.com";
        
        if (isCartomante) {
          const demoUser = {
            id: "demo-admin-id",
            email: email,
            role: "cartomante",
            nome_completo: "Taróloga Administradora",
            user_metadata: {
              nome_completo: "Taróloga Administradora",
              nome_profissional: "Luana Carito"
            }
          };
          localStorage.setItem("demo_logged_user", JSON.stringify(demoUser));
          localStorage.removeItem("demo_logged_client"); // Garantir exclusividade
          
          if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt" style="margin-right: 8px;"></i> Entrar no Portal';
          }
          window.location.href = "dashboard.html";
        } else {
          // Consulente/Cliente
          const registeredUsers = JSON.parse(localStorage.getItem("demo_registered_users") || "[]");
          const localUser = registeredUsers.find(u => u.email === email) || {
            nome: "Cliente Demonstrativo",
            celular: "(11) 99999-9999",
            religiao: "Espiritualista"
          };
          
          const demoClient = {
            id: localUser.id || "demo-client-1",
            nome_completo: localUser.nome || "Cliente Demonstrativo",
            email: email,
            celular: localUser.celular,
            foto_url: "assets/img/default-avatar.png",
            religiao: localUser.religiao,
            role: "cliente"
          };
          localStorage.setItem("demo_logged_client", JSON.stringify(demoClient));
          localStorage.removeItem("demo_logged_user"); // Garantir exclusividade
          
          if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt" style="margin-right: 8px;"></i> Entrar no Portal';
          }

          // Se houver intenção de chat pendente no offline (fallback simples)
          const pendingIntentStr = sessionStorage.getItem("pending_intent");
          if (pendingIntentStr) {
            try {
              const intent = JSON.parse(pendingIntentStr);
              sessionStorage.removeItem("pending_intent");
              // Redireciona para o chat de cliente mockado
              window.location.href = `client_chat.html?cid=demo-chat-id`;
              return;
            } catch (err) {
              console.error(err);
            }
          }
          
          window.location.href = "client_area.html";
        }
      }, 800);
      return;
    }

    // Fluxo Online via Supabase
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        alert("Chave incorreta ou erro de acesso: " + translateAuthError(error.message));
        if (loginBtn) {
          loginBtn.disabled = false;
          loginBtn.innerHTML = '<i class="fas fa-sign-in-alt" style="margin-right: 8px;"></i> Entrar no Portal';
        }
        return;
      }

      // Limpar estados locais anteriores
      localStorage.removeItem("demo_logged_user");
      localStorage.removeItem("demo_logged_client");

      await handleRedirectAfterLogin(data.user);
    } catch (err) {
      console.error("Erro geral de login:", err);
      alert("Erro ao processar sua entrada.");
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt" style="margin-right: 8px;"></i> Entrar no Portal';
      }
    }
  });
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
    window.location.href = "dashboard.html";
  }
}

async function testSupabaseConnection() {
  if (!supabase || SUPABASE_URL.includes("YOUR_PROJECT_REF")) return false;
  try {
    const { data, error } = await supabase.from("clientes").select("id").limit(1);
    return error ? false : true;
  } catch (e) {
    return false;
  }
}

function translateAuthError(msg) {
  if (msg.includes("Invalid login credentials")) {
    return "E-mail ou senha incorretos.";
  }
  return msg;
}
