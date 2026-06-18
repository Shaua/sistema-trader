const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log('Iniciando migração de banco de dados para Demo Accounts...');

  try {
    // Adicionar deriv_demo_token e active_account_type a user_profiles
    let { error: err1 } = await supabase.rpc('execute_sql', {
      sql_query: `
        ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS deriv_demo_token TEXT;
        ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS active_account_type TEXT DEFAULT 'REAL';
        
        ALTER TABLE public.operations ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'REAL';
        ALTER TABLE public.bank_configs ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'REAL';
        ALTER TABLE public.risk_configs ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'REAL';
      `
    });
    
    // Fallback if rpc 'execute_sql' does not exist. (We cannot run raw SQL from standard Supabase JS client easily without REST/RPC)
    console.log('Result:', err1 || 'Sucesso!');

    // Since RPC `execute_sql` usually doesn't exist by default, we might have to use postgres direct connection or another method.
    // However, we can use Prisma or pg if they are installed, or write a simple script that connects via pg.
  } catch (e) {
    console.error(e);
  }
}

run();
