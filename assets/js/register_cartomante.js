// register_cartomante.js - Cadastro de Cartomantes e Inicialização de Perfil/Configurações
// ---------------------------------------------------------------------------------
const SUPABASE_URL = (window.ENV && window.ENV.SUPABASE_URL) || "https://YOUR_PROJECT_REF.supabase.co";
const SUPABASE_ANON_KEY = (window.ENV && window.ENV.SUPABASE_ANON_KEY) || "YOUR_PUBLIC_ANON_KEY";

// Initialize Supabase client
let supabase = null;
try {
  supabase = supabaseCreateClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) {
  console.warn("Erro ao inicializar Supabase no register_cartomante.js", e);
}

// Helper to create Supabase client via CDN
function supabaseCreateClient(url, key) {
  if (typeof window.supabase !== "undefined") {
    return window.supabase.createClient(url, key);
  }
  return null;
}

const form = document.getElementById("registerCartomanteForm");
const registerBtn = document.getElementById("registerBtn");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    if (!supabase) {
      alert("Conexão com o Supabase indisponível.");
      return;
    }

    const nomeCompleto = document.getElementById("nome_completo").value.trim();
    const nomeProfissional = document.getElementById("nome_profissional").value.trim();
    const email = document.getElementById("email").value.trim();
    const telefone = document.getElementById("telefone").value.trim();
    const senha = document.getElementById("senha").value;
    const confirmaSenha = document.getElementById("confirma_senha").value;
    const funcao = document.getElementById("funcao").value;
    const fotoUrl = document.getElementById("foto_url").value.trim() || "assets/img/default-avatar.png";
    const bannerUrl = document.getElementById("banner_url").value.trim() || "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?w=1200&auto=format&fit=crop";
    const bio = document.getElementById("bio").value.trim() || "Nova oraculista sintonizada.";

    // Coleta de especialidades e categorias
    const specsInput = document.getElementById("especialidades").value.trim();
    const especialidades = specsInput.split(",").map(s => s.trim()).filter(s => s.length > 0);
    
    const categorias = Array.from(document.querySelectorAll('input[name="categorias"]:checked')).map(cb => cb.value);

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

    if (registerBtn) {
      registerBtn.disabled = true;
      registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Canalizando Energias...';
    }

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
            role: "cartomante"
          }
        }
      });

      if (authError) {
        alert("Erro no cadastro Auth: " + authError.message);
        resetButton();
        return;
      }

      const user = authData.user;
      if (!user) {
        alert("Ocorreu um erro ao recuperar o usuário criado.");
        resetButton();
        return;
      }

      // 2. Criar registro na tabela 'cartomantes'
      const { error: cartomanteError } = await supabase
        .from("cartomantes")
        .insert({
          user_id: user.id,
          nome: nomeProfissional, // Usamos o nome artístico/profissional como nome de exibição principal
          email: email,
          telefone: telefone,
          funcao: funcao,
          bio: bio,
          foto_url: fotoUrl,
          banner_url: bannerUrl
        });

      if (cartomanteError) {
        console.error("Erro ao criar registro na tabela cartomantes:", cartomanteError);
      }

      // Gerar slug simples para o perfil
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const slug = nomeProfissional
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "") + "-" + randomSuffix;

      // 3. Criar Perfil Público
      // Guardamos categorias no JSONB redes_sociais para flexibilidade sem alterar o schema do BD
      const { error: perfilError } = await supabase
        .from("perfis_publicos")
        .insert({
          cartomante_id: user.id,
          slug: slug,
          foto_url: fotoUrl,
          banner_url: bannerUrl,
          bio: bio,
          especialidades: especialidades,
          certificados: [],
          redes_sociais: {
            instagram: "",
            categorias: categorias
          },
          idiomas: ["Português"],
          modalidade: "online",
          cor_primaria: "#C7A27A",
          cor_secundaria: "#6E5AAB",
          publicado: true
        });

      if (perfilError) {
        console.error("Erro ao criar perfil público:", perfilError);
      }

      // 4. Criar Configurações de Chat Padrão
      const { error: configError } = await supabase
        .from("configuracoes_chat")
        .insert({
          cartomante_id: user.id,
          limite_diario: 50,
          limite_por_cliente: 10,
          horario_inicio: "09:00:00",
          horario_fim: "21:00:00",
          pausa_automatica: false,
          modo_esgotamento: false,
          mensagem_esgotamento: "Os atendimentos estão funcionando em ritmo reduzido no momento para manter a qualidade e cuidado emocional.",
          max_atendimentos_diarios: 10,
          max_perguntas_diarias: 5,
          tempo_minimo_entre_clientes: 15,
          horarios_descanso: []
        });

      if (configError) {
        console.error("Erro ao criar configurações de chat:", configError);
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

function resetButton() {
  if (registerBtn) {
    registerBtn.disabled = false;
    registerBtn.innerHTML = '<i class="fas fa-magic"></i> Despertar Perfil & Registrar';
  }
}
