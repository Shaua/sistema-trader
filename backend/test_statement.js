const WebSocket = require('ws');
const DerivAPI = require('@deriv/deriv-api/dist/DerivAPIBasic');

async function testToken() {
  const connection = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');
  const api = new DerivAPI({ connection });

  try {
    const token = 'ZxQrkNrNzcCG26v';
    await api.authorize(token);
    const response = await api.send({
      statement: 1,
      description: 1,
      limit: 2
    });
    console.log(JSON.stringify(response.statement.transactions, null, 2));
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    connection.close();
  }
}
testToken();
