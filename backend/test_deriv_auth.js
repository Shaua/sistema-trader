const WebSocket = require('ws');
const DerivAPI = require('@deriv/deriv-api/dist/DerivAPIBasic');

async function testAuth() {
  const connection = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');
  const api = new DerivAPI({ connection });

  try {
    const token = 'S57DZsVfW07bqxH';
    const auth = await api.authorize(token);
    console.log('Is Virtual:', auth.authorize.is_virtual);
    
    const response = await api.profitTable({
      profit_table: 1,
      description: 1,
      sort: 'DESC',
      limit: 50
    });
    
    const transactions = response.profit_table.transactions || [];
    const appIds = [...new Set(transactions.map(t => t.app_id))];
    console.log('Unique App IDs found in recent trades:', appIds);
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    connection.close();
  }
}
testAuth();
