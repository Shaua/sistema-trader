const { DerivAPIClient } = require('@deriv-com/api-client');

const app_id = '33F46USe231kjg55e5Wjn';
const token = 'pat_ceda66547521123b2a79ce47ae795f492a3cc0067e20cdf1ccb96d50947207ef';

async function main() {
  console.log('Connecting with app_id:', app_id);
  const client = new DerivAPIClient({ app_id });
  
  try {
    console.log('Sending authorize...');
    const auth = await client.send({ authorize: token });
    console.log('Auth success:', auth);
  } catch (err) {
    console.log('Auth error:', err);
  }
}

main();
