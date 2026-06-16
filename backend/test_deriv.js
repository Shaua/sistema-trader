const WebSocket = require('ws');
const DerivAPI = require('@deriv/deriv-api/dist/DerivAPIBasic');

async function testToken() {
  const connection = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');
  const api = new DerivAPI({ connection });

  try {
    const token = 'S57DZsVfW07bqxH';
    console.log('Testando token:', token);
    const auth = await api.authorize(token);
    console.log('Autorizado. Buscando profitTable...');
    const response = await api.profitTable({
      profit_table: 1,
      description: 1,
      sort: 'DESC',
      limit: 50
    });
    console.log('Profit Table response keys:', Object.keys(response));
    if (response.profit_table) {
      console.log('Transactions count:', response.profit_table.count);
      console.log('Transactions array length:', response.profit_table.transactions?.length);
      console.log('First transaction:', response.profit_table.transactions?.[0]);
    } else {
      console.log('No profit_table in response:', response);
    }
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    connection.close();
  }
}

testToken();
