// assets/js/completar-perfil.js - Lógica de preenchimento de ficha espiritual inicial
// ---------------------------------------------------------------------------------

const SUPABASE_URL = (window.ENV && window.ENV.SUPABASE_URL) || "";
const SUPABASE_ANON_KEY = (window.ENV && window.ENV.SUPABASE_ANON_KEY) || "";

let supabase = null;
if (typeof window.supabase !== "undefined" && SUPABASE_URL) {
  try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.warn("Erro ao inicializar Supabase no completar-perfil.js", e);
  }
}

const form = document.getElementById("completarPerfilForm");
const saveBtn = document.getElementById("saveProfileBtn");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!supabase) {
      alert("Conexão com o Supabase indisponível.");
      return;
    }

    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sintonizando Alma...';
    }

    try {
      // 1. Obter usuário logado no Auth
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        alert("Nenhum usuário autenticado encontrado. Redirecionando para login.");
        window.location.href = "login.html";
        return;
      }

      const tipoConta = document.getElementById("tipo_conta").value;
      const nomeCompleto = document.getElementById("nome_completo").value.trim();
      const telefone = document.getElementById("telefone").value.trim();
      const fotoUrl = document.getElementById("foto_url").value.trim() || "assets/img/default-avatar.png";

      // 2. Inserir ou atualizar na tabela 'profiles'
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          user_id: user.id,
          nome: nomeCompleto,
          email: user.email,
          tipo_conta: tipoConta,
          telefone: telefone,
          avatar_url: fotoUrl,
          status: "ativo"
        })
        .select()
        .maybeSingle();

      if (profileError) {
        console.error("Erro ao criar perfil em profiles:", profileError);
        alert("Erro ao criar identidade de perfil: " + profileError.message);
        resetButton();
        return;
      }

      // 3. Criar registros filhos conforme o tipo
      if (tipoConta === "cliente") {
        const dataNascimento = document.getElementById("data_nascimento").value;
        const religiao = document.getElementById("religiao").value;

        const { error: clienteError } = await supabase
          .from("clientes")
          .insert({
            user_id: user.id,
            nome_completo: nomeCompleto,
            email: user.email,
            celular: telefone,
            data_nascimento: dataNascimento || null,
            religiao: religiao || null,
            foto_url: fotoUrl
          });

        if (clienteError) {
          console.error("Erro ao criar registro em clientes:", clienteError);
        }

        // Atualizar metadados no Supabase Auth para consistência
        await supabase.auth.updateUser({
          data: {
            nome_completo: nomeCompleto,
            role: "cliente"
          }
        });

        alert("Seu perfil de Consulente foi sintonizado com sucesso!");
        window.location.href = "client_area.html";

      } else if (tipoConta === "cartomante") {
        const nomeProfissional = document.getElementById("nome_profissional").value.trim();
        const funcao = document.getElementById("funcao").value;
        const bio = document.getElementById("bio").value.trim() || "Oraculista sintonizada.";
        const specsInput = document.getElementById("especialidades").value.trim();
        const especialidades = specsInput.split(",").map(s => s.trim()).filter(s => s.length > 0);
        const categorias = Array.from(document.querySelectorAll('input[name="categorias"]:checked')).map(cb => cb.value);

        if (categorias.length === 0) {
          alert("Por favor, selecione ao menos uma categoria de atendimento.");
          resetButton();
          return;
        }

        // Inserir em 'cartomantes'
        const { error: cartomanteError } = await supabase
          .from("cartomantes")
          .insert({
            user_id: user.id,
            nome: nomeProfissional,
            email: user.email,
            telefone: telefone,
            funcao: funcao,
            bio: bio,
            foto_url: fotoUrl,
            banner_url: "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?w=1200&auto=format&fit=crop"
          });

        if (cartomanteError) {
          console.error("Erro ao criar registro na tabela cartomantes:", cartomanteError);
        }

        // Gerar slug do perfil público
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const slug = nomeProfissional
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "") + "-" + randomSuffix;

        // Inserir em 'perfis_publicos'
        const { error: perfilError } = await supabase
          .from("perfis_publicos")
          .insert({
            cartomante_id: user.id,
            slug: slug,
            foto_url: fotoUrl,
            banner_url: "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?w=1200&auto=format&fit=crop",
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

        // Inserir em 'configuracoes_chat'
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

        // Atualizar metadados no Supabase Auth para consistência
        await supabase.auth.updateUser({
          data: {
            nome_completo: nomeCompleto,
            nome_profissional: nomeProfissional,
            role: "cartomante"
          }
        });

        alert("Seu perfil de Oraculista foi ativado e sintonizado com sucesso!");
        window.location.href = "dashboard.html";
      }

    } catch (err) {
      console.error("Erro geral de preenchimento de perfil:", err);
      alert("Erro ao processar as informações cadastrais.");
      resetButton();
    }
  });
}

function resetButton() {
  if (saveBtn) {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fas fa-magic"></i> Firmar Pacto & Salvar Perfil';
  }
}
