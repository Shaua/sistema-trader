const supabase = require('./src/config/supabase');

async function debug() {
  const { data, error } = await supabase.from('bank_configs').select('*');
  console.log("BANK CONFIGS:", data);
  console.log("ERROR:", error);
}
debug();
