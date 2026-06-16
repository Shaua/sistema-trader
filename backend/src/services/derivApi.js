const WebSocket = require('ws');
const DerivAPI = require('@deriv/deriv-api');
const supabase = require('../config/supabase');

const APP_ID = 1089; // Default testing App ID

/**
 * Conecta na Deriv e busca as últimas operações
 */
async function syncDerivOperations(token, userId) {
  const connection = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${APP_ID}`);
  const api = new DerivAPI({ connection });

  try {
    console.log(`Autenticando na Deriv para usuário ${userId}...`);
    await api.authorize(token);

    console.log('Buscando profit_table...');
    const response = await api.basic.profitTable({
      profit_table: 1,
      description: 1,
      sort: 'DESC',
      limit: 50 // Busca os últimos 50 trades para sincronizar
    });

    const transactions = response.profit_table.transactions || [];
    console.log(`Foram encontrados ${transactions.length} trades.`);

    let syncedCount = 0;

    for (const trade of transactions) {
      // Converte dados da Deriv para o nosso modelo
      const result = parseFloat(trade.sell_price) > parseFloat(trade.buy_price) ? 'WIN' : 'LOSS';
      const profitLoss = parseFloat(trade.sell_price) - parseFloat(trade.buy_price);
      
      const operation = {
        user_id: userId,
        transaction_id: trade.transaction_id.toString(), // ID Único
        date: new Date(trade.purchase_time * 1000).toISOString().split('T')[0],
        asset: trade.shortcode.split('_')[1] || trade.shortcode, // Extrai R_100 ou V100 etc
        operation_type: trade.shortcode.includes('CALL') ? 'CALL' : 'PUT',
        entry_value: parseFloat(trade.buy_price),
        result: result,
        profit_loss: profitLoss,
        notes: `Sincronizado da Deriv (Contrato ${trade.contract_id})`
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
async function validateToken(token) {
  const connection = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${APP_ID}`);
  const api = new DerivAPI({ connection });

  try {
    const auth = await api.authorize(token);
    return { valid: true, account: auth.authorize.loginid, currency: auth.authorize.currency };
  } catch (error) {
    return { valid: false, error: error.message };
  } finally {
    connection.close();
  }
}

module.exports = {
  syncDerivOperations,
  validateToken
};
