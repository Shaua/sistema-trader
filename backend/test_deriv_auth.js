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
      limit: 10
    });
    
    const transactions = response.profit_table.transactions || [];
    console.log(`Found ${transactions.length} trades.`);
    if (transactions.length > 0) {
      console.log('--- FIRST TRADE ---');
      const trade = transactions[0];
      console.log(trade);
      
      console.log('--- FILTER LOGIC ---');
      console.log('trade.app_id:', trade.app_id);
      const APP_ID = 1089;
      
      const skip = (trade.app_id && Number(trade.app_id) !== APP_ID);
      console.log('Will skip?', skip);
    }
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    connection.close();
  }
}
testAuth();
