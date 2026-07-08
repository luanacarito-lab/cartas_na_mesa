// supabase-client.js - Singleton e inicializador central do cliente Supabase
// Este script deve ser carregado após a CDN do Supabase e o arquivo config.js

(function () {
  if (window.supabaseClient) return; // Já foi inicializado

  function initClient() {
    if (window.supabaseClient) return true;

    const url = (window.ENV && window.ENV.SUPABASE_URL) || "";
    const key = (window.ENV && window.ENV.SUPABASE_ANON_KEY) || "";

    if (!url || !key || url.includes("YOUR_PROJECT_REF") || url.includes("YOUR_PUBLIC_ANON_KEY")) {
      console.warn("[SupabaseClient] Credenciais ausentes ou inválidas. Modo real inativo.");
      window.supabaseClient = null;
      return true; 
    }

    if (typeof window.supabase === "undefined" || typeof window.supabase.createClient !== "function") {
      return false; // Biblioteca ainda não carregada
    }

    try {
      window.supabaseClient = window.supabase.createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        }
      });
      console.log("[SupabaseClient] Cliente inicializado com sucesso.");
      return true;
    } catch (e) {
      console.error("[SupabaseClient] Falha ao criar cliente:", e);
      window.supabaseClient = null;
      return true;
    }
  }

  // Tentar inicializar imediatamente
  if (!initClient()) {
    document.addEventListener("DOMContentLoaded", function () {
      if (!initClient()) {
        setTimeout(initClient, 500);
      }
    });
  }

  // Função global para testar a conexão física com o banco de dados Supabase
  window.testPhysicalConnection = async function () {
    if (!window.supabaseClient) return false;
    if (typeof navigator !== "undefined" && !navigator.onLine) return false;
    try {
      // Fazemos uma query rápida na tabela profiles para ver se responde
      const { data, error } = await window.supabaseClient.from("profiles").select("id").limit(1);
      if (error && error.code === "PGRST301") {
        // Erro de autenticação JWT/RLS ou tabela inexistente ainda, mas respondeu (está online)
        return true;
      }
      return !error;
    } catch (e) {
      console.warn("[SupabaseClient] Falha no teste de conexão física:", e);
      return false;
    }
  };
})();
