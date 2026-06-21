require('dotenv').config();
const supabase = require('./src/config/supabase');

async function run() {
  console.log('Fetching latest operations...');
  const { data, error } = await supabase
    .from('operations')
    .select('created_at, operation_time, result')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log(data);
  }
}
run();
