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

Você deve responder SEMPRE em formato JSON com a seguinte estrutura:
{
  "reply": "A sua mensagem de resposta em Markdown para o usuário, seja conciso e estratégico.",
  "suggestedConfigChanges": { // Apenas se o usuário pedir para mudar algo, retorne as chaves/valores da config para alterar.
     "mode": "veloz", // ou "balanceado", "preciso", "hibrido"
     "lossLimit": 15,
     "targetProfit": 2,
     "riskManagement": "conservador" // ou "agressivo", "amortizacao"
  }
}
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
    const { stats, recentTrades } = req.body;
    // ... Implementação do regulador
    res.json({ status: 'ok' });
  } catch (error) {
    res.status(500).json({ error: 'Erro no regulador' });
  }
});

module.exports = router;
