require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  await supabase.from('operations').delete().eq('user_id', '61a5c940-36b8-4fe6-868f-b3a654e07eba');
  console.log('Operacoes apagadas para sempre!');
}

check();
