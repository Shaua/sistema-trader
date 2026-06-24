const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');
const statsEngine = require('../services/statsEngine');

// GET /api/stats/dashboard — KPIs do dashboard
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const filters = {
      ...req.query,
      accountType: req.headers['x-account-type'] || 'REAL'
    };
    const kpis = await statsEngine.calculateDashboardKPIs(req.userId, filters);
    if (!kpis) {
      return res.json({ configured: false, message: 'Configure sua banca primeiro' });
    }

    // Auto-correção do saldo real da Deriv e auto-sync de operações
    try {
      const { data: profile } = await supabase.from('user_profiles').select('deriv_token, deriv_demo_token').eq('id', req.userId).single();
      const token = filters.accountType === 'DEMO' ? profile?.deriv_demo_token : profile?.deriv_token;
      
      if (token) {
        const derivApi = require('../services/derivApi');
        const brokerInfo = await derivApi.getDiagnosticInfo(token);
        
        if (brokerInfo.status === 'OK' && brokerInfo.balance !== undefined) {
          const realBalance = parseFloat(brokerInfo.balance);
          
          // Se o saldo calculado estiver diferente do saldo real na Deriv
          if (Math.abs(kpis.currentBalance - realBalance) > 0.01) {
            console.log(`[Sync] Corrigindo saldo de ${kpis.currentBalance} para ${realBalance} (${filters.accountType})`);
            kpis.currentBalance = realBalance;
            
            // Ajusta o initial_balance para a matemática bater
            const correctedInitialBalance = realBalance - kpis.accumulatedProfit - kpis.totalDeposited + kpis.totalWithdrawn;
            kpis.initialBalance = correctedInitialBalance;
            
            // Atualiza no banco de dados
            await supabase.from('bank_configs').update({ 
              initial_balance: correctedInitialBalance,
              current_balance: realBalance
            }).eq('id', kpis.bankConfig.id);
          }
        }
        
        // Dispara um auto-sync de operações pendentes em background (não aguardamos terminar para não bloquear)
        derivApi.syncDerivOperations(token, req.userId, 50, filters.accountType).catch(e => console.error('[AutoSync Error]', e.message));
      }
    } catch (e) {
      console.error('Erro na auto-correção do saldo Deriv:', e.message);
    }

    res.json({ configured: true, ...kpis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats/charts — dados para gráficos
router.get('/charts', authMiddleware, async (req, res) => {
  try {
    const filters = { ...req.query, accountType: req.headers['x-account-type'] || 'REAL' };
    const charts = await statsEngine.getChartData(req.userId, filters);
    res.json(charts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats/alerts — alertas de risco
router.get('/alerts', authMiddleware, async (req, res) => {
  try {
    const filters = { ...req.query, accountType: req.headers['x-account-type'] || 'REAL' };
    const alerts = await statsEngine.checkRiskAlerts(req.userId, filters);
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats/insights — inteligência operacional
router.get('/insights', authMiddleware, async (req, res) => {
  try {
    const filters = { ...req.query, accountType: req.headers['x-account-type'] || 'REAL' };
    const insights = await statsEngine.generateInsights(req.userId, filters);
    res.json(insights);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
