const fs = require('fs');

const supabaseUrl = process.env.SUPABASE_URL || 'https://oglsyumzlvzrudzdonrh.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nbHN5dW16bHZ6cnVkemRvbnJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NDE3MTUsImV4cCI6MjA5NTExNzcxNX0.K7wUgkcjDLoB43tD4s31FuMmIsR9PEjQODgeDEOXGZQ';

const configContent = `window.ENV = {
  SUPABASE_URL: "${supabaseUrl}",
  SUPABASE_ANON_KEY: "${supabaseAnonKey}"
};
`;

fs.writeFileSync('config.js', configContent);
console.log('config.js gerado com sucesso.');
