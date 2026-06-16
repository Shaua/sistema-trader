require('dotenv').config();
const supabase = require('./src/config/supabase');

async function cleanOps() {
  const { data, error } = await supabase
    .from('operations')
    .delete()
    .eq('user_id', '61a5c940-36b8-4fe6-868f-b3a654e07eba');
  console.log('Cleaned:', error || 'Success');
}
cleanOps();
