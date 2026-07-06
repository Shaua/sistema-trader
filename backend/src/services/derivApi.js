const WebSocket = require('ws');
const DerivAPI = require('@deriv/deriv-api/dist/DerivAPIBasic');
const axios = require('axios');
const supabase = require('../config/supabase');

const DEFAULT_APP_ID = 1089; // Default testing App ID

function isAlphanumericAppId(appId) {
  if (!appId) return false;
  return /[a-zA-Z]/.test(String(appId));
}

/**
 * Conecta na Deriv e busca as últimas operações usando o fluxo apropriado
 */
async function syncDerivOperations(token, userId, limit = 500, accountType = 'REAL', appId = null) {
  const isNewFlow = isAlphanumericAppId(appId);
  const finalAppId = appId || DEFAULT_APP_ID;

  let connection;
  let api;

  try {
    console.log(`Autenticando na Deriv para usuário ${userId} (${accountType}) [Flow: ${isNewFlow ? 'OTP/REST' : 'Classic'}]...`);

    if (isNewFlow) {
      // 1. Busca a lista de accounts
      const accountsRes = await axios.get('https://api.derivws.com/trading/v1/options/accounts', {
        headers: { 'Deriv-App-ID': finalAppId, 'Authorization': `Bearer ${token}` }
      });
      
      const accounts = accountsRes.data.data;
      const targetType = accountType.toLowerCase(); // 'real' or 'demo'
      const targetAccount = accounts.find(a => a.account_type === targetType);

      if (!targetAccount) {
        throw new Error(`Conta ${accountType} não encontrada no seu perfil da Deriv.`);
      }

      // 2. Busca a URL do OTP
      const otpRes = await axios.post(`https://api.derivws.com/trading/v1/options/accounts/${targetAccount.account_id}/otp`, {}, {
        headers: { 'Deriv-App-ID': finalAppId, 'Authorization': `Bearer ${token}` }
      });

      const wsUrl = otpRes.data.data.url;
      
      // 3. Conecta no WebSocket já autenticado
      connection = new WebSocket(wsUrl);
      
      // Criamos uma Promise para aguardar a resposta da profit_table manualmente
      const transactions = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout aguardando histórico de operações da Deriv'));
        }, 15000);

        connection.on('open', () => {
          connection.send(JSON.stringify({ profit_table: 1, description: 1, sort: 'DESC', limit: limit }));
        });

        connection.on('message', (data) => {
          const response = JSON.parse(data);
          if (response.error) {
            clearTimeout(timeout);
            reject(new Error(response.error.message));
          } else if (response.msg_type === 'profit_table') {
            clearTimeout(timeout);
            resolve(response.profit_table.transactions || []);
          }
        });

        connection.on('error', (err) => {
          clearTimeout(timeout);
          reject(new Error('Erro no WebSocket: ' + err.message));
        });
      });

      return await processTransactions(transactions, userId, accountType, finalAppId);
    } else {
      // Fluxo Clássico
      connection = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${finalAppId}`);
      api = new DerivAPI({ connection });

      await api.authorize(token);

      console.log('Buscando profit_table via DerivAPI Clássico...');
      const response = await api.profitTable({
        profit_table: 1,
        description: 1,
        sort: 'DESC',
        limit: limit
      });

      const transactions = response.profit_table.transactions || [];
      return await processTransactions(transactions, userId, accountType, finalAppId);
    }
  } catch (error) {
    console.error('Erro na API da Deriv:', error.message);
    throw new Error('Falha ao conectar ou ler dados da Deriv: ' + error.message);
  } finally {
    if (connection) {
      connection.close();
    }
  }
}

async function processTransactions(transactions, userId, accountType, finalAppId) {
  console.log(`Foram encontrados ${transactions.length} trades.`);
  let syncedCount = 0;

  for (const trade of transactions) {
    // Removida a trava de app_id para permitir que operações de robôs sejam sincronizadas
    // if (trade.app_id && String(trade.app_id) !== String(finalAppId)) {
    //   continue;
    // }

    const result = parseFloat(trade.sell_price) > parseFloat(trade.buy_price) ? 'WIN' : 'LOSS';
    const profitLoss = parseFloat(trade.sell_price) - parseFloat(trade.buy_price);
    
    const fullDate = new Date(trade.purchase_time * 1000);
    
    const formatterDate = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' });
    const formatterTime = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    
    const partsDate = formatterDate.formatToParts(fullDate);
    const day = partsDate.find(p => p.type === 'day').value;
    const month = partsDate.find(p => p.type === 'month').value;
    const year = partsDate.find(p => p.type === 'year').value;
    
    const operation = {
      user_id: userId,
      account_type: accountType,
      transaction_id: trade.transaction_id.toString(), // ID Único
      operation_date: `${year}-${month}-${day}`,
      operation_time: formatterTime.format(fullDate),
      asset: trade.shortcode.split('_')[1] || trade.shortcode, // Extrai R_100 ou V100 etc
      operation_type: trade.shortcode.includes('CALL') ? 'CALL' : 'PUT',
      entry_value: parseFloat(trade.buy_price),
      result: result,
      profit_loss: profitLoss,
      observations: `Sincronizado da Deriv (Contrato ${trade.contract_id})`
    };

    const { error } = await supabase.from('operations')
      .upsert(operation, { onConflict: 'transaction_id' });

    if (!error) {
      syncedCount++;
    } else {
      console.error("Erro ao inserir operação:", error.message);
    }
  }

  return { success: true, count: syncedCount };
}

/**
 * Valida o token testando a conexão
 */
async function validateToken(token, appId = null) {
  const isNewFlow = isAlphanumericAppId(appId);
  const finalAppId = appId || DEFAULT_APP_ID;
  
  if (isNewFlow) {
    try {
      const accountsRes = await axios.get('https://api.derivws.com/trading/v1/options/accounts', {
        headers: { 'Deriv-App-ID': finalAppId, 'Authorization': `Bearer ${token}` },
        timeout: 10000
      });
      
      const accounts = accountsRes.data.data;
      const account_list = accounts.map(a => ({
        loginid: a.account_id,
        is_virtual: a.account_type === 'demo' ? 1 : 0,
        currency: a.currency,
        account_category: 'trading'
      }));

      const realAcc = account_list.find(a => a.is_virtual === 0) || account_list[0];

      return {
        valid: true,
        account: realAcc.loginid,
        currency: realAcc.currency,
        account_list: account_list
      };
    } catch (error) {
      const msg = error.response ? error.response.data.error?.message || `Erro HTTP ${error.response.status}` : error.message;
      return { valid: false, error: 'Falha na validação REST: ' + msg };
    }
  } else {
    // Fluxo clássico
    return new Promise((resolve) => {
      const connection = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${finalAppId}`);
      const api = new DerivAPI({ connection });

      const timeout = setTimeout(() => {
        connection.close();
        resolve({ valid: false, error: 'O servidor da Deriv não respondeu (App ID inválido?)' });
      }, 10000);

      connection.on('error', (err) => {
        clearTimeout(timeout);
        connection.close();
        resolve({ valid: false, error: 'Erro de conexão: ' + err.message });
      });
      
      connection.on('unexpected-response', (request, response) => {
         clearTimeout(timeout);
         resolve({ valid: false, error: `App ID Rejeitado (Erro HTTP ${response.statusCode})` });
      });

      api.authorize(token).then((auth) => {
        clearTimeout(timeout);
        resolve({ 
          valid: true, 
          account: auth.authorize.loginid, 
          currency: auth.authorize.currency,
          account_list: auth.authorize.account_list 
        });
      }).catch((error) => {
        clearTimeout(timeout);
        resolve({ valid: false, error: error.message });
      }).finally(() => {
        connection.close();
      });
    });
  }
}

/**
 * Extrai os tokens clássicos (Real e Demo) a partir de um PAT Token
 */
async function extractTokensFromPAT(patToken, appId = null) {
  const isNewFlow = isAlphanumericAppId(appId);
  
  const validation = await validateToken(patToken, appId);
  if (!validation.valid || !validation.account_list) {
    return { success: false, error: validation.error || 'Não foi possível ler a lista de contas.' };
  }

  if (isNewFlow) {
    return {
      success: true,
      realToken: patToken,
      demoToken: patToken
    };
  }

  const accountList = validation.account_list;
  
  // Real token: Não é virtual e é conta de trading
  const realAccount = accountList.find(a => a.is_virtual === 0 && a.account_category === 'trading');
  // Demo token: É virtual
  const demoAccount = accountList.find(a => a.is_virtual === 1);

  return {
    success: true,
    realToken: realAccount ? realAccount.token : null,
    demoToken: demoAccount ? demoAccount.token : null
  };
}

/**
 * Retorna informações de diagnóstico e saldo da conta
 */
async function getDiagnosticInfo(token, appId = null) {
  const isNewFlow = isAlphanumericAppId(appId);
  const finalAppId = appId || DEFAULT_APP_ID;

  if (isNewFlow) {
    try {
      const accountsRes = await axios.get('https://api.derivws.com/trading/v1/options/accounts', {
        headers: { 'Deriv-App-ID': finalAppId, 'Authorization': `Bearer ${token}` }
      });
      const realAcc = accountsRes.data.data.find(a => a.account_type === 'real') || accountsRes.data.data[0];
      
      return { 
        status: 'OK',
        account: realAcc.account_id,
        currency: realAcc.currency,
        balance: realAcc.balance
      };
    } catch (error) {
      return { status: 'ERROR', error: error.message };
    }
  } else {
    let connection;
    try {
      connection = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${finalAppId}`);
      const api = new DerivAPI({ connection });

      const auth = await api.authorize(token);
      const balanceResponse = await api.balance();
      
      return { 
        status: 'OK',
        account: auth.authorize.loginid,
        currency: balanceResponse.balance.currency,
        balance: balanceResponse.balance.balance
      };
    } catch (error) {
      return { status: 'ERROR', error: error.message };
    } finally {
      if (connection) connection.close();
    }
  }
}

module.exports = {
  syncDerivOperations,
  validateToken,
  getDiagnosticInfo,
  extractTokensFromPAT
};
