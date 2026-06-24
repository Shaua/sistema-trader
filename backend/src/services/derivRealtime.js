const WebSocket = require('ws');
const { syncDerivOperations } = require('./derivApi');

const activeConnections = new Map();

/**
 * Inicia a conexão em tempo real com a Deriv para um usuário.
 */
function startRealtimeSync(userId, token, accountType = 'REAL') {
  const connectionKey = `${userId}_${accountType}`;
  if (activeConnections.has(connectionKey)) {
    console.log(`[Realtime] Conexão já ativa para o usuário ${userId} (${accountType})`);
    return;
  }

  console.log(`[Realtime] Iniciando conexão para o usuário ${userId} (${accountType})...`);
  const ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');
  
  ws.on('open', () => {
    // 1. Autenticar
    ws.send(JSON.stringify({ authorize: token }));
  });

  ws.on('message', async (data) => {
    const msg = JSON.parse(data);
    
    if (msg.error) {
      console.error(`[Realtime] Erro da Deriv para o usuário ${userId} (${accountType}):`, msg.error.message);
    }
    
    if (msg.msg_type === 'authorize') {
      console.log(`[Realtime] Autenticado para ${userId} (${accountType}). Assinando transactions...`);
      // 2. Assinar stream de transações
      ws.send(JSON.stringify({ transaction: 1, subscribe: 1 }));
      
    } 
    else if (msg.msg_type === 'transaction') {
      const tx = msg.transaction;
      // Quando ocorre um SELL (fechamento de contrato), a operação terminou.
      if (tx && tx.action === 'sell') {
         console.log(`[Realtime] Nova operação fechada detectada para ${userId} (${accountType})! Sincronizando...`);
         try {
           // Sincroniza apenas as últimas 5 operações para ser super rápido e atualizar o banco
           await syncDerivOperations(token, userId, 5, accountType);
           console.log(`[Realtime] Sincronização rápida concluída para ${userId} (${accountType}).`);
         } catch (err) {
           console.error(`[Realtime] Erro ao sincronizar rápida:`, err.message);
         }
      }
    }
  });

  ws.on('close', () => {
    console.log(`[Realtime] Conexão fechada para ${userId} (${accountType}). Tentando reconectar em 10s...`);
    activeConnections.delete(connectionKey);
    setTimeout(() => {
      startRealtimeSync(userId, token, accountType);
    }, 10000);
  });
  
  ws.on('error', (err) => {
    console.error(`[Realtime] Erro na conexão WS do usuário ${userId} (${accountType}):`, err.message);
    ws.close();
  });

  activeConnections.set(connectionKey, ws);
}

/**
 * Fecha a conexão de um usuário (caso ele desvincule a chave)
 */
function stopRealtimeSync(userId) {
  if (activeConnections.has(userId)) {
    console.log(`[Realtime] Parando conexão do usuário ${userId}...`);
    const ws = activeConnections.get(userId);
    ws.close();
    activeConnections.delete(userId);
  }
}

/**
 * Retorna o status de todas as conexões realtime ativas do usuário
 */
function getRealtimeStatus(userId) {
  const isRealActive = activeConnections.has(`${userId}_REAL`);
  const isDemoActive = activeConnections.has(`${userId}_DEMO`);
  
  return {
    active: isRealActive || isDemoActive,
    details: {
      real: isRealActive,
      demo: isDemoActive
    }
  };
}

module.exports = {
  startRealtimeSync,
  stopRealtimeSync,
  getRealtimeStatus
};
