// auth-guard.js - Controle de Acesso e Proteção de Rotas
// Usa window._supabaseClient (singleton). Deve ser incluído APÓS supabase-client.js
// --------------------------------------------------------------------------
(function () {
  // Ocultar a página temporariamente para evitar flash de conteúdo privado
  document.documentElement.style.display = "none";

  // Identifica o arquivo atual na URL
  const path = window.location.pathname;
  const pageName = path.substring(path.lastIndexOf("/") + 1) || "index.html";

  // Páginas privadas de Cartomante
  const cartomantePages = [
    "dashboard.html",
    "clients.html",
    "agenda.html",
    "chat.html",
    "finance.html",
    "organization.html",
    "settings.html",
    "profile_cliente.html",
  ];

  // Páginas privadas de Cliente
  const clientePages = ["client_area.html", "client_chat.html"];

  // Páginas de autenticação (redirecionar se já logado)
  const authPages = ["login.html", "register_cliente.html", "register_cartomante.html"];

  // Testar conexão com o Supabase
  async function testConnection(supabase) {
    if (!supabase) return false;
    if (typeof navigator !== "undefined" && !navigator.onLine) return false;
    try {
      const { error } = await supabase.from("profiles").select("id").limit(1);
      return !error;
    } catch (e) {
      return false;
    }
  }

  // Função global de sincronização de perfil
  window.syncUserProfile = async function (user, supabaseClient) {
    if (!user || !supabaseClient) return null;
    const metadata = user.user_metadata || {};
    const role = metadata.role || "cliente";

    try {
      // Verificar/criar registro na tabela profiles
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("id, tipo_conta")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) {
        console.log("[AuthGuard] Criando perfil...");
        await supabaseClient.from("profiles").insert({
          user_id: user.id,
          nome: metadata.nome_profissional || metadata.nome_completo || "Usuário",
          email: user.email,
          tipo_conta: role,
          telefone: metadata.telefone || metadata.celular || "",
          avatar_url: metadata.foto_url || "assets/img/default-avatar.png",
          status: "ativo",
        });
      } else if (profile.tipo_conta !== role && metadata.role) {
        // Só atualiza se o metadata tem role explícito
        await supabaseClient
          .from("profiles")
          .update({ tipo_conta: role })
          .eq("user_id", user.id);
      }

      if (role === "cartomante") {
        // Garantir registro na tabela cartomantes
        const { data: cartomante } = await supabaseClient
          .from("cartomantes")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!cartomante) {
          console.log("[AuthGuard] Criando registro em cartomantes...");
          await supabaseClient.from("cartomantes").insert({
            user_id: user.id,
            nome: metadata.nome_profissional || metadata.nome_completo || "Cartomante",
            email: user.email,
            telefone: metadata.telefone || "",
            funcao: metadata.funcao || "Cartomante",
            bio: metadata.bio || "Nova oraculista sintonizada.",
            foto_url: metadata.foto_url || "assets/img/default-avatar.png",
            banner_url:
              metadata.banner_url ||
              "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?w=1200&auto=format&fit=crop",
          });
        }

        // Garantir perfil público
        const { data: perfil } = await supabaseClient
          .from("perfis_publicos")
          .select("cartomante_id")
          .eq("cartomante_id", user.id)
          .maybeSingle();

        if (!perfil) {
          console.log("[AuthGuard] Criando perfil público...");
          const nomeProf = metadata.nome_profissional || "cartomante";
          const slug =
            nomeProf
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/(^-|-$)+/g, "") +
            "-" +
            Math.floor(1000 + Math.random() * 9000);

          await supabaseClient.from("perfis_publicos").insert({
            cartomante_id: user.id,
            slug: slug,
            foto_url: metadata.foto_url || "assets/img/default-avatar.png",
            banner_url:
              metadata.banner_url ||
              "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?w=1200&auto=format&fit=crop",
            bio: metadata.bio || "Nova oraculista sintonizada.",
            especialidades: metadata.especialidades || [],
            certificados: [],
            redes_sociais: { instagram: "", categorias: metadata.categorias || [] },
            idiomas: ["Português"],
            modalidade: "online",
            cor_primaria: "#C7A27A",
            cor_secundaria: "#6E5AAB",
            publicado: true,
          });
        }

        // Garantir configurações de chat
        const { data: config } = await supabaseClient
          .from("configuracoes_chat")
          .select("cartomante_id")
          .eq("cartomante_id", user.id)
          .maybeSingle();

        if (!config) {
          console.log("[AuthGuard] Criando configurações de chat...");
          await supabaseClient.from("configuracoes_chat").insert({
            cartomante_id: user.id,
            limite_diario: 50,
            limite_por_cliente: 10,
            horario_inicio: "09:00:00",
            horario_fim: "21:00:00",
            pausa_automatica: false,
            modo_esgotamento: false,
            mensagem_esgotamento:
              "Os atendimentos estão funcionando em ritmo reduzido no momento.",
            max_atendimentos_diarios: 10,
            max_perguntas_diarias: 5,
            tempo_minimo_entre_clientes: 15,
            horarios_descanso: [],
          });
        }

        return "cartomante";
      } else {
        // Cliente
        const { data: client } = await supabaseClient
          .from("clientes")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!client) {
          console.log("[AuthGuard] Criando registro em clientes...");
          await supabaseClient.from("clientes").insert({
            user_id: user.id,
            nome_completo: metadata.nome_completo || "Consulente",
            email: user.email,
            celular: metadata.celular || "",
            data_nascimento: metadata.data_nascimento || null,
            religiao: metadata.religiao || null,
            sexo: metadata.sexo || null,
            pronome: metadata.pronome || null,
            estado_civil: metadata.estado_civil || null,
            guia_espiritual: metadata.guia_espiritual || null,
            pai_mae_cabeca: metadata.pai_mae_cabeca || null,
            tradicao_espiritual: metadata.tradicao_espiritual || null,
            foto_url: "assets/img/default-avatar.png",
          });
        }

        return "cliente";
      }
    } catch (e) {
      console.error("[AuthGuard] Erro em syncUserProfile:", e);
      return role;
    }
  };

  // Logout global
  window.handleLogout = async function (event) {
    if (event) event.preventDefault();
    localStorage.removeItem("demo_logged_user");
    localStorage.removeItem("demo_logged_client");

    const supabase = window._supabaseClient;
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn("[AuthGuard] Erro ao fazer signOut:", e);
      }
    }
    window.location.href = "login.html";
  };

  // Aguardar o cliente Supabase ficar disponível (máx 3s)
  function waitForSupabase(maxMs) {
    return new Promise((resolve) => {
      if (window._supabaseClient !== undefined) { resolve(window._supabaseClient); return; }
      const start = Date.now();
      const check = setInterval(() => {
        if (window._supabaseClient !== undefined || Date.now() - start > maxMs) {
          clearInterval(check);
          resolve(window._supabaseClient || null);
        }
      }, 80);
    });
  }

  async function checkAuth() {
    try {
      const supabase = await waitForSupabase(3000);
      const isOnline = await testConnection(supabase);

      let loggedUser = null;
      let userRole = null;

      // 1. Verificar mock local
      const mockCartomante = localStorage.getItem("demo_logged_user");
      const mockCliente = localStorage.getItem("demo_logged_client");

      if (mockCartomante) {
        loggedUser = JSON.parse(mockCartomante);
        userRole = "cartomante";
      } else if (mockCliente) {
        loggedUser = JSON.parse(mockCliente);
        userRole = "cliente";
      } else if (isOnline && supabase) {
        // 2. Verificar usuário real no Supabase
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          loggedUser = user;

          // Buscar role na tabela profiles
          const { data: profile } = await supabase
            .from("profiles")
            .select("tipo_conta")
            .eq("user_id", user.id)
            .maybeSingle();

          if (profile && profile.tipo_conta) {
            userRole = profile.tipo_conta;
          } else {
            // Tentar sync pelo metadata
            if (user.user_metadata && user.user_metadata.role) {
              userRole = await window.syncUserProfile(user, supabase);
            } else {
              // Sem role no metadata → tentar inferir pelo que existe nas tabelas
              const { data: cartomante } = await supabase
                .from("cartomantes")
                .select("id")
                .eq("user_id", user.id)
                .maybeSingle();
              if (cartomante) {
                // Criar perfil como cartomante
                await supabase.from("profiles").insert({
                  user_id: user.id,
                  nome: user.email.split("@")[0],
                  email: user.email,
                  tipo_conta: "cartomante",
                  status: "ativo",
                });
                userRole = "cartomante";
              } else {
                userRole = null; // Vai para completar-perfil
              }
            }
          }
        }
      }

      const isCartomantePage = cartomantePages.includes(pageName);
      const isClientePage = clientePages.includes(pageName);
      const isAuthPage = authPages.includes(pageName);
      const isCompletarPerfilPage = pageName === "completar-perfil.html";

      // Visitante não logado
      if (!loggedUser) {
        if (isCartomantePage || isClientePage || isCompletarPerfilPage) {
          window.location.href = "login.html";
          return;
        }
        return; // Página pública, liberar
      }

      // Logado sem perfil completo
      if (!userRole) {
        if (!isCompletarPerfilPage && !isAuthPage) {
          window.location.href = "completar-perfil.html";
          return;
        }
        return;
      }

      // Logado com perfil → redirecionar de completar-perfil
      if (isCompletarPerfilPage) {
        window.location.href = userRole === "cartomante" ? "dashboard.html" : "client_area.html";
        return;
      }

      // Bloquear área da cartomante para clientes
      if (isCartomantePage && userRole !== "cartomante") {
        window.location.href = "client_area.html";
        return;
      }

      // Bloquear área do cliente para cartomantes
      if (isClientePage && userRole !== "cliente") {
        window.location.href = "dashboard.html";
        return;
      }

      // Já logado tentando acessar login/registro
      if (isAuthPage) {
        window.location.href = userRole === "cartomante" ? "dashboard.html" : "client_area.html";
        return;
      }
    } catch (err) {
      console.error("[AuthGuard] Erro crítico:", err);
    } finally {
      // Garantir que a página sempre fica visível
      document.documentElement.style.display = "";
    }
  }

  // Executar o guard
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", checkAuth);
  } else {
    checkAuth();
  }
})();
