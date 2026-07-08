// assets/js/completar-perfil.js - Lógica de preenchimento de ficha espiritual inicial
// CORRIGIDO: usa window.supabaseClient (singleton) em vez de criar nova instância
// ---------------------------------------------------------------------------------

const form = document.getElementById("completarPerfilForm");
const saveBtn = document.getElementById("saveProfileBtn");

// Aguarda o cliente Supabase estar disponível (máx 4s)
function waitForSupabaseCP(maxMs) {
  return new Promise((resolve) => {
    if (window.supabaseClient) { resolve(window.supabaseClient); return; }
    const start = Date.now();
    const check = setInterval(() => {
      if (window.supabaseClient || Date.now() - start > maxMs) {
        clearInterval(check);
        resolve(window.supabaseClient || null);
      }
    }, 80);
  });
}

function showCPError(msg) {
  let box = document.getElementById("cpErrorBox");
  if (!box) {
    box = document.createElement("div");
    box.id = "cpErrorBox";
    box.style.cssText = `
      display:flex; align-items:center; gap:10px;
      padding:12px 16px; border-radius:8px; margin-bottom:16px;
      background:rgba(220,38,38,0.12); border:1px solid rgba(220,38,38,0.35);
      color:#ff8888; font-size:0.875rem;
    `;
    if (form) form.insertAdjacentElement("beforebegin", box);
  }
  box.innerHTML = `<i class="fas fa-exclamation-circle"></i> <span>${msg}</span>`;
  box.style.display = "flex";
}

function hideCPError() {
  const box = document.getElementById("cpErrorBox");
  if (box) box.style.display = "none";
}

function translateCPError(msg) {
  if (!msg) return "Erro desconhecido.";
  if (msg.includes("duplicate key") || msg.includes("already exists") || msg.includes("unique"))
    return "Já existe um perfil cadastrado com esses dados.";
  if (msg.includes("violates foreign key"))
    return "Usuário não encontrado no sistema de autenticação.";
  if (msg.includes("not null"))
    return "Preencha todos os campos obrigatórios.";
  if (msg.includes("permission denied") || msg.includes("RLS"))
    return "Sem permissão para salvar o perfil. Tente sair e entrar novamente.";
  return msg;
}

function resetCPButton() {
  if (saveBtn) {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fas fa-magic"></i> Firmar Pacto & Salvar Perfil';
  }
}

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideCPError();

    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sintonizando Alma...';
    }

    // Usar o singleton — NÃO criar nova instância
    const supabase = await waitForSupabaseCP(4000);

    if (!supabase) {
      showCPError("Conexão com o servidor indisponível. Verifique sua internet e tente novamente.");
      resetCPButton();
      return;
    }

    try {
      // 1. Obter usuário logado no Auth via singleton
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        showCPError("Nenhum usuário autenticado encontrado. Redirecionando para login...");
        setTimeout(() => { window.location.href = "login.html"; }, 2000);
        return;
      }

      const tipoConta = document.getElementById("tipo_conta")?.value;
      const nomeCompleto = document.getElementById("nome_completo")?.value.trim();
      const telefone = document.getElementById("telefone")?.value.trim() || "";
      const fotoUrl = document.getElementById("foto_url")?.value.trim() || "assets/img/default-avatar.png";

      if (!tipoConta) {
        showCPError("Selecione o tipo de conta: Cliente ou Cartomante.");
        resetCPButton();
        return;
      }

      if (!nomeCompleto) {
        showCPError("Preencha seu nome completo.");
        resetCPButton();
        return;
      }

      // 2. Upsert na tabela 'profiles' (insert ou update se já existir)
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          user_id: user.id,
          nome: nomeCompleto,
          email: user.email,
          tipo_conta: tipoConta,
          telefone: telefone,
          avatar_url: fotoUrl,
          status: "ativo",
          atualizado_em: new Date().toISOString()
        }, { onConflict: "user_id" });

      if (profileError) {
        console.error("[CompletarPerfil] Erro ao salvar perfil:", profileError);
        showCPError("Erro ao salvar perfil: " + translateCPError(profileError.message));
        resetCPButton();
        return;
      }

      // 3. Criar registros específicos por tipo de conta
      if (tipoConta === "cliente") {
        const dataNascimento = document.getElementById("data_nascimento")?.value || null;
        const religiao = document.getElementById("religiao")?.value || null;

        const { data: existingClient, error: getCliErr } = await supabase
          .from("clientes")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (getCliErr) console.error("[CompletarPerfil] Erro ao buscar cliente:", getCliErr);

        let clienteError = null;
        if (existingClient) {
          const { error: updErr } = await supabase
            .from("clientes")
            .update({
              nome_completo: nomeCompleto,
              email: user.email,
              celular: telefone,
              data_nascimento: dataNascimento || null,
              religiao: religiao || null,
              foto_url: fotoUrl
            })
            .eq("id", existingClient.id);
          clienteError = updErr;
        } else {
          const { error: insErr } = await supabase
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
          clienteError = insErr;
        }

        if (clienteError) {
          console.error("[CompletarPerfil] Erro ao criar registro em clientes:", clienteError);
        }

        // Atualizar metadados no Auth
        await supabase.auth.updateUser({
          data: { nome_completo: nomeCompleto, role: "cliente" }
        });

        window.location.href = "client_area.html";

      } else if (tipoConta === "cartomante") {
        const nomeProfissional = document.getElementById("nome_profissional")?.value.trim() || nomeCompleto;
        const funcao = document.getElementById("funcao")?.value || "Cartomante";
        const bio = document.getElementById("bio")?.value.trim() || "Oraculista sintonizada.";
        const specsInput = document.getElementById("especialidades")?.value.trim() || "";
        const especialidades = specsInput.split(",").map(s => s.trim()).filter(s => s.length > 0);
        const categorias = Array.from(document.querySelectorAll('input[name="categorias"]:checked')).map(cb => cb.value);

        // 1. cartomantes
        const { data: existingCartomante, error: getCartErr } = await supabase
          .from("cartomantes")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (getCartErr) console.error("[CompletarPerfil] Erro ao buscar cartomante:", getCartErr);

        let cartomanteError = null;
        if (existingCartomante) {
          const { error: updErr } = await supabase
            .from("cartomantes")
            .update({
              nome: nomeProfissional,
              email: user.email,
              telefone: telefone,
              funcao: funcao,
              bio: bio,
              foto_url: fotoUrl
            })
            .eq("id", existingCartomante.id);
          cartomanteError = updErr;
        } else {
          const { error: insErr } = await supabase
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
          cartomanteError = insErr;
        }

        if (cartomanteError) {
          console.error("[CompletarPerfil] Erro ao criar cartomante:", cartomanteError);
        }

        // 2. perfis_publicos
        const { data: existingPerfil, error: getPerfErr } = await supabase
          .from("perfis_publicos")
          .select("cartomante_id")
          .eq("cartomante_id", user.id)
          .maybeSingle();
        if (getPerfErr) console.error("[CompletarPerfil] Erro ao buscar perfil público:", getPerfErr);

        let perfilError = null;
        if (existingPerfil) {
          const { error: updErr } = await supabase
            .from("perfis_publicos")
            .update({
              foto_url: fotoUrl,
              bio: bio,
              especialidades: especialidades,
              redes_sociais: { instagram: "", categorias: categorias },
              updated_at: new Date().toISOString()
            })
            .eq("cartomante_id", user.id);
          perfilError = updErr;
        } else {
          const randomSuffix = Math.floor(1000 + Math.random() * 9000);
          const slug = nomeProfissional
            .toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)+/g, "") + "-" + randomSuffix;

          const { error: insErr } = await supabase
            .from("perfis_publicos")
            .insert({
              cartomante_id: user.id,
              slug: slug,
              foto_url: fotoUrl,
              banner_url: "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?w=1200&auto=format&fit=crop",
              bio: bio,
              especialidades: especialidades,
              certificados: [],
              redes_sociais: { instagram: "", categorias: categorias },
              idiomas: ["Português"],
              modalidade: "online",
              cor_primaria: "#C7A27A",
              cor_secundaria: "#6E5AAB",
              publicado: true
            });
          perfilError = insErr;
        }

        if (perfilError) {
          console.error("[CompletarPerfil] Erro ao criar perfil público:", perfilError);
        }

        // 3. configuracoes_chat
        const { data: existingConfig, error: getConfErr } = await supabase
          .from("configuracoes_chat")
          .select("cartomante_id")
          .eq("cartomante_id", user.id)
          .maybeSingle();
        if (getConfErr) console.error("[CompletarPerfil] Erro ao buscar configs de chat:", getConfErr);

        let configError = null;
        if (existingConfig) {
          // Já configurado, não sobrescrever preferências
        } else {
          const { error: insErr } = await supabase
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
          configError = insErr;
        }

        if (configError) {
          console.error("[CompletarPerfil] Erro ao criar configurações de chat:", configError);
        }

        // Atualizar metadados no Auth
        await supabase.auth.updateUser({
          data: { nome_completo: nomeCompleto, nome_profissional: nomeProfissional, role: "cartomante" }
        });

        window.location.href = "dashboard.html";
      }

    } catch (err) {
      console.error("[CompletarPerfil] Erro geral:", err);
      showCPError("Erro ao processar as informações cadastrais. Tente novamente.");
      resetCPButton();
    }
  });
}
