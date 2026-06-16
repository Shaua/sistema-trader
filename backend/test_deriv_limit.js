const WebSocket = require('ws');
const DerivAPI = require('@deriv/deriv-api/dist/DerivAPIBasic');

async function testToken() {
  const connection = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');
  const api = new DerivAPI({ connection });

  try {
    const token = 'ZxQrkNrNzcCG26v';
    const auth = await api.authorize(token);
    const response = await api.profitTable({
      profit_table: 1,
      description: 1,
      sort: 'DESC',
      limit: 500
    });
    console.log('Count:', response.profit_table.count);
    const sum=response.profit_table.transactions.reduce((s,t)=>s+(parseFloat(t.sell_price)-parseFloat(t.buy_price)),0);
    console.log('Total Profit:', sum);
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    connection.close();
  }
}
testToken();
