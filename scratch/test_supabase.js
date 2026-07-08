const https = require('https');

const SUPABASE_URL = "https://oglsyumzlvzrudzdonrh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nbHN5dW16bHZ6cnVkemRvbnJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NDE3MTUsImV4cCI6MjA5NTExNzcxNX0.K7wUgkcjDLoB43tD4s31FuMmIsR9PEjQODgeDEOXGZQ";

function makeRESTRequest(path, method, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = `${SUPABASE_URL}/rest/v1${path}`;
    const options = {
      method: method,
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token || SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function makeAuthRequest(path, body) {
  return new Promise((resolve, reject) => {
    const url = `${SUPABASE_URL}/auth/v1${path}`;
    const options = {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(JSON.stringify(body));
    req.end();
  });
}

async function testSignUp() {
  const email = `test_user_${Date.now()}@teste.com`;
  const password = "password123";
  console.log(`Tentando registrar usuário no Auth: ${email}`);

  // 1. Chamar Auth signUp
  const signUpRes = await makeAuthRequest('/signup', {
    email,
    password,
    data: {
      nome_completo: "Cliente Teste Automatizado",
      role: "cliente"
    }
  });

  console.log("Auth Status:", signUpRes.status);
  console.log("Auth Data:", JSON.stringify(signUpRes.data, null, 2));

  if (signUpRes.status !== 200 && signUpRes.status !== 201) {
    console.error("Falha no SignUp!");
    return;
  }

  const userObj = signUpRes.data.user;
  const token = signUpRes.data.access_token;

  console.log("Possui Sessão / Token de Acesso:", !!token);

  // 2. Tentar inserir na tabela clientes
  if (userObj && userObj.id) {
    const clientRecord = {
      user_id: userObj.id,
      nome_completo: "Cliente Teste Automatizado",
      email: email,
      celular: "11999999999",
      foto_url: "assets/img/default-avatar.png"
    };

    console.log(`\nTentando inserir registro na tabela 'clientes' com token: ${token ? 'Sim' : 'Não'}`);
    try {
      const insertRes = await makeRESTRequest('/clientes', 'POST', clientRecord, token);
      console.log("Insert Status:", insertRes.status);
      console.log("Insert Data:", JSON.stringify(insertRes.data, null, 2));
    } catch (err) {
      console.error("Erro na requisição REST de inserção:", err);
    }
  }
}

testSignUp();
