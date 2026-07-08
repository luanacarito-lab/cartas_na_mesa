// register_cartomante.js - Cadastro de Cartomantes no Supabase Auth e Tabelas
// Usa o cliente centralizado window.supabaseClient

let registerBtn = null;

function initRegister() {
  const form = document.getElementById("registerCartomanteForm");
  registerBtn = document.getElementById("registerBtn");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideRegError();

    let supabase = window.supabaseClient;

    if (!supabase) {
      setButtonLoading("Conectando ao plano espiritual...");
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 100));
        supabase = window.supabaseClient;
        if (supabase) break;
      }
    }

    if (!supabase) {
      showRegError("Não foi possível iniciar o serviço de autenticação. Tente novamente em instantes.");
      resetButton();
      return;
    }

    // Coleta dos dados do formulário
    const nomeCompleto = document.getElementById("nome_completo").value.trim();
    const nomeProfissional = document.getElementById("nome_profissional").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const telefone = document.getElementById("telefone").value.trim();
    const senha = document.getElementById("senha").value;
    const confirmaSenha = document.getElementById("confirma_senha").value;
    const funcao = document.getElementById("funcao").value;
    const fotoUrl = document.getElementById("foto_url").value.trim() || "assets/img/default-avatar.png";
    const bannerUrl = document.getElementById("banner_url").value.trim() || "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?w=1200&auto=format&fit=crop";
    const bio = document.getElementById("bio").value.trim() || "Nova oraculista sintonizada.";

    const specsInput = document.getElementById("especialidades").value.trim();
    const especialidades = specsInput
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const categorias = Array.from(
      document.querySelectorAll('input[name="categorias"]:checked')
    ).map((cb) => cb.value);

    // Validações no frontend com mensagens claras
    if (!nomeCompleto) {
      showRegError("Por favor, preencha seu nome completo.");
      return;
    }

    if (!nomeProfissional) {
      showRegError("Por favor, preencha seu nome profissional.");
      return;
    }

    if (!email) {
      showRegError("Por favor, preencha seu e-mail.");
      return;
    }

    if (senha.length < 6) {
      showRegError("Sua chave mística (senha) deve conter ao menos 6 caracteres.");
      return;
    }

    if (senha !== confirmaSenha) {
      showRegError("As chaves secretas não conferem. Digite novamente.");
      return;
    }

    if (!funcao) {
      showRegError("Por favor, selecione seu oráculo principal (função).");
      return;
    }

    if (categorias.length === 0) {
      showRegError("Por favor, selecione ao menos uma categoria de atendimento.");
      return;
    }

    setLoading(true, '<i class="fas fa-spinner fa-spin"></i> Canalizando Energias...');

    try {
      // 1. Criar usuário no Supabase Auth
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

      // 2. Tratar confirmação de e-mail ativa
      if (!authData.session) {
        showRegSuccess("Cadastro realizado com sucesso! Verifique seu e-mail para confirmar o acesso.");
        setTimeout(() => {
          window.location.href = "login.html?pending_confirmation=true";
        }, 4000);
        return;
      }

      // 3. Sincronizar perfis no banco de dados real
      try {
        await new Promise(r => setTimeout(r, 500)); // Pequena pausa para a trigger processar

        const { data: profile, error: profErr } = await supabase
          .from("profiles")
          .select("tipo_conta")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profErr || !profile) {
          console.warn("[RegisterCartomante] Profile não encontrado via trigger. Sincronizando manualmente...");
          if (window.syncUserProfile) {
            await window.syncUserProfile(user, supabase);
          } else {
            await supabase.from("profiles").upsert({
              user_id: user.id,
              nome: nomeProfissional,
              email: email,
              tipo_conta: "cartomante",
              telefone: telefone,
              status: "ativo"
            }, { onConflict: "user_id" });

            await supabase.from("cartomantes").upsert({
              user_id: user.id,
              nome: nomeProfissional,
              email: email,
              telefone: telefone,
              funcao: funcao,
              bio: bio,
              foto_url: fotoUrl,
              banner_url: bannerUrl
            }, { onConflict: "user_id" });
          }
        } else {
          // A trigger criou com sucesso! Fazemos um UPDATE das colunas opcionais adicionais do formulário
          await supabase
            .from("cartomantes")
            .update({
              telefone: telefone,
              funcao: funcao,
              bio: bio,
              foto_url: fotoUrl,
              banner_url: bannerUrl
            })
            .eq("user_id", user.id);
        }
      } catch (profileError) {
        console.error("[RegisterCartomante] Falha ao criar ou validar perfil:", profileError);
        showRegError("Sua conta foi criada, mas houve falha ao sincronizar o perfil. Faça login para continuar.");
        resetButton();
        return;
      }

      showRegSuccess("Cadastro de Cartomante realizado com sucesso! Entrando...");
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1500);

    } catch (err) {
      console.error("[RegisterCartomante] Erro crítico no cadastro:", err);
      showRegError("Ocorreu um erro inesperado ao processar o cadastro no Supabase.");
      resetButton();
    }
  });
}

function translateRegError(msg) {
  if (!msg) return "Erro de comunicação com o Supabase.";
  const lower = msg.toLowerCase();
  if (lower.includes("user already registered") || lower.includes("already been registered"))
    return "Este e-mail já possui conta. Faça login ou recupere sua senha.";
  if (lower.includes("invalid email") || lower.includes("email address"))
    return "E-mail inválido. Verifique o endereço digitado.";
  if (lower.includes("password") && (lower.includes("short") || lower.includes("weak")))
    return "A senha precisa ter no mínimo 6 caracteres.";
  if (lower.includes("email") && lower.includes("taken"))
    return "Este e-mail já está em uso por outro oraculista.";
  if (lower.includes("rate limit") || lower.includes("too many"))
    return "Muitas tentativas em pouco tempo. Aguarde alguns minutos antes de tentar novamente.";
  if (lower.includes("network") || lower.includes("fetch"))
    return "Falha de conexão de rede. Verifique seu sinal de internet.";
  return "Erro no Supabase: " + msg;
}

function showRegError(msg) {
  let box = document.getElementById("regErrorBox");
  if (!box) {
    box = document.createElement("div");
    box.id = "regErrorBox";
    box.style.cssText = `
      display: flex; align-items: center; gap: 10px;
      padding: 12px 16px; border-radius: 8px; margin-bottom: 16px;
      background: rgba(220, 38, 38, 0.12); border: 1px solid rgba(220, 38, 38, 0.35);
      color: #ff8888; font-size: 0.875rem; font-family: var(--font-modern);
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
      display: flex; align-items: center; gap: 10px;
      padding: 12px 16px; border-radius: 8px; margin-bottom: 16px;
      background: rgba(34, 197, 94, 0.12); border: 1px solid rgba(34, 197, 94, 0.35);
      color: #86efac; font-size: 0.875rem; font-family: var(--font-modern);
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

// Inicialização
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initRegister);
} else {
  initRegister();
}
