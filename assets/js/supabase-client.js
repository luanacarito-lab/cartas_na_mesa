// supabase-client.js - Singleton do cliente Supabase
// Garante que apenas UMA instância do GoTrueClient seja criada em toda a aplicação
// Inclua este script APÓS config.js e @supabase/supabase-js, ANTES de qualquer outro script

(function () {
  if (window._supabaseClient) return; // Já foi inicializado

  const url = (window.ENV && window.ENV.SUPABASE_URL) || "";
  const key = (window.ENV && window.ENV.SUPABASE_ANON_KEY) || "";

  if (!url || !key || url.includes("YOUR_PROJECT_REF")) {
    console.warn("[SupabaseClient] Credenciais ausentes ou inválidas. Modo offline ativo.");
    window._supabaseClient = null;
    return;
  }

  if (typeof window.supabase === "undefined" || typeof window.supabase.createClient !== "function") {
    console.warn("[SupabaseClient] Biblioteca @supabase/supabase-js não carregada ainda.");
    window._supabaseClient = null;
    return;
  }

  try {
    window._supabaseClient = window.supabase.createClient(url, key);
    console.log("[SupabaseClient] Cliente inicializado com sucesso.");
  } catch (e) {
    console.error("[SupabaseClient] Falha ao criar cliente:", e);
    window._supabaseClient = null;
  }
})();
