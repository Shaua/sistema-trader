require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  const { data, error, count } = await supabase.from('operations').select('*', { count: 'exact' })
  console.log('Total Operations in DB:', count);
  console.log('First operation:', data ? data[0] : null);
}

check();
