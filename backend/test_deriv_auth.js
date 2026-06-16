const WebSocket = require('ws');
const DerivAPI = require('@deriv/deriv-api/dist/DerivAPIBasic');

async function testAuth() {
  const connection = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');
  const api = new DerivAPI({ connection });

  try {
    const token = 'S57DZsVfW07bqxH';
    const auth = await api.authorize(token);
    console.log('Is Virtual:', auth.authorize.is_virtual);
    console.log('Login ID:', auth.authorize.loginid);
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    connection.close();
  }
}
testAuth();
