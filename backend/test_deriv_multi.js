const WebSocket = require('ws');
const DerivAPI = require('@deriv/deriv-api/dist/DerivAPIBasic');

async function testToken() {
  const connection = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');
  const api = new DerivAPI({ connection });

  try {
    const token = 'ZxQrkNrNzcCG26v';
    const auth = await api.authorize(token);
    console.log('Login ID:', auth.authorize.loginid);
    const response = await api.profitTable({
      profit_table: 1,
      description: 1,
      sort: 'DESC',
      limit: 5
    });
    console.log('Count:', response.profit_table.count);
    console.log(response.profit_table.transactions);
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    connection.close();
  }
}
testToken();
