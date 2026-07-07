const cron = require('node-cron');
const supabase = require('../config/supabase');
const statsEngine = require('./statsEngine');
const aiService = require('./ai.service');
const axios = require('axios');

class CronService {
  start() {
    console.log('[CronService] Iniciando agendamentos...');

    // Relatório Diário: Todos os dias às 23:50
    cron.schedule('50 23 * * *', () => {
      console.log('[CronService] Disparando Relatório Diário');
      this.generateAndSendReport('diário');
    });

    // Relatório Semanal: Todo Domingo às 23:55
    cron.schedule('55 23 * * 0', () => {
      console.log('[CronService] Disparando Relatório Semanal');
      this.generateAndSendReport('semanal');
    });

    // Relatório Mensal: Último dia do mês às 23:59 (truque: checar no último dia não é direto no cron padrão, 
    // mas '59 23 28-31 * *' funciona com checagem adicional, para simplificar vamos fazer dia 1 as 00:01 do mes seguinte)
    cron.schedule('1 0 1 * *', () => {
      console.log('[CronService] Disparando Relatório Mensal');
      this.generateAndSendReport('mensal');
    });
  }

  async generateAndSendReport(type) {
    try {
      // 1. Pegar usuários
      const { data: users, error } = await supabase.from('user_profiles').select('id');
      if (error || !users || users.length === 0) return;

      for (const user of users) {
        // 2. Pegar estatísticas da conta REAL e DEMO
        let stats = await statsEngine.calculateDashboardKPIs(user.id, { accountType: 'REAL' });
        let accountName = 'REAL';
        
        if (!stats || stats.totalOperations === 0) {
          stats = await statsEngine.calculateDashboardKPIs(user.id, { accountType: 'DEMO' });
          accountName = 'DEMO (TREINAMENTO)';
        }
        
        if (!stats || stats.totalOperations === 0) continue;

        // 3. Montar Prompt para IA
        const systemInstruction = `Você é um Analista de Dados Quantitativo (Analista Sazonal).
Seu objetivo é analisar os dados de um trader e gerar um relatório ${type}.
Seja direto, profissional e focado em insights matemáticos e horários/dias que dão lucro ou prejuízo.
Utilize formatação amigável para o Telegram (Markdown com * e _) e Emojis.

DADOS DA CONTA ${accountName}:
- Total Operações: ${stats.totalOperations}
- WinRate: ${stats.winRate.toFixed(2)}%
- Lucro Acumulado: $${stats.accumulatedProfit.toFixed(2)}
- Melhor Sequência de Vitórias: ${stats.maxWinStreak}
- Pior Sequência de Derrotas: ${stats.maxLossStreak}
- Dias Positivos: ${stats.positiveDays} / Negativos: ${stats.negativeDays}
- Payoff: ${stats.payoff.toFixed(2)}

Analise os dados e crie um relatório curto (máximo 4 parágrafos) com o título "📊 *RELATÓRIO ${type.toUpperCase()} IA* 📊".
Aponte pontos fortes, pontos fracos e dê UMA sugestão prática sazonal.
MUITO IMPORTANTE: Você deve retornar o resultado EXCLUSIVAMENTE em formato JSON válido, contendo uma única propriedade chamada "reply" que armazena todo o texto do relatório. Não retorne mais nada além do JSON.
Exemplo: { "reply": "seu texto do relatorio aqui" }`;

        // 4. Chamar IA
        const aiResult = await aiService.processChat('Por favor, gere meu relatório.', systemInstruction);

        if (aiResult.reply) {
          // 5. Enviar para Telegram
          await this.sendTelegramAlert(aiResult.reply, user.id);
        }
      }
    } catch (err) {
      console.error('[CronService] Erro ao gerar relatório:', err.message);
      // Attempt to notify admin or user about the crash
      try {
        const { data: users } = await supabase.from('user_profiles').select('id');
        if (users && users.length > 0) {
          if (err.isQuotaError || err.status === 429 || err.message?.includes('429') || err.message?.includes('quota') || err.message?.includes('RESOURCE_EXHAUSTED')) {
            await this.sendTelegramAlert(`⚠️ *Aviso de Limite da IA* ⚠️\n\nO limite gratuito diário da inteligência artificial foi atingido (Quota exceeded). Por favor, aguarde alguns minutos ou atualize sua chave de API do Gemini para continuar recebendo análises.`, users[0].id);
          } else {
            await this.sendTelegramAlert(`⚠️ *Falha Crítica no Auto-Pilot / Relatório IA* ⚠️\n\nErro interno detectado: _${err.message}_`, users[0].id);
          }
        }
      } catch(e) {}
    }
  }

  async sendTelegramAlert(message, userId) {
    try {
      if (!userId) {
        console.warn('Telegram desativado. UserId não fornecido para o cronService.');
        return;
      }
      
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('telegram_bot_token, telegram_chat_id')
        .eq('id', userId)
        .single();
        
      const botToken = profile?.telegram_bot_token;
      const chatId = profile?.telegram_chat_id;
      
      if (!botToken || !chatId) {
        console.warn('Telegram desativado. Chaves ausentes no perfil do usuário.');
        return;
      }

      try {
        await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown'
        });
      } catch (telegramErr) {
        if (telegramErr.response && telegramErr.response.status === 400) {
          // Fallback to plain text if Markdown parsing failed (very common with AI generated text)
          console.warn('Falha no parse do Markdown. Tentando envio em texto puro...');
          await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            chat_id: chatId,
            text: message
          });
        } else {
          throw telegramErr;
        }
      }
    } catch (err) {
      console.error('Erro ao notificar Telegram:', err.response?.data || err.message);
    }
  }
}

module.exports = new CronService();
