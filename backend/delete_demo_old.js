require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY);

async function run() {
  try {
    console.log('Buscando e deletando operações demo anteriores a ou iguais a 2026-07-03...');
    const { data, error } = await supabase
      .from('operations')
      .delete()
      .lte('operation_date', '2026-07-03')
      .eq('account_type', 'DEMO')
      .select('user_id');

    if (error) throw error;
    console.log(`Deletadas ${data.length} operações com sucesso.`);

    // Atualiza saldo apenas dos usuários afetados
    const userIds = [...new Set(data.map(d => d.user_id))];
    for (const uid of userIds) {
      console.log(`Recalculando saldo no banco para o usuário: ${uid}`);
      await supabase.rpc('recalculate_balance', { p_user_id: uid });
    }
    console.log('Finalizado com sucesso!');
  } catch (err) {
    console.error('Erro:', err.message || err);
  }
}

run();
