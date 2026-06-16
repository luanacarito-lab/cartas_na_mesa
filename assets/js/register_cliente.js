// register_cliente.js - Cadastro de Consulentes (Clientes) no Supabase Auth e Banco
// ---------------------------------------------------------------------------------
const SUPABASE_URL = (window.ENV && window.ENV.SUPABASE_URL) || "https://YOUR_PROJECT_REF.supabase.co";
const SUPABASE_ANON_KEY = (window.ENV && window.ENV.SUPABASE_ANON_KEY) || "YOUR_PUBLIC_ANON_KEY";

// Initialize Supabase client
let supabase = null;
try {
  supabase = supabaseCreateClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) {
  console.warn("Erro ao inicializar Supabase no register_cliente.js", e);
}

// Helper to create Supabase client via CDN
function supabaseCreateClient(url, key) {
  if (typeof window.supabase !== "undefined") {
    return window.supabase.createClient(url, key);
  }
  return null;
}

const form = document.getElementById("registerClienteForm");
const registerBtn = document.getElementById("registerBtn");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    if (!supabase) {
      alert("Conexão com o Supabase indisponível.");
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

    // Campos adicionais
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

    if (registerBtn) {
      registerBtn.disabled = true;
      registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sintonizando Alma...';
    }

    try {
      // 1. Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: senha,
        options: {
          data: {
            nome_completo: nomeCompleto,
            role: "cliente"
          }
        }
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

      // 2. Criar registro correspondente na tabela 'clientes'
      const clientRecord = {
        user_id: user.id,
        nome_completo: nomeCompleto,
        email: email,
        celular: celular,
        data_nascimento: dataNascimento || null,
        religiao: religiao || null,
        sexo: sexo || null,
        pronome: pronome || null,
        estado_civil: estadoCivil || null,
        guia_espiritual: guiaEspiritual,
        pai_mae_cabeca: paiMaeCabeca,
        tradicao_espiritual: tradicaoEspiritual,
        foto_url: "assets/img/default-avatar.png"
      };

      const { data: clientData, error: dbError } = await supabase
        .from("clientes")
        .insert([clientRecord])
        .select()
        .maybeSingle();

      if (dbError) {
        console.error("Erro ao inserir na tabela clientes:", dbError);
        alert("Erro ao salvar perfil de consulente: " + dbError.message);
        resetButton();
        return;
      }

      const clientDbId = clientData ? clientData.id : null;
      const pendingIntentStr = sessionStorage.getItem("pending_intent");

      if (pendingIntentStr && clientDbId) {
        try {
          const intent = JSON.parse(pendingIntentStr);
          sessionStorage.removeItem("pending_intent");

          // Vincular cliente à cartomante
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

          alert("Cadastro de Consulente realizado com sucesso! Conectando com seu oraculista...");
          if (intent.action === "ask_baralho") {
            window.location.href = `client_chat.html?cid=${cid}&action=ask_baralho`;
          } else {
            window.location.href = `client_chat.html?cid=${cid}`;
          }
          return;
        } catch (err) {
          console.error("Erro ao resolver intenção pendente pós-registro:", err);
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

function resetButton() {
  if (registerBtn) {
    registerBtn.disabled = false;
    registerBtn.innerHTML = '<i class="fas fa-user-sparkles"></i> Firmar Cadastro & Entrar';
  }
}
