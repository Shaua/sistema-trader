require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function createAdmin() {
  console.log("Criando usuário admin...");
  
  // Cria o usuário na tabela auth do Supabase (já com email confirmado)
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'admin@traderdesk.com',
    password: 'traderadmin123',
    email_confirm: true,
    user_metadata: { name: 'Administrador Geral' }
  });

  if (error) {
    if (error.message.includes('already been registered')) {
        console.log("Usuário já existe. Tentando puxar ID para forçar role de admin.");
        // We could fetch user list but let's just create a new email if so.
        return;
    }
    console.error("Erro ao criar usuário auth:", error.message);
    return;
  }

  const userId = data.user.id;
  
  // Insere na tabela user_profiles com role = 'admin'
  const { error: profileError } = await supabase.from('user_profiles').insert({
    id: userId,
    email: 'admin@traderdesk.com',
    name: 'Administrador Geral',
    role: 'admin'
  });

  if (profileError) {
    console.error("Erro ao inserir perfil:", profileError.message);
    return;
  }

  console.log("✅ Conta de Administrador criada com sucesso!");
  console.log("Email: admin@traderdesk.com");
  console.log("Senha: traderadmin123");
}

createAdmin();
