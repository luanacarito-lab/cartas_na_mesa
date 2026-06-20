// register_cartomante.js - Cadastro de Cartomantes e Inicialização de Perfil
// Usa window._supabaseClient (singleton criado em supabase-client.js)
// ---------------------------------------------------------------------------------

let registerBtn = null;

function initRegister() {
  const form = document.getElementById("registerCartomanteForm");
  registerBtn = document.getElementById("registerBtn");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const supabase = window._supabaseClient;
    const isConnected = supabase ? await testSupabaseConnection(supabase) : false;

    const nomeCompleto = document.getElementById("nome_completo").value.trim();
    const nomeProfissional = document.getElementById("nome_profissional").value.trim();
    const email = document.getElementById("email").value.trim();
    const telefone = document.getElementById("telefone").value.trim();
    const senha = document.getElementById("senha").value;
    const confirmaSenha = document.getElementById("confirma_senha").value;
    const funcao = document.getElementById("funcao").value;
    const fotoUrl =
      document.getElementById("foto_url").value.trim() || "assets/img/default-avatar.png";
    const bannerUrl =
      document.getElementById("banner_url").value.trim() ||
      "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?w=1200&auto=format&fit=crop";
    const bio =
      document.getElementById("bio").value.trim() || "Nova oraculista sintonizada.";

    const specsInput = document.getElementById("especialidades").value.trim();
    const especialidades = specsInput
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const categorias = Array.from(
      document.querySelectorAll('input[name="categorias"]:checked')
    ).map((cb) => cb.value);

    if (senha !== confirmaSenha) {
      alert("As chaves secretas (senhas) não são idênticas.");
      return;
    }

    if (senha.length < 6) {
      alert("A senha precisa ter no mínimo 6 caracteres.");
      return;
    }

    if (categorias.length === 0) {
      alert("Por favor, selecione ao menos uma categoria de atendimento.");
      return;
    }

    setLoading(true, '<i class="fas fa-spinner fa-spin"></i> Canalizando Energias...');

    if (!isConnected) {
      handleOfflineRegister(nomeCompleto, nomeProfissional, email, senha, telefone, funcao, fotoUrl, bannerUrl, bio, especialidades, categorias);
      return;
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: senha,
        options: {
          data: {
            nome_completo: nomeCompleto,
            nome_profissional: nomeProfissional,
            telefone: telefone,
            role: "cartomante",
            funcao: funcao,
            foto_url: fotoUrl,
            banner_url: bannerUrl,
            bio: bio,
            especialidades: especialidades,
            categorias: categorias,
          },
        },
      });

      if (authError) {
        alert("Erro no cadastro: " + authError.message);
        resetButton();
        return;
      }

      const user = authData.user;
      if (!user) {
        alert("Ocorreu um erro ao recuperar o usuário criado.");
        resetButton();
        return;
      }

      // Confirmação de e-mail ativa → sessão nula
      if (!authData.session) {
        alert(
          "Cadastro de Cartomante realizado! Enviamos um e-mail de ativação para sua caixa de entrada. Por favor, confirme seu e-mail para acessar o painel."
        );
        window.location.href = "login.html?pending_confirmation=true";
        return;
      }

      // Confirmação desativada → sessão imediata
      if (window.syncUserProfile) {
        await window.syncUserProfile(user, supabase);
      }

      alert("Cadastro de Cartomante realizado com sucesso!");
      window.location.href = "dashboard.html";
    } catch (err) {
      console.error("Erro geral de cadastro:", err);
      alert("Ocorreu um erro no processamento.");
      resetButton();
    }
  });
}

function setLoading(loading, html) {
  if (!registerBtn) return;
  registerBtn.disabled = loading;
  if (html) registerBtn.innerHTML = html;
}

function resetButton() {
  setLoading(false, '<i class="fas fa-magic"></i> Despertar Perfil & Registrar');
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initRegister);
} else {
  initRegister();
}

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

function handleOfflineRegister(nomeCompleto, nomeProfissional, email, senha, telefone, funcao, fotoUrl, bannerUrl, bio, especialidades, categorias) {
  setTimeout(() => {
    const demoUsers = JSON.parse(localStorage.getItem("demo_users") || "[]");
    
    if (demoUsers.some(u => u.email === email)) {
      alert("Este e-mail já está em uso offline.");
      resetButton();
      return;
    }

    const newUser = {
      id: "demo-user-" + Date.now(),
      email: email,
      role: "cartomante",
      nome_completo: nomeCompleto,
      user_metadata: {
        nome_completo: nomeCompleto,
        nome_profissional: nomeProfissional,
        telefone: telefone,
        role: "cartomante",
        funcao: funcao,
        foto_url: fotoUrl,
        banner_url: bannerUrl,
        bio: bio,
        especialidades: especialidades,
        categorias: categorias
      }
    };

    demoUsers.push(newUser);
    localStorage.setItem("demo_users", JSON.stringify(demoUsers));
    
    localStorage.setItem("demo_logged_user", JSON.stringify(newUser));
    localStorage.removeItem("demo_logged_client");

    alert("Conexão com o Supabase indisponível. Registrando conta DEMO local para testes offline!");
    window.location.href = "dashboard.html";
  }, 800);
}
