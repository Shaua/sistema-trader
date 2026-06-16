const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const statsEngine = require('../services/statsEngine');

/**
 * GET /api/reports/monthly — relatório mensal em JSON (base para PDF/Excel)
 */
router.get('/monthly', authMiddleware, async (req, res) => {
  try {
    const { year, month } = req.query;
    const now = new Date();
    const targetYear = parseInt(year || now.getFullYear());
    const targetMonth = parseInt(month || now.getMonth() + 1);
    const from = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
    const lastDay = new Date(targetYear, targetMonth, 0).getDate();
    const to = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${lastDay}`;

    const supabase = require('../config/supabase');
    const [ops, withdrawals, deposits, kpis] = await Promise.all([
      supabase.from('operations').select('*').eq('user_id', req.userId).gte('operation_date', from).lte('operation_date', to).order('operation_date'),
      supabase.from('withdrawals').select('*').eq('user_id', req.userId).gte('withdrawal_date', from).lte('withdrawal_date', to),
      supabase.from('deposits').select('*').eq('user_id', req.userId).gte('deposit_date', from).lte('deposit_date', to),
      statsEngine.calculateDashboardKPIs(req.userId)
    ]);

    const operations = ops.data || [];
    const wins = operations.filter(o => o.result === 'WIN');
    const losses = operations.filter(o => o.result === 'LOSS');

    res.json({
      period: { year: targetYear, month: targetMonth, from, to },
      summary: {
        total_operations: operations.length,
        wins: wins.length,
        losses: losses.length,
        win_rate: operations.length > 0 ? ((wins.length / operations.length) * 100).toFixed(2) : 0,
        gross_profit: wins.reduce((sum, o) => sum + parseFloat(o.profit_loss), 0).toFixed(2),
        gross_loss: Math.abs(losses.reduce((sum, o) => sum + parseFloat(o.profit_loss), 0)).toFixed(2),
        net_result: operations.reduce((sum, o) => sum + parseFloat(o.profit_loss), 0).toFixed(2),
        total_withdrawn: (withdrawals.data || []).reduce((sum, w) => sum + parseFloat(w.gross_amount), 0).toFixed(2),
        total_deposited: (deposits.data || []).reduce((sum, d) => sum + parseFloat(d.amount), 0).toFixed(2)
      },
      operations: operations,
      withdrawals: withdrawals.data || [],
      deposits: deposits.data || []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
