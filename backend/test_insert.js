require('dotenv').config();
const supabase = require('./src/config/supabase');

async function testInsert() {
  const { data: profile } = await supabase.from('user_profiles').select('id').eq('email', 'admin@traderdesk.com').single();
  const userId = profile.id;

  const operation = {
    user_id: userId,
    transaction_id: '131476911141',
    date: '2026-06-16',
    asset: 'R_100',
    operation_type: 'PUT',
    entry_value: 3.48,
    result: 'LOSS',
    profit_loss: -3.48,
    notes: 'Teste'
  };

  const { data, error } = await supabase.from('operations').upsert(operation, { onConflict: 'transaction_id' }).select();
  console.log('Result:', data, 'Error:', error);
}

testInsert();
