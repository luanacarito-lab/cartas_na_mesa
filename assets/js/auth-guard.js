// auth-guard.js - Gerenciador Central de Sessão, Rotas e Modo Demonstração
// Deve ser carregado APÓS config.js e supabase-client.js

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

  // ==========================================================================
  // 1. GESTÃO DO MODO DEMONSTRAÇÃO
  // ==========================================================================
  window.isDemoMode = function () {
    return !!(localStorage.getItem("demo_logged_user") || localStorage.getItem("demo_logged_client"));
  };

  window.getCurrentDemoUser = function () {
    const mockCartomante = localStorage.getItem("demo_logged_user");
    const mockCliente = localStorage.getItem("demo_logged_client");

    if (mockCartomante) {
      return { user: JSON.parse(mockCartomante), role: "cartomante" };
    }
    if (mockCliente) {
      return { user: JSON.parse(mockCliente), role: "cliente" };
    }
    return null;
  };

  window.clearDemoSession = function () {
    localStorage.removeItem("demo_logged_user");
    localStorage.removeItem("demo_logged_client");
    localStorage.removeItem("demo_users");
  };

  // testSupabaseConnection centralizado: decide com base na demo e na conexão física
  window.testSupabaseConnection = async function () {
    // Se estivermos em modo demo, as chamadas às tabelas reais do Supabase devem ser ignoradas
    if (window.isDemoMode()) {
      return false;
    }
    // Caso contrário, testa a conexão física real
    if (typeof window.testPhysicalConnection === "function") {
      return await window.testPhysicalConnection();
    }
    return false;
  };

  // ==========================================================================
  // 2. SINCRONIZAÇÃO DE PERFIL E LOGOUT
  // ==========================================================================
  window.syncUserProfile = async function (user, supabaseClient) {
    if (!user || !supabaseClient) return null;
    const metadata = user.user_metadata || {};
    const role = metadata.role || metadata.tipo_conta || null;

    try {
      // Verificar se o perfil existe
      const { data: profile, error: selErr } = await supabaseClient
        .from("profiles")
        .select("id, tipo_conta")
        .eq("user_id", user.id)
        .maybeSingle();

      if (selErr) throw selErr;

      if (!profile) {
        console.log("[AuthGuard] Criando perfil via syncUserProfile...");
        const { error: upsertErr } = await supabaseClient.from("profiles").insert({
          user_id: user.id,
          nome: metadata.nome_profissional || metadata.nome_completo || user.email.split("@")[0],
          email: user.email,
          tipo_conta: role,
          telefone: metadata.telefone || metadata.celular || "",
          avatar_url: metadata.foto_url || "assets/img/default-avatar.png",
          status: "ativo",
        });
        if (upsertErr) {
          console.error("[AuthGuard] Erro ao criar perfil:", upsertErr);
          throw upsertErr;
        }
      } else if (role && profile.tipo_conta !== role) {
        // Atualizar se houver alteração
        const { error: updateErr } = await supabaseClient
          .from("profiles")
          .update({ tipo_conta: role, atualizado_em: new Date().toISOString() })
          .eq("user_id", user.id);
        if (updateErr) throw updateErr;
      }

      // Se for cartomante, garantir registros nas tabelas associadas
      if (role === "cartomante") {
        const { data: cartomante, error: cartErr } = await supabaseClient
          .from("cartomantes")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (cartErr) throw cartErr;

        if (!cartomante) {
          const { error: insErr } = await supabaseClient.from("cartomantes").insert({
            user_id: user.id,
            nome: metadata.nome_profissional || metadata.nome_completo || "Cartomante",
            email: user.email,
            telefone: metadata.telefone || "",
            funcao: metadata.funcao || "Cartomante",
            bio: metadata.bio || "Nova oraculista sintonizada.",
            foto_url: metadata.foto_url || "assets/img/default-avatar.png",
            banner_url: "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?w=1200&auto=format&fit=crop",
          });
          if (insErr) throw insErr;
        }

        const { data: perfil, error: perfErr } = await supabaseClient
          .from("perfis_publicos")
          .select("cartomante_id")
          .eq("cartomante_id", user.id)
          .maybeSingle();
        if (perfErr) throw perfErr;

        if (!perfil) {
          const nomeProf = metadata.nome_profissional || "cartomante";
          const slug = nomeProf.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "") + "-" + Math.floor(1000 + Math.random() * 9000);
          const { error: insPerfErr } = await supabaseClient.from("perfis_publicos").insert({
            cartomante_id: user.id,
            slug: slug,
            foto_url: metadata.foto_url || "assets/img/default-avatar.png",
            banner_url: "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?w=1200&auto=format&fit=crop",
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
          if (insPerfErr) throw insPerfErr;
        }

        const { data: config, error: confErr } = await supabaseClient
          .from("configuracoes_chat")
          .select("cartomante_id")
          .eq("cartomante_id", user.id)
          .maybeSingle();
        if (confErr) throw confErr;

        if (!config) {
          const { error: insConfErr } = await supabaseClient.from("configuracoes_chat").insert({
            cartomante_id: user.id,
            limite_diario: 50,
            limite_por_cliente: 10,
            horario_inicio: "09:00:00",
            horario_fim: "21:00:00",
            pausa_automatica: false,
            modo_esgotamento: false,
            mensagem_esgotamento: "Os atendimentos estão funcionando em ritmo reduzido no momento.",
            max_atendimentos_diarios: 10,
            max_perguntas_diarias: 5,
            tempo_minimo_entre_clientes: 15,
            horarios_descanso: [],
          });
          if (insConfErr) throw insConfErr;
        }
      } else if (role === "cliente") {
        // Se for cliente, garantir registro na tabela clientes
        const { data: client, error: cliErr } = await supabaseClient
          .from("clientes")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (cliErr) throw cliErr;

        if (!client) {
          const { error: insCliErr } = await supabaseClient.from("clientes").insert({
            user_id: user.id,
            nome_completo: metadata.nome_completo || user.email.split("@")[0],
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
          if (insCliErr) throw insCliErr;
        }
      }

      return role;
    } catch (e) {
      console.error("[AuthGuard] Erro ao sincronizar perfil:", e);
      throw e;
    }
  };

  window.handleLogout = async function (event) {
    if (event) event.preventDefault();
    window.clearDemoSession();

    const supabase = window.supabaseClient;
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn("[AuthGuard] Erro ao sair do Supabase:", e);
      }
    }
    window.location.href = "login.html";
  };

  // ==========================================================================
  // 3. INDICADOR VISUAL DO MODO DEMO
  // ==========================================================================
  function injectDemoBanner() {
    if (!window.isDemoMode()) return;
    
    // Evita injetar mais de uma vez
    if (document.getElementById("demoBannerIndicator")) return;

    const banner = document.createElement("div");
    banner.id = "demoBannerIndicator";
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      background: linear-gradient(90deg, #6e5aab 0%, #c7a27a 100%);
      color: #ffffff;
      text-align: center;
      padding: 6px 10px;
      font-size: 0.78rem;
      font-family: var(--font-modern, 'Inter', sans-serif);
      font-weight: 600;
      letter-spacing: 0.5px;
      z-index: 99999;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 10px;
      backdrop-filter: blur(10px);
    `;
    
    const demoInfo = window.getCurrentDemoUser();
    const typeLabel = demoInfo?.role === "cartomante" ? "Cartomante" : "Consulente";
    
    banner.innerHTML = `
      <span>🔮 Modo Demonstração Ativo (${typeLabel}) — Dados Fictícios Locais</span>
      <button onclick="window.handleLogout(event)" style="
        background: rgba(255,255,255,0.18);
        border: 1px solid rgba(255,255,255,0.3);
        color: #fff;
        padding: 2px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.68rem;
        font-weight: bold;
        transition: all 0.2s;
      " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.18)'">Sair do Demo</button>
    `;
    
    document.body.appendChild(banner);
    // Ajustar o padding-top do corpo da página para não cobrir elementos importantes
    document.body.style.paddingTop = "32px";
  }

  // ==========================================================================
  // 4. VERIFICAÇÃO DE ROTAS E REDIRECIONAMENTO
  // ==========================================================================
  async function checkAuth() {
    try {
      const isDemo = window.isDemoMode();
      let loggedUser = null;
      let userRole = null;

      if (isDemo) {
        const demoInfo = window.getCurrentDemoUser();
        if (demoInfo) {
          loggedUser = demoInfo.user;
          userRole = demoInfo.role;
        }
      } else {
        const supabase = window.supabaseClient;
        if (supabase) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            loggedUser = user;
            
            // Buscar perfil no banco
            const { data: profile } = await supabase
              .from("profiles")
              .select("tipo_conta")
              .eq("user_id", user.id)
              .maybeSingle();

            if (profile && profile.tipo_conta) {
              userRole = profile.tipo_conta;
            } else {
              // Fallback metadados
              if (user.user_metadata && user.user_metadata.role) {
                userRole = await window.syncUserProfile(user, supabase);
              }
            }
          }
        }
      }

      const isCartomantePage = cartomantePages.includes(pageName);
      const isClientePage = clientePages.includes(pageName);
      const isAuthPage = authPages.includes(pageName);
      const isCompletarPerfilPage = (pageName === "completar-perfil.html");

      // 1. Visitante não logado tentando acessar páginas privadas ou completar-perfil
      if (!loggedUser) {
        if (isCartomantePage || isClientePage || isCompletarPerfilPage) {
          window.location.href = "login.html";
          return;
        }
        return; // Página pública, libera visualização
      }

      // 2. Usuário logado sem tipo definido (manda completar perfil)
      if (!userRole) {
        if (!isCompletarPerfilPage) {
          window.location.href = "completar-perfil.html";
          return;
        }
        return;
      }

      // 3. Bloqueios e Direcionamento por perfil
      const role = userRole.toLowerCase().trim();
      const isAdmin = ["mestra", "admin", "gerente"].includes(role);

      // Redirecionamentos de completar-perfil se já está com dados completos
      if (pageName === "completar-perfil.html") {
        if (isAdmin) window.location.href = "admin_dashboard.html";
        else window.location.href = role === "cartomante" ? "dashboard.html" : "client_area.html";
        return;
      }

      // Bloquear Cliente na área de Cartomante
      if (isCartomantePage && role !== "cartomante") {
        window.location.href = isAdmin ? "admin_dashboard.html" : "client_area.html";
        return;
      }

      // Bloquear Cartomante na área de Cliente
      if (isClientePage && role !== "cliente") {
        window.location.href = isAdmin ? "admin_dashboard.html" : "dashboard.html";
        return;
      }

      // Já logado acessando login/registro
      if (isAuthPage) {
        window.location.href = role === "cartomante" ? "dashboard.html" : "client_area.html";
        return;
      }

      // Injetar o banner de demo se estiver ativado
      if (isDemo && (isCartomantePage || isClientePage)) {
        injectDemoBanner();
      }

    } catch (err) {
      console.error("[AuthGuard] Erro ao validar rotas:", err);
    } finally {
      // Liberar a visualização da página com segurança
      document.documentElement.style.display = "";
    }
  }

  // Executar a proteção de rota
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", checkAuth);
  } else {
    checkAuth();
  }
})();
