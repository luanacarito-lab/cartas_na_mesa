// register_cliente.js - Cadastro de Consulentes (Clientes) no Supabase Auth e Banco
// Usa window._supabaseClient (singleton criado em supabase-client.js)
// CORRIGIDO: mensagens de erro traduzidas, campos opcionais não bloqueiam, erros inline
// ---------------------------------------------------------------------------------

let registerBtn = null;

function initRegister() {
  const form = document.getElementById("registerClienteForm");
  registerBtn = document.getElementById("registerBtn");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideRegClienteError();

    const supabase = window._supabaseClient;
    if (!supabase) {
      showRegClienteError("Conexão com o servidor indisponível. Verifique sua internet e tente novamente.");
      return;
    }

    // Campos obrigatórios
    const nomeCompleto = document.getElementById("nome_completo").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const senha = document.getElementById("senha").value;
    const confirmaSenha = document.getElementById("confirma_senha").value;

    // Campos opcionais — sem required para não bloquear cadastro
    const celular = document.getElementById("celular")?.value.trim() || "";
    const dataNascimento = document.getElementById("data_nascimento")?.value || null;
    const religiao = document.getElementById("religiao")?.value || null;
    const sexo = document.getElementById("sexo")?.value || null;
    const pronome = document.getElementById("pronome")?.value.trim() || null;
    const estadoCivil = document.getElementById("estado_civil")?.value.trim() || null;
    const guiaEspiritual = document.getElementById("guia_espiritual")?.value.trim() || null;
    const paiMaeCabeca = document.getElementById("pai_mae_cabeca")?.value.trim() || null;
    const tradicaoEspiritual = document.getElementById("tradicao_espiritual")?.value.trim() || null;

    // Validações com mensagens claras
    if (!nomeCompleto) {
      showRegClienteError("Preencha seu nome completo.");
      return;
    }

    if (!email) {
      showRegClienteError("Preencha seu e-mail.");
      return;
    }

    if (senha.length < 6) {
      showRegClienteError("A senha precisa ter no mínimo 6 caracteres.");
      return;
    }

    if (senha !== confirmaSenha) {
      showRegClienteError("As senhas não conferem. Digite novamente.");
      return;
    }

    setLoading(true, '<i class="fas fa-spinner fa-spin"></i> Sintonizando Alma...');

    try {
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
        showRegClienteError("Erro ao criar conta. Tente novamente.");
        resetButton();
        return;
      }

      // Confirmação de e-mail ativa → sessão nula
      if (!authData.session) {
        showRegClienteSuccess("Cadastro realizado! Verifique seu e-mail e clique no link de ativação para acessar o portal.");
        setTimeout(() => {
          window.location.href = "login.html?pending_confirmation=true";
        }, 3000);
        return;
      }

      // Confirmação desativada → sessão imediata
      // O trigger já criou os registros. syncUserProfile garante integridade.
      if (window.syncUserProfile) {
        await window.syncUserProfile(user, supabase);
      }

      // Verificar intenção pendente (vindo de perfil público de cartomante)
      const { data: clientData } = await supabase
        .from("clientes")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      const clientDbId = clientData?.id;
      const pendingIntentStr = sessionStorage.getItem("pending_intent");

      if (pendingIntentStr && clientDbId) {
        try {
          const intent = JSON.parse(pendingIntentStr);
          sessionStorage.removeItem("pending_intent");

          await supabase.from("cartomante_clientes").insert({
            cartomante_id: intent.cartomante_id,
            cliente_id: clientDbId,
            status: "ativo",
          }).select().maybeSingle();

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
              .select()
              .single();
            cid = newConv?.id;
          }

          showRegClienteSuccess("Cadastro realizado! Conectando com seu oraculista...");
          const suffix = intent.action === "ask_baralho" ? `&action=ask_baralho` : "";
          setTimeout(() => {
            window.location.href = `client_chat.html?cid=${cid}${suffix}`;
          }, 1500);
          return;
        } catch (err) {
          console.error("[RegisterCliente] Erro ao resolver intenção pendente:", err);
        }
      }

      showRegClienteSuccess("Cadastro realizado com sucesso! Bem-vinda ao portal.");
      setTimeout(() => {
        window.location.href = "client_area.html";
      }, 1500);

    } catch (err) {
      console.error("[RegisterCliente] Erro geral de cadastro:", err);
      showRegClienteError("Ocorreu um erro inesperado. Tente novamente em instantes.");
      resetButton();
    }
  });
}

function translateRegClienteError(msg) {
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

function showRegClienteError(msg) {
  let box = document.getElementById("regClienteErrorBox");
  if (!box) {
    box = document.createElement("div");
    box.id = "regClienteErrorBox";
    box.style.cssText = `
      display:flex; align-items:center; gap:10px;
      padding:12px 16px; border-radius:8px; margin-bottom:16px;
      background:rgba(220,38,38,0.12); border:1px solid rgba(220,38,38,0.35);
      color:#ff8888; font-size:0.875rem;
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
      display:flex; align-items:center; gap:10px;
      padding:12px 16px; border-radius:8px; margin-bottom:16px;
      background:rgba(34,197,94,0.12); border:1px solid rgba(34,197,94,0.35);
      color:#86efac; font-size:0.875rem;
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

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initRegister);
} else {
  initRegister();
}
