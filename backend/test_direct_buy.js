const WebSocket = require('ws');
const DerivAPI = require('@deriv/deriv-api/dist/DerivAPIBasic');

async function testBuy() {
  const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');
  
  ws.on('open', () => {
    // using demo token from user profile if possible, or the one from test_deriv
    const token = 'S57DZsVfW07bqxH'; 
    ws.send(JSON.stringify({ authorize: token }));
  });

  ws.on('message', (data) => {
    const msg = JSON.parse(data);
    
    if (msg.msg_type === 'authorize') {
      console.log('Autorizado!');
      // Sending Direct Buy
      ws.send(JSON.stringify({
        buy: "1",
        price: 0.35,
        parameters: {
          amount: 0.35,
          basis: "stake",
          contract_type: "DIGITUNDER",
          currency: "USD",
          duration: 1,
          duration_unit: "t",
          symbol: "R_10",
          barrier: "8"
        }
      }));
    }
    
    if (msg.msg_type === 'buy') {
      console.log('COMPRA EFETUADA COM SUCESSO:', msg.buy);
      ws.close();
    }
    
    if (msg.error) {
      console.error('ERRO:', msg.error);
      ws.close();
    }
  });
}

testBuy();
