// register_cartomante.js - Cadastro de Cartomantes e Inicialização de Perfil
// Usa window._supabaseClient (singleton criado em supabase-client.js)
// CORRIGIDO: mensagens de erro traduzidas, validações melhoradas
// ---------------------------------------------------------------------------------

let registerBtn = null;

function initRegister() {
  const form = document.getElementById("registerCartomanteForm");
  registerBtn = document.getElementById("registerBtn");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideRegError();

    if (!supabase) {
      showRegError("Conexão com o servidor indisponível. Verifique sua internet e tente novamente.");
      return;
    }
    const isConnected = await testSupabaseConnection(supabase);

    const nomeCompleto = document.getElementById("nome_completo").value.trim();
    const nomeProfissional = document.getElementById("nome_profissional").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
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

    // Validações com mensagens claras
    if (!nomeCompleto) {
      showRegError("Preencha seu nome completo.");
      return;
    }

    if (!nomeProfissional) {
      showRegError("Preencha seu nome profissional.");
      return;
    }

    if (!email) {
      showRegError("Preencha seu e-mail.");
      return;
    }

    if (senha.length < 6) {
      showRegError("A senha precisa ter no mínimo 6 caracteres.");
      return;
    }

    if (senha !== confirmaSenha) {
      showRegError("As senhas não conferem. Digite novamente.");
      return;
    }

    if (!funcao) {
      showRegError("Selecione seu oráculo principal (função).");
      return;
    }

    if (categorias.length === 0) {
      showRegError("Selecione ao menos uma categoria de atendimento.");
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
        showRegError(translateRegError(authError.message));
        resetButton();
        return;
      }

      const user = authData.user;
      if (!user) {
        showRegError("Ocorreu um erro ao criar sua conta. Tente novamente.");
        resetButton();
        return;
      }

      // Confirmação de e-mail ativa → sessão nula
      if (!authData.session) {
        showRegSuccess("Cadastro realizado! Verifique seu e-mail e clique no link de ativação para acessar o painel.");
        setTimeout(() => {
          window.location.href = "login.html?pending_confirmation=true";
        }, 3000);
        return;
      }

      // Confirmação desativada → sessão imediata
      // O trigger já criou os registros, mas syncUserProfile garante integridade
      if (window.syncUserProfile) {
        await window.syncUserProfile(user, supabase);
      }

      showRegSuccess("Cadastro de Cartomante realizado com sucesso! Redirecionando...");
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1500);

    } catch (err) {
      console.error("[RegisterCartomante] Erro geral de cadastro:", err);
      showRegError("Ocorreu um erro inesperado. Tente novamente em instantes.");
      resetButton();
    }
  });
}

function translateRegError(msg) {
  if (!msg) return "Erro desconhecido.";
  const lower = msg.toLowerCase();
  if (lower.includes("user already registered") || lower.includes("already been registered"))
    return "Este e-mail já está cadastrado. Faça login ou recupere sua senha.";
  if (lower.includes("invalid email"))
    return "E-mail inválido. Verifique o endereço digitado.";
  if (lower.includes("password") && lower.includes("short"))
    return "A senha precisa ter no mínimo 6 caracteres.";
  if (lower.includes("email") && lower.includes("taken"))
    return "Este e-mail já está em uso. Tente outro endereço.";
  if (lower.includes("rate limit") || lower.includes("too many"))
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  if (lower.includes("network") || lower.includes("fetch"))
    return "Erro de conexão. Verifique sua internet.";
  return "Erro ao criar conta: " + msg;
}

function showRegError(msg) {
  let box = document.getElementById("regErrorBox");
  if (!box) {
    box = document.createElement("div");
    box.id = "regErrorBox";
    box.style.cssText = `
      display:flex; align-items:center; gap:10px;
      padding:12px 16px; border-radius:8px; margin-bottom:16px;
      background:rgba(220,38,38,0.12); border:1px solid rgba(220,38,38,0.35);
      color:#ff8888; font-size:0.875rem;
    `;
    const form = document.getElementById("registerCartomanteForm");
    if (form) form.insertAdjacentElement("beforebegin", box);
  }
  box.innerHTML = `<i class="fas fa-exclamation-circle"></i> <span>${msg}</span>`;
  box.style.display = "flex";
  box.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function showRegSuccess(msg) {
  let box = document.getElementById("regSuccessBox");
  if (!box) {
    box = document.createElement("div");
    box.id = "regSuccessBox";
    box.style.cssText = `
      display:flex; align-items:center; gap:10px;
      padding:12px 16px; border-radius:8px; margin-bottom:16px;
      background:rgba(34,197,94,0.12); border:1px solid rgba(34,197,94,0.35);
      color:#86efac; font-size:0.875rem;
    `;
    const form = document.getElementById("registerCartomanteForm");
    if (form) form.insertAdjacentElement("beforebegin", box);
  }
  box.innerHTML = `<i class="fas fa-check-circle"></i> <span>${msg}</span>`;
  box.style.display = "flex";
}

function hideRegError() {
  const box = document.getElementById("regErrorBox");
  if (box) box.style.display = "none";
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
    const { error } = await supabase.auth.getSession();
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
