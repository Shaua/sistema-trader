const WebSocket = require('ws');
const DerivAPI = require('@deriv/deriv-api/dist/DerivAPIBasic');

async function testAuth() {
  const connection = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');
  const api = new DerivAPI({ connection });

  try {
    const token = 'y4Q1qnzyCg3BlgQ'; // User's Demo token
    const auth = await api.authorize(token);
    console.log('Is Virtual:', auth.authorize.is_virtual);
    console.log('Login ID:', auth.authorize.loginid);
    
    const response = await api.profitTable({
      profit_table: 1,
      description: 1,
      sort: 'DESC',
      limit: 50
    });
    
    const transactions = response.profit_table.transactions || [];
    console.log(`Found ${transactions.length} trades.`);
    transactions.forEach(t => {
      const date = new Date(t.sell_time * 1000);
      const time = date.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      if (time.startsWith('17:50') || time.startsWith('17:49') || time.startsWith('17:51')) {
         console.log(`${time} - ${t.contract_id} - ${t.buy_price} -> ${t.sell_price} (App: ${t.app_id})`);
         console.log(t);
      }
    });
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    connection.close();
  }
}
testAuth();
