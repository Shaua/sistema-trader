const WebSocket = require('ws');
const DerivAPI = require('@deriv/deriv-api/dist/DerivAPIBasic');
const supabase = require('../config/supabase');

const APP_ID = 1089; // Default testing App ID

/**
 * Conecta na Deriv e busca as últimas operações
 */
async function syncDerivOperations(token, userId, limit = 500) {
  const connection = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${APP_ID}`);
  const api = new DerivAPI({ connection });

  try {
    console.log(`Autenticando na Deriv para usuário ${userId}...`);
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
