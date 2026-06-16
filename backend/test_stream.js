const WebSocket = require('ws');

async function testStream() {
  const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');
  
  ws.on('open', () => {
    // 1. Authorize
    ws.send(JSON.stringify({ authorize: 'ZxQrkNrNzcCG26v' }));
  });

  ws.on('message', (data) => {
    const msg = JSON.parse(data);
    if (msg.msg_type === 'authorize') {
      console.log('Authorized:', msg.authorize.loginid);
      // 2. Subscribe to transactions
      ws.send(JSON.stringify({ transaction: 1, subscribe: 1 }));
    } else if (msg.msg_type === 'transaction') {
      console.log('New Transaction:', msg.transaction);
    } else {
      console.log('Msg type:', msg.msg_type);
    }
  });
}
testStream();
