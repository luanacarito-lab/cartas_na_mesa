// supabase-client.js - Singleton e inicializador central do cliente Supabase
// Este script deve ser carregado após a CDN do Supabase e o arquivo config.js

(function () {
  if (window.supabaseClient) return; // Já foi inicializado

  let resolveInit;
  let rejectInit;
  window.supabaseClientPromise = new Promise((resolve, reject) => {
    resolveInit = resolve;
    rejectInit = reject;
  });

  window.supabaseClientError = null;

  function initClient() {
    if (window.supabaseClient) {
      resolveInit(window.supabaseClient);
      return true;
    }

    const envExists = typeof window.ENV !== "undefined";
    const url = (window.ENV && window.ENV.SUPABASE_URL) || "";
    const key = (window.ENV && window.ENV.SUPABASE_ANON_KEY) || "";

    if (!envExists) {
      const err = new Error("Configuração ausente (arquivo config.js não carregado).");
      window.supabaseClientError = err.message;
      window.supabaseClient = null;
      rejectInit(err);
      return true;
    }

    if (!url || !key || url.includes("YOUR_PROJECT_REF") || url.includes("YOUR_PUBLIC_ANON_KEY")) {
      const err = new Error("Credenciais do Supabase ausentes ou inválidas no config.js.");
      window.supabaseClientError = err.message;
      window.supabaseClient = null;
      rejectInit(err);
      return true; 
    }

    if (typeof window.supabase === "undefined" || typeof window.supabase.createClient !== "function") {
      return false; // Biblioteca CDN ainda não carregada
    }

    try {
      window.supabaseClient = window.supabase.createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        }
      });
      console.log("[SupabaseClient] Cliente inicializado com sucesso.");
      resolveInit(window.supabaseClient);
      return true;
    } catch (e) {
      console.error("[SupabaseClient] Falha ao criar cliente:", e);
      const err = new Error("Erro na criação do cliente Supabase: " + e.message);
      window.supabaseClientError = err.message;
      window.supabaseClient = null;
      rejectInit(err);
      return true;
    }
  }

  // Tentar inicializar imediatamente
  if (!initClient()) {
    document.addEventListener("DOMContentLoaded", function () {
      if (!initClient()) {
        setTimeout(() => {
          if (!initClient()) {
            const err = new Error("Biblioteca Supabase CDN não carregada (timeout).");
            window.supabaseClientError = err.message;
            rejectInit(err);
          }
        }, 3000);
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

