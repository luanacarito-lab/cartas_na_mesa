// register_cliente.js - Cadastro de Consulentes (Clientes) no Supabase Auth e Banco
// Usa window._supabaseClient (singleton criado em supabase-client.js)
// ---------------------------------------------------------------------------------

let registerBtn = null;

function initRegister() {
  const form = document.getElementById("registerClienteForm");
  registerBtn = document.getElementById("registerBtn");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const supabase = window._supabaseClient;
    if (!supabase) {
      alert("Conexão com o Supabase indisponível. Verifique sua internet e tente novamente.");
      return;
    }

    const nomeCompleto = document.getElementById("nome_completo").value.trim();
    const email = document.getElementById("email").value.trim();
    const celular = document.getElementById("celular").value.trim();
    const senha = document.getElementById("senha").value;
    const confirmaSenha = document.getElementById("confirma_senha").value;
    const dataNascimento = document.getElementById("data_nascimento").value;
    const religiao = document.getElementById("religiao").value;
    const sexo = document.getElementById("sexo").value;
    const pronome = document.getElementById("pronome").value.trim();
    const estadoCivil = document.getElementById("estado_civil").value.trim();
    const guiaEspiritual = document.getElementById("guia_espiritual").value.trim() || null;
    const paiMaeCabeca = document.getElementById("pai_mae_cabeca").value.trim() || null;
    const tradicaoEspiritual = document.getElementById("tradicao_espiritual").value.trim() || null;

    if (senha !== confirmaSenha) {
      alert("As chaves secretas (senhas) não são idênticas.");
      return;
    }

    if (senha.length < 6) {
      alert("A senha precisa ter no mínimo 6 caracteres.");
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
            data_nascimento: dataNascimento || null,
            religiao: religiao || null,
            sexo: sexo || null,
            pronome: pronome || null,
            estado_civil: estadoCivil || null,
            guia_espiritual: guiaEspiritual,
            pai_mae_cabeca: paiMaeCabeca,
            tradicao_espiritual: tradicaoEspiritual,
          },
        },
      });

      if (authError) {
        alert("Erro ao criar usuário: " + authError.message);
        resetButton();
        return;
      }

      const user = authData.user;
      if (!user) {
        alert("Erro ao recuperar os dados do Consulente.");
        resetButton();
        return;
      }

      // Confirmação de e-mail ativa → sessão nula
      if (!authData.session) {
        alert(
          "Cadastro de Consulente realizado! Enviamos um e-mail de ativação para o seu endereço. Por favor, confirme seu e-mail para acessar o portal."
        );
        window.location.href = "login.html?pending_confirmation=true";
        return;
      }

      // Confirmação desativada → sessão imediata
      if (window.syncUserProfile) {
        await window.syncUserProfile(user, supabase);
      }

      // Verificar intenção pendente
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

          alert("Cadastro de Consulente realizado com sucesso! Conectando com seu oraculista...");
          const suffix = intent.action === "ask_baralho" ? `&action=ask_baralho` : "";
          window.location.href = `client_chat.html?cid=${cid}${suffix}`;
          return;
        } catch (err) {
          console.error("Erro ao resolver intenção pendente:", err);
        }
      }

      alert("Cadastro de Consulente realizado com sucesso!");
      window.location.href = "client_area.html";
    } catch (err) {
      console.error("Erro geral de cadastro:", err);
      alert("Ocorreu um erro ao processar o cadastro.");
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
  setLoading(false, '<i class="fas fa-user-sparkles"></i> Firmar Cadastro & Entrar');
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initRegister);
} else {
  initRegister();
}
