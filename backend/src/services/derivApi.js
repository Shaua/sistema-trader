const WebSocket = require('ws');
const DerivAPI = require('@deriv/deriv-api/dist/DerivAPIBasic');
const supabase = require('../config/supabase');

const DEFAULT_APP_ID = 1089; // Default testing App ID

/**
 * Conecta na Deriv e busca as últimas operações
 */
async function syncDerivOperations(token, userId, limit = 500, accountType = 'REAL', appId = null) {
  const finalAppId = appId || DEFAULT_APP_ID;
  const connection = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${finalAppId}`);
  const api = new DerivAPI({ connection });

  try {
    console.log(`Autenticando na Deriv para usuário ${userId} (${accountType})...`);
    await api.authorize(token);

    console.log('Buscando profit_table...');
    const response = await api.profitTable({
      profit_table: 1,
      description: 1,
      sort: 'DESC',
      limit: limit // Busca os trades para sincronizar
    });

    const transactions = response.profit_table.transactions || [];
    console.log(`Foram encontrados ${transactions.length} trades.`);

    let syncedCount = 0;

    for (const trade of transactions) {
      console.log(`[DEBUG] Trade ${trade.transaction_id} app_id:`, trade.app_id);
      
      // Como a Deriv pode omitir o app_id, só ignoramos se houver um app_id explicitamente diferente
      if (trade.app_id && String(trade.app_id) !== String(finalAppId)) {
        continue;
      }

      // Converte dados da Deriv para o nosso modelo
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

      // Upsert: Se transaction_id já existe, ignora/atualiza.
      // O Supabase tem upsert. Precisamos usar onConflict
      const { error } = await supabase.from('operations')
        .upsert(operation, { onConflict: 'transaction_id' });

      if (!error) {
        syncedCount++;
      } else {
        console.error("Erro ao inserir operação:", error.message);
      }
    }

    return { success: true, count: syncedCount };
  } catch (error) {
    console.error('Erro na API da Deriv:', error.message);
    throw new Error('Falha ao conectar ou ler dados da Deriv. Verifique o Token.');
  } finally {
    connection.close();
  }
}

/**
 * Valida o token testando a conexão
 */
async function validateToken(token, appId = null) {
  const finalAppId = appId || DEFAULT_APP_ID;
  const connection = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${finalAppId}`);
  const api = new DerivAPI({ connection });

  try {
    const auth = await api.authorize(token);
    return { 
      valid: true, 
      account: auth.authorize.loginid, 
      currency: auth.authorize.currency,
      account_list: auth.authorize.account_list // Retorna a lista de contas também
    };
  } catch (error) {
    return { valid: false, error: error.message };
  } finally {
    connection.close();
  }
}

/**
 * Extrai os tokens clássicos (Real e Demo) a partir de um PAT Token
 */
async function extractTokensFromPAT(patToken, appId = null) {
  const validation = await validateToken(patToken, appId);
  if (!validation.valid || !validation.account_list) {
    return { success: false, error: validation.error || 'Não foi possível ler a lista de contas.' };
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
  const finalAppId = appId || DEFAULT_APP_ID;
  const connection = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${finalAppId}`);
  const api = new DerivAPI({ connection });

  try {
    const auth = await api.authorize(token);
    
    // Obter saldo
    const balanceResponse = await api.balance();
    const balance = balanceResponse.balance.balance;
    const currency = balanceResponse.balance.currency;

    return { 
      status: 'OK',
      account: auth.authorize.loginid,
      currency: currency,
      balance: balance
    };
  } catch (error) {
    return { status: 'ERROR', error: error.message };
  } finally {
    connection.close();
  }
}

module.exports = {
  syncDerivOperations,
  validateToken,
  getDiagnosticInfo,
  extractTokensFromPAT
};
