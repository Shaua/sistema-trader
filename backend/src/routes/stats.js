const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');
const statsEngine = require('../services/statsEngine');

// GET /api/stats/dashboard — KPIs do dashboard
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const kpis = await statsEngine.calculateDashboardKPIs(req.userId, req.query);
    if (!kpis) {
      return res.json({ configured: false, message: 'Configure sua banca primeiro' });
    }
    res.json({ configured: true, ...kpis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats/charts — dados para gráficos
router.get('/charts', authMiddleware, async (req, res) => {
  try {
    const charts = await statsEngine.getChartData(req.userId, req.query);
    res.json(charts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats/alerts — alertas de risco
router.get('/alerts', authMiddleware, async (req, res) => {
  try {
    const alerts = await statsEngine.checkRiskAlerts(req.userId, req.query);
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats/insights — inteligência operacional
router.get('/insights', authMiddleware, async (req, res) => {
  try {
    const insights = await statsEngine.generateInsights(req.userId, req.query);
    res.json(insights);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
