// auth-guard.js - Controle de Acesso e Proteção de Rotas (Místico & Seguro)
// --------------------------------------------------------------------------
(function() {
  // Ocultar a página temporariamente para evitar flash de conteúdo privado
  document.documentElement.style.display = 'none';

  const SUPABASE_URL = (window.ENV && window.ENV.SUPABASE_URL) || "";
  const SUPABASE_ANON_KEY = (window.ENV && window.ENV.SUPABASE_ANON_KEY) || "";

  let supabase = null;
  if (typeof window.supabase !== "undefined" && SUPABASE_URL && !SUPABASE_URL.includes("YOUR_PROJECT_REF")) {
    try {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (e) {
      console.warn("Não foi possível criar o cliente Supabase no auth-guard.js", e);
    }
  }

  // Identifica o arquivo atual na URL
  const path = window.location.pathname;
  const pageName = path.substring(path.lastIndexOf('/') + 1) || 'index.html';

  // Páginas privadas exclusivas de Cartomante
  const cartomantePages = [
    'dashboard.html',
    'clients.html',
    'agenda.html',
    'chat.html',
    'finance.html',
    'organization.html',
    'settings.html',
    'profile_cliente.html'
  ];

  // Páginas privadas exclusivas de Cliente
  const clientePages = [
    'client_area.html',
    'client_chat.html'
  ];

  // Páginas públicas de autenticação (se logado, redireciona para a respectiva área)
  const authPages = [
    'login.html',
    'register_cliente.html',
    'register_cartomante.html'
  ];

  async function testConnection() {
    if (!supabase || SUPABASE_URL.includes("YOUR_PROJECT_REF")) return false;
    try {
      // Chamada leve para testar a conexão real com o banco
      const { data, error } = await supabase.from("conversas").select("id").limit(1);
      return !error;
    } catch (e) {
      return false;
    }
  }

  async function checkAuth() {
    const isOnline = await testConnection();
    let loggedUser = null;
    let userRole = null; // 'cartomante' ou 'cliente'

    if (isOnline && supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          loggedUser = user;
          
          // Verificar se é cliente na tabela clientes
          const { data: client } = await supabase
            .from("clientes")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();

          if (client) {
            userRole = 'cliente';
          } else {
            // Verificar se é cartomante na tabela cartomantes
            const { data: cartomante } = await supabase
              .from("cartomantes")
              .select("id")
              .eq("user_id", user.id)
              .maybeSingle();

            if (cartomante) {
              userRole = 'cartomante';
            } else {
              // Fallback caso seja um novo usuário sem registro de tabela ainda
              userRole = 'cliente';
            }
          }
        }
      } catch (err) {
        console.error("Erro na verificação de autenticação online:", err);
      }
    } else {
      // Modo offline (mock usando localStorage)
      const mockCartomante = localStorage.getItem("demo_logged_user");
      const mockCliente = localStorage.getItem("demo_logged_client");

      if (mockCartomante) {
        loggedUser = JSON.parse(mockCartomante);
        userRole = 'cartomante';
      } else if (mockCliente) {
        loggedUser = JSON.parse(mockCliente);
        userRole = 'cliente';
      }
    }

    const isCartomantePage = cartomantePages.includes(pageName);
    const isClientePage = clientePages.includes(pageName);
    const isAuthPage = authPages.includes(pageName);

    // 1. Bloqueio da Área da Cartomante
    if (isCartomantePage) {
      if (!loggedUser) {
        window.location.href = "login.html";
        return;
      }
      if (userRole !== 'cartomante') {
        // Redirecionar cliente tentando entrar na área da cartomante
        window.location.href = "client_area.html";
        return;
      }
    }

    // 2. Bloqueio da Área do Cliente
    if (isClientePage) {
      if (!loggedUser) {
        window.location.href = "login.html";
        return;
      }
      if (userRole !== 'cliente') {
        // Redirecionar cartomante tentando entrar na área do cliente
        window.location.href = "dashboard.html";
        return;
      }
    }

    // 3. Páginas de Autenticação (Login/Cadastro)
    if (isAuthPage && loggedUser) {
      if (userRole === 'cartomante') {
        window.location.href = "dashboard.html";
        return;
      } else if (userRole === 'cliente') {
        window.location.href = "client_area.html";
        return;
      }
    }

    // Se a autenticação estiver ok e as permissões baterem, exibe a página
    document.documentElement.style.display = '';
  }

  // Executa o guard
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAuth);
  } else {
    checkAuth();
  }
})();
