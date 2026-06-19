// supabase-client.js - Singleton do cliente Supabase
// Garante que apenas UMA instância do GoTrueClient seja criada em toda a aplicação
// Este script aguarda a biblioteca estar disponível antes de inicializar

(function () {
  if (window._supabaseClient) return; // Já foi inicializado

  function tryInit() {
    if (window._supabaseClient) return true;

    const url = (window.ENV && window.ENV.SUPABASE_URL) || "";
    const key = (window.ENV && window.ENV.SUPABASE_ANON_KEY) || "";

    if (!url || !key || url.includes("YOUR_PROJECT_REF")) {
      console.warn("[SupabaseClient] Credenciais ausentes ou inválidas. Modo offline ativo.");
      window._supabaseClient = null;
      return true; // Sinaliza que a tentativa foi concluída (mesmo sem cliente)
    }

    // Verificar se a biblioteca já carregou
    if (typeof window.supabase === "undefined" || typeof window.supabase.createClient !== "function") {
      return false; // Biblioteca ainda não disponível
    }

    try {
      window._supabaseClient = window.supabase.createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        }
      });
      console.log("[SupabaseClient] Cliente inicializado com sucesso.");
      return true;
    } catch (e) {
      console.error("[SupabaseClient] Falha ao criar cliente:", e);
      window._supabaseClient = null;
      return true;
    }
  }

  // Tentar inicializar imediatamente
  if (!tryInit()) {
    // Se a biblioteca ainda não carregou, tentar no DOMContentLoaded
    document.addEventListener("DOMContentLoaded", function () {
      if (!tryInit()) {
        // Última tentativa depois de 500ms (CDN pode ser lento)
        setTimeout(tryInit, 500);
      }
    });
  }
})();
