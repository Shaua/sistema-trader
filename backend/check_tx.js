const WebSocket = require('ws');
const DerivAPI = require('@deriv/deriv-api/dist/DerivAPIBasic');

async function checkT() {
  const connection = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');
  const api = new DerivAPI({ connection });
  await api.authorize('ZxQrkNrNzcCG26v');
  const response = await api.profitTable({ profit_table: 1, description: 1, sort: 'DESC', limit: 10 });
  const tx = response.profit_table.transactions.find(t => t.transaction_id.toString() === '627192714828');
  console.log('Transaction:', tx);
  
  if (tx) {
    const d = new Date(tx.purchase_time * 1000);
    console.log('UTC String:', d.toUTCString());
    console.log('Local String:', d.toString());
  }
  process.exit();
}
checkT();
