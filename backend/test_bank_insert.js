const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function test() {
  const userId = '61a5c940-36b8-4fe6-868f-b3a654e07eba'; // From the logs
  const payload = {
        user_id: userId,
        trader_name: 'Shau',
        broker: 'Deriv',
        account_type: 'DEMO',
        initial_balance: 10000,
        current_balance: 10000,
        currency: 'USD',
        operational_profile: 'moderado',
        daily_goal_pct: 2,
        weekly_goal_pct: 10,
        monthly_goal_pct: 40,
        is_active: true
  };
  
  console.log("Inserting:", payload);
  const { data, error } = await supabase.from('bank_configs').insert(payload).select().single();
  console.log("Result:", data);
  console.log("Error:", error);
}

test();
