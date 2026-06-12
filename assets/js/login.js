// login.js - Lógica de Login e Roteamento baseada em Perfil
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

// Form and elements
const loginForm = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    if (!supabase) {
      alert("Conexão com o Supabase indisponível.");
      return;
    }

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    
    // Disable button during login
    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Conectando...';
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        alert("Erro de autenticação: " + translateAuthError(error.message));
        if (loginBtn) {
          loginBtn.disabled = false;
          loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar no Portal';
        }
        return;
      }

      const user = data.user;
      if (user) {
        // Verificar se é cliente.
        // Procuramos por user_id na tabela clientes
        const { data: clientData, error: clientError } = await supabase
          .from("clientes")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (clientError) {
          console.error("Erro ao verificar tabela de clientes:", clientError);
        }

        if (clientData) {
          // É cliente, redirecionar para a Área do Cliente
          window.location.href = "client_area.html";
        } else {
          // É cartomante, redirecionar para o painel de cartomante
          window.location.href = "index.html";
        }
      }
    } catch (err) {
      console.error("Erro geral de login:", err);
      alert("Ocorreu um erro ao processar seu acesso.");
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar no Portal';
      }
    }
  });
}

function translateAuthError(msg) {
  if (msg.includes("Invalid login credentials")) {
    return "Credenciais de acesso incorretas.";
  }
  if (msg.includes("Email not confirmed")) {
    return "O e-mail ainda não foi confirmado.";
  }
  return msg;
}
