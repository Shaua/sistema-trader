const WebSocket = require('ws');
const axios = require('axios');
const { syncDerivOperations } = require('./derivApi');

const activeConnections = new Map();

function isAlphanumericAppId(appId) {
  if (!appId) return false;
  return /[a-zA-Z]/.test(String(appId));
}

/**
 * Inicia a conexão em tempo real com a Deriv para um usuário.
 */
async function startRealtimeSync(userId, token, accountType = 'REAL', appId = null) {
  const finalAppId = appId || 1089;
  const isNewFlow = isAlphanumericAppId(appId);
  const connectionKey = `${userId}_${accountType}`;
  
  if (activeConnections.has(connectionKey)) {
    console.log(`[Realtime] Conexão já ativa para o usuário ${userId} (${accountType})`);
    return;
  }

  console.log(`[Realtime] Iniciando conexão para o usuário ${userId} (${accountType}) [Flow: ${isNewFlow ? 'OTP' : 'Classic'}]...`);
  
  let wsUrl = `wss://ws.derivws.com/websockets/v3?app_id=${finalAppId}`;

  if (isNewFlow) {
    try {
      // Pega accountId correspondente
      const accountsRes = await axios.get('https://api.derivws.com/trading/v1/options/accounts', {
        headers: { 'Deriv-App-ID': finalAppId, 'Authorization': `Bearer ${token}` }
      });
      const targetType = accountType.toLowerCase();
      const targetAccount = accountsRes.data.data.find(a => a.account_type === targetType);
      
      if (!targetAccount) throw new Error(`Conta ${accountType} não encontrada.`);

      // Pega OTP WebSocket URL
      const otpRes = await axios.post(`https://api.derivws.com/trading/v1/options/accounts/${targetAccount.account_id}/otp`, {}, {
        headers: { 'Deriv-App-ID': finalAppId, 'Authorization': `Bearer ${token}` }
      });
      
      wsUrl = otpRes.data.data.url;
    } catch (err) {
      console.error(`[Realtime] Falha ao iniciar OTP para ${userId} (${accountType}):`, err.message);
      return;
    }
  }

  const ws = new WebSocket(wsUrl);
  
  ws.on('open', () => {
    // 1. Autenticar (se for fluxo clássico, no fluxo OTP já vem autenticado na URL)
    if (!isNewFlow) {
      ws.send(JSON.stringify({ authorize: token }));
    } else {
      console.log(`[Realtime] OTP Conectado para ${userId} (${accountType}). Assinando transactions...`);
      ws.send(JSON.stringify({ transaction: 1, subscribe: 1 }));
    }
  });

  ws.on('message', async (data) => {
    const msg = JSON.parse(data);
    
    if (msg.error) {
      console.error(`[Realtime] Erro da Deriv para o usuário ${userId} (${accountType}):`, msg.error.message);
    }
    
    if (msg.msg_type === 'authorize') {
      console.log(`[Realtime] Autenticado para ${userId} (${accountType}). Assinando transactions...`);
      // 2. Assinar stream de transações (fluxo clássico)
      ws.send(JSON.stringify({ transaction: 1, subscribe: 1 }));
      
    } 
    else if (msg.msg_type === 'transaction') {
      const tx = msg.transaction;
      // Quando ocorre um SELL (fechamento de contrato), a operação terminou.
      if (tx && tx.action === 'sell') {
         console.log(`[Realtime] Nova operação fechada detectada para ${userId} (${accountType})! Sincronizando...`);
         try {
           // Sincroniza apenas as últimas 5 operações para ser super rápido e atualizar o banco
           await syncDerivOperations(token, userId, 5, accountType, appId);
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
      startRealtimeSync(userId, token, accountType, appId);
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
