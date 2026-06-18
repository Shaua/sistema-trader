const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  try {
    const { data, error } = await supabase.from('user_profiles').select('*').limit(1);
    if (data && data.length > 0) {
      console.log('Token antigo (que estava no deriv_token):', data[0].deriv_token);
    } else {
      console.log('Nenhum perfil encontrado.');
    }
  } catch (e) {
    console.error(e);
  }
}

run();
