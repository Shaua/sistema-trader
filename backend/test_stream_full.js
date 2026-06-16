const WebSocket = require('ws');

async function testStream() {
  const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');
  
  ws.on('open', () => {
    ws.send(JSON.stringify({ authorize: 'ZxQrkNrNzcCG26v' }));
  });

  ws.on('message', (data) => {
    const msg = JSON.parse(data);
    if (msg.msg_type === 'authorize') {
      ws.send(JSON.stringify({ transaction: 1, subscribe: 1 }));
    } else if (msg.msg_type === 'transaction') {
      console.log('Transaction FULL:', JSON.stringify(msg.transaction, null, 2));
      process.exit();
    }
  });
}
testStream();
