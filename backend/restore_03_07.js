require('dotenv').config();
const supabase = require('./src/config/supabase');
const axios = require('axios');
const WebSocket = require('ws');

async function run() {
  const userId = '61a5c940-36b8-4fe6-868f-b3a654e07eba';
  const accountType = 'DEMO';
  
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('deriv_token, deriv_app_id')
    .eq('id', userId)
    .single();
    
  if (profile && profile.deriv_token) {
    try {
      console.log('Restaurando operações DEMO da Deriv a partir de 03/07/2026 com paginação...');
      
      const token = profile.deriv_token;
      const finalAppId = profile.deriv_app_id || 1089;
      
      const accountsRes = await axios.get('https://api.derivws.com/trading/v1/options/accounts', {
        headers: { 'Deriv-App-ID': finalAppId, 'Authorization': `Bearer ${token}` }
      });
      
      const targetAccount = accountsRes.data.data.find(a => a.account_type === 'demo');

      const otpRes = await axios.post(`https://api.derivws.com/trading/v1/options/accounts/${targetAccount.account_id}/otp`, {}, {
        headers: { 'Deriv-App-ID': finalAppId, 'Authorization': `Bearer ${token}` }
      });

      const wsUrl = otpRes.data.data.url;
      const connection = new WebSocket(wsUrl);
      
      let allTransactions = [];
      let currentOffset = 0;
      let keepFetching = true;

      // Esperar a conexao abrir
      await new Promise((resolve) => connection.on('open', resolve));

      while (keepFetching) {
        const transactions = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Timeout na Deriv')), 15000);
          
          const messageHandler = (data) => {
            const response = JSON.parse(data);
            if (response.error) {
              clearTimeout(timeout);
              connection.removeListener('message', messageHandler);
              reject(new Error(response.error.message));
            } else if (response.msg_type === 'profit_table') {
              clearTimeout(timeout);
              connection.removeListener('message', messageHandler);
              resolve(response.profit_table.transactions || []);
            }
          };

          connection.on('message', messageHandler);
          connection.send(JSON.stringify({ 
            profit_table: 1, 
            description: 1, 
            sort: 'DESC', 
            date_from: 1719964800, // 2026-07-03 00:00:00 UTC
            limit: 500,
            offset: currentOffset
          }));
        });
        
        console.log(`Buscados ${transactions.length} trades no offset ${currentOffset}`);
        allTransactions = allTransactions.concat(transactions);
        
        if (transactions.length < 500) {
          keepFetching = false;
        } else {
          currentOffset += 500;
        }
      }
      
      connection.close();
      
      console.log(`Total encontrado: ${allTransactions.length} trades desde 03/07.`);
      
      let syncedCount = 0;
      for (const trade of allTransactions) {
        if (trade.app_id && String(trade.app_id) !== String(finalAppId)) continue;
        
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
          transaction_id: trade.transaction_id.toString(),
          operation_date: `${year}-${month}-${day}`,
          operation_time: formatterTime.format(fullDate),
          asset: trade.shortcode.split('_')[1] || trade.shortcode,
          operation_type: trade.shortcode.includes('CALL') ? 'CALL' : 'PUT',
          entry_value: parseFloat(trade.buy_price),
          result: result,
          profit_loss: profitLoss,
          observations: `Sincronizado da Deriv (Contrato ${trade.contract_id})`
        };

        const { error } = await supabase.from('operations')
          .upsert(operation, { onConflict: 'transaction_id' });

        if (!error) syncedCount++;
      }
      
      console.log(`Sincronizados ${syncedCount} trades no banco de dados.`);

      console.log('Apagando apenas as operações anteriores a 03/07/2026 (mantendo do dia 03 em diante)...');
      const { data, error } = await supabase
        .from('operations')
        .delete()
        .lt('operation_date', '2026-07-03')
        .eq('account_type', 'DEMO')
        .select('id');
        
      if (error) throw error;
      console.log(`Limpas ${data ? data.length : 0} operações residuais.`);
      
      console.log(`Recalculando saldo no banco para o usuário: ${userId}`);
      await supabase.rpc('recalculate_balance', { p_user_id: userId });
      
      console.log('Restauração finalizada com sucesso!');
    } catch (e) {
      console.error(e);
    }
  } else {
    console.log('Token não encontrado');
  }
}

run();
