// register_cliente.js - Cadastro de Consulentes (Clientes) no Supabase Auth e Banco
// Usa o cliente centralizado window.supabaseClient

let registerBtn = null;

function initRegister() {
  const form = document.getElementById("registerClienteForm");
  registerBtn = document.getElementById("registerBtn");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideRegClienteError();

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
      showRegClienteError("Não foi possível iniciar o serviço de autenticação. Tente novamente em instantes.");
      resetButton();
      return;
    }

    // Campos obrigatórios do formulário
    const nomeCompleto = document.getElementById("nome_completo").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const senha = document.getElementById("senha").value;
    const confirmaSenha = document.getElementById("confirma_senha").value;

    // Campos opcionais
    const celular = document.getElementById("celular")?.value.trim() || "";
    const dataNascimento = document.getElementById("data_nascimento")?.value || null;
    const religiao = document.getElementById("religiao")?.value || null;
    const sexo = document.getElementById("sexo")?.value || null;
    const pronome = document.getElementById("pronome")?.value.trim() || null;
    const estadoCivil = document.getElementById("estado_civil")?.value.trim() || null;
    const guiaEspiritual = document.getElementById("guia_espiritual")?.value.trim() || null;
    const paiMaeCabeca = document.getElementById("pai_mae_cabeca")?.value.trim() || null;
    const tradicaoEspiritual = document.getElementById("tradicao_espiritual")?.value.trim() || null;

    // Validações no frontend
    if (!nomeCompleto) {
      showRegClienteError("Por favor, informe seu nome completo.");
      return;
    }

    if (!email) {
      showRegClienteError("Por favor, preencha seu e-mail.");
      return;
    }

    if (senha.length < 6) {
      showRegClienteError("Sua chave mística (senha) deve conter ao menos 6 caracteres.");
      return;
    }

    if (senha !== confirmaSenha) {
      showRegClienteError("As chaves secretas não conferem. Digite novamente.");
      return;
    }

    setLoading(true, '<i class="fas fa-spinner fa-spin"></i> Sintonizando Alma...');

    try {
      // 1. Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: senha,
        options: {
          data: {
            nome_completo: nomeCompleto,
            role: "cliente",
            celular: celular,
            data_nascimento: dataNascimento,
            religiao: religiao,
            sexo: sexo,
            pronome: pronome,
            estado_civil: estadoCivil,
            guia_espiritual: guiaEspiritual,
            pai_mae_cabeca: paiMaeCabeca,
            tradicao_espiritual: tradicaoEspiritual,
          },
        },
      });

      if (authError) {
        showRegClienteError(translateRegClienteError(authError.message));
        resetButton();
        return;
      }

      const user = authData.user;
      if (!user) {
        showRegClienteError("Falha na criação do usuário. Tente novamente.");
        resetButton();
        return;
      }

      // 2. Tratar confirmação de e-mail ativa
      if (!authData.session) {
        showRegClienteSuccess("Cadastro realizado com sucesso! Verifique seu e-mail para confirmar o acesso.");
        setTimeout(() => {
          window.location.href = "login.html?pending_confirmation=true";
        }, 4000);
        return;
      }

      // 3. Verificar se as tabelas de aplicação foram populadas de fato pela trigger do banco
      try {
        await new Promise(r => setTimeout(r, 500)); // Pequena pausa para a trigger processar

        const { data: profile, error: profErr } = await supabase
          .from("profiles")
          .select("tipo_conta")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profErr || !profile) {
          console.warn("[RegisterCliente] Profile não encontrado via trigger. Sincronizando manualmente...");
          if (window.syncUserProfile) {
            await window.syncUserProfile(user, supabase);
          } else {
            await supabase.from("profiles").upsert({
              user_id: user.id,
              nome: nomeCompleto,
              email: email,
              tipo_conta: "cliente",
              telefone: celular,
              status: "ativo"
            }, { onConflict: "user_id" });

            await supabase.from("clientes").upsert({
              user_id: user.id,
              nome_completo: nomeCompleto,
              email: email,
              celular: celular,
              data_nascimento: dataNascimento,
              religiao: religiao,
              sexo: sexo,
              pronome: pronome,
              estado_civil: estadoCivil,
              guia_espiritual: guiaEspiritual,
              pai_mae_cabeca: paiMaeCabeca,
              tradicao_espiritual: tradicaoEspiritual,
              foto_url: "assets/img/default-avatar.png"
            }, { onConflict: "user_id" });
          }
        } else {
          // A trigger criou com sucesso! Fazemos um UPDATE das colunas adicionais do formulário
          await supabase
            .from("clientes")
            .update({
              data_nascimento: dataNascimento,
              religiao: religiao,
              sexo: sexo,
              pronome: pronome,
              estado_civil: estadoCivil,
              guia_espiritual: guiaEspiritual,
              pai_mae_cabeca: paiMaeCabeca,
              tradicao_espiritual: tradicaoEspiritual
            })
            .eq("user_id", user.id);
        }
      } catch (profileError) {
        console.error("[RegisterCliente] Falha ao criar ou validar perfil:", profileError);
        showRegClienteError("Sua conta foi criada, mas houve falha ao sincronizar o perfil. Faça login para continuar.");
        resetButton();
        return;
      }

      showRegClienteSuccess("Cadastro de Consulente realizado com sucesso! Entrando...");
      setTimeout(() => {
        window.location.href = "client_area.html";
      }, 1500);

    } catch (err) {
      console.error("[RegisterCliente] Erro crítico no cadastro:", err);
      showRegClienteError("Ocorreu um erro inesperado ao processar o cadastro no Supabase.");
      resetButton();
    }
  });
}

function translateRegClienteError(msg) {
  if (!msg) return "Erro de comunicação com o Supabase.";
  const lower = msg.toLowerCase();
  if (lower.includes("user already registered") || lower.includes("already been registered"))
    return "Este e-mail já possui conta. Faça login ou recupere sua senha.";
  if (lower.includes("invalid email") || lower.includes("email address"))
    return "E-mail inválido. Verifique o endereço digitado.";
  if (lower.includes("password") && (lower.includes("short") || lower.includes("weak")))
    return "A senha precisa ter no mínimo 6 caracteres.";
  if (lower.includes("email") && lower.includes("taken"))
    return "Este e-mail já está em uso por outro consulente.";
  if (lower.includes("rate limit") || lower.includes("too many"))
    return "Muitas tentativas em pouco tempo. Aguarde alguns minutos antes de tentar novamente.";
  if (lower.includes("network") || lower.includes("fetch"))
    return "Falha de conexão de rede. Verifique seu sinal de internet.";
  return "Erro no Supabase: " + msg;
}

function showRegClienteError(msg) {
  let box = document.getElementById("regClienteErrorBox");
  if (!box) {
    box = document.createElement("div");
    box.id = "regClienteErrorBox";
    box.style.cssText = `
      display: flex; align-items: center; gap: 10px;
      padding: 12px 16px; border-radius: 8px; margin-bottom: 16px;
      background: rgba(220, 38, 38, 0.12); border: 1px solid rgba(220, 38, 38, 0.35);
      color: #ff8888; font-size: 0.875rem; font-family: var(--font-modern);
    `;
    const form = document.getElementById("registerClienteForm");
    if (form) form.insertAdjacentElement("beforebegin", box);
  }
  box.innerHTML = `<i class="fas fa-exclamation-circle"></i> <span>${msg}</span>`;
  box.style.display = "flex";
  box.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function showRegClienteSuccess(msg) {
  let box = document.getElementById("regClienteSuccessBox");
  if (!box) {
    box = document.createElement("div");
    box.id = "regClienteSuccessBox";
    box.style.cssText = `
      display: flex; align-items: center; gap: 10px;
      padding: 12px 16px; border-radius: 8px; margin-bottom: 16px;
      background: rgba(34, 197, 94, 0.12); border: 1px solid rgba(34, 197, 94, 0.35);
      color: #86efac; font-size: 0.875rem; font-family: var(--font-modern);
    `;
    const form = document.getElementById("registerClienteForm");
    if (form) form.insertAdjacentElement("beforebegin", box);
  }
  box.innerHTML = `<i class="fas fa-check-circle"></i> <span>${msg}</span>`;
  box.style.display = "flex";
}

function hideRegClienteError() {
  const box = document.getElementById("regClienteErrorBox");
  if (box) box.style.display = "none";
}

function setLoading(loading, html) {
  if (!registerBtn) return;
  registerBtn.disabled = loading;
  if (html) registerBtn.innerHTML = html;
}

function resetButton() {
  setLoading(false, '<i class="fas fa-user-sparkles"></i> Firmar Cadastro & Entrar');
}

// Inicialização
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initRegister);
} else {
  initRegister();
}
