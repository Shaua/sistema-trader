require('dotenv').config();
const supabase = require('./src/config/supabase');
const { syncDerivOperations } = require('./src/services/derivApi');

async function doSync() {
  const userId = '61a5c940-36b8-4fe6-868f-b3a654e07eba';
  
  // Obter o perfil do usuǭrio
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('deriv_token')
    .eq('id', userId)
    .single();
    
  if (profile && profile.deriv_token) {
    try {
      console.log('Sincronizando com token:', profile.deriv_token);
      const result = await syncDerivOperations(profile.deriv_token, userId);
      console.log('Resultado:', result);
    } catch (e) {
      console.error(e);
    }
  } else {
    console.log('Token nǜo encontrado');
  }
}
doSync();
