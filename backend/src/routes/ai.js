const express = require('express');
const router = express.Router();
const aiService = require('../services/ai.service');

// Middleware para verificar se a IA está inicializada
const requireAI = (req, res, next) => {
  if (!aiService.isInitialized) {
    return res.status(503).json({ error: 'Serviço de Inteligência Artificial indisponível ou não configurado.' });
  }
  next();
};

router.post('/chat', requireAI, async (req, res) => {
  try {
    const { message, botState, balance } = req.body;

    const systemInstruction = `Você é um Advisor de Trading de alta performance especialista em opções binárias sintéticas na Deriv.
O usuário está operando índices de volatilidade (ex: Volatility 10 Index) com duração de 1 Tick, tentando prever dígitos menores que 8 (DIGITUNDER).
O robô atual trabalha via web.
Aqui está o estado atual do robô do usuário:
- Banca atual: $${balance}
- Configuração do Robô: ${JSON.stringify(botState.config || {})}
- Diagnóstico / Status: ${JSON.stringify(botState.stats || {})}

Você deve responder SEMPRE em formato JSON estrito (sem comentários) com a seguinte estrutura:
{
  "reply": "A sua mensagem de resposta em Markdown para o usuário, seja conciso e estratégico.",
  "suggestedConfigChanges": {
     "mode": "veloz",
     "lossLimit": 15,
     "targetProfit": 2,
     "riskManagement": "conservador"
  }
}
Instruções sobre os campos:
- suggestedConfigChanges: Apenas se o usuário pedir para mudar algo, retorne as chaves/valores.
- mode: opções são "veloz", "balanceado", "preciso", "hibrido"
- riskManagement: opções são "conservador", "agressivo", "amortizacao"
Não inclua crases de markdown no JSON retornado.`;

    const result = await aiService.processChat(message, systemInstruction);
    res.json(result);
  } catch (error) {
    console.error('[AI Route] Erro no /chat:', error);
    res.status(500).json({ error: 'Erro ao processar mensagem com a IA.' });
  }
});

router.post('/analyze', requireAI, async (req, res) => {
  try {
    const { trades } = req.body;

    const systemInstruction = `Você é um analista de dados quantitativos de alta frequência.
Analise os trades e devolva um JSON com:
{
  "report": "Um relatório descritivo (em Markdown) das estatísticas, horários perigosos e recomendações.",
  "score": "Uma nota de 0 a 10 para o gerenciamento de risco atual",
  "recommendedMode": "O modo recomendado (veloz, balanceado, preciso, hibrido)"
}`;

    const message = `Aqui estão os últimos ${trades.length} trades: ${JSON.stringify(trades)}`;
    
    const result = await aiService.processChat(message, systemInstruction);
    res.json(result);
  } catch (error) {
    console.error('[AI Route] Erro no /analyze:', error);
    res.status(500).json({ error: 'Erro ao analisar trades com a IA.' });
  }
});

router.post('/regulate', requireAI, async (req, res) => {
  try {
    const { stats, config } = req.body;

    const systemInstruction = `Você é um robô de Risco e Compliance de alta frequência (Auto-Pilot).
O usuário ativou você para monitorar e intervir nas operações caso necessário.
Aqui estão as estatísticas atuais da sessão:
- Lucro: $${stats.profit} (Meta: $${config.targetProfit})
- WinRate atual: ${(stats.wins / (stats.wins + stats.losses || 1) * 100).toFixed(2)}%
- Perdas Virtuais / Nível de Martingale: ${stats.martingaleLevel}
- Dígitos recentes ruins (alta concentração de 8 e 9?): Últimos dígitos: ${JSON.stringify(stats.recentDigits?.slice(-20) || [])}
- Modo Atual: ${config.mode}
- Gerenciamento Atual: ${config.riskManagement}

Avalie a situação e decida se deve intervir com uma pausa.
Responda APENAS com um JSON estrito (sem comentários) neste formato:
{
  "action": "continue",
  "duration_ticks": 0,
  "reason": "Sua justificativa para a ação, será exibida na tela do usuário."
}
Instruções sobre os campos:
- action: pode ser "continue" ou "pause". Você NÃO PODE alterar modo, gerenciamento ou estratégia. Apenas pausar.
- duration_ticks: se action for "pause", quantidade de ticks para resfriar (ex: 300 = 5 mins).
Não coloque crases markdown no JSON.`;

    const result = await aiService.processChat('Analise os dados e aja.', systemInstruction);
    res.json(result);
  } catch (error) {
    console.error('[AI Route] Erro no /regulate:', error);
    res.status(500).json({ error: 'Erro no regulador' });
  }
});

// Força o gatilho de relatório (uso manual/teste)
router.post('/force-report', requireAI, async (req, res) => {
  try {
    const { type } = req.body; // 'diário', 'semanal', 'mensal'
    const cronService = require('../services/cronService');
    
    // Roda em background
    cronService.generateAndSendReport(type || 'diário');
    
    res.json({ success: true, message: `Geração de relatório ${type || 'diário'} iniciada em background.` });
  } catch (error) {
    console.error('[AI Route] Erro no /force-report:', error);
    res.status(500).json({ error: 'Erro ao forçar relatório' });
  }
});

module.exports = router;
