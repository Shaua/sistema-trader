require('dotenv').config();
const supabase = require('./src/config/supabase');

async function checkToken() {
  const { data: profile } = await supabase.from('user_profiles').select('deriv_token').eq('email', 'admin@traderdesk.com').single();
  console.log('Deriv Token in DB:', profile?.deriv_token);
}

checkToken();
