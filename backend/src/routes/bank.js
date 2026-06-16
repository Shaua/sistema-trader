const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');

// GET /api/bank — obter configuração da banca
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('bank_configs')
      .select('*')
      .eq('user_id', req.userId)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    res.json(data || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bank — criar configuração
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      trader_name, broker, account_type, initial_balance, currency,
      operational_profile, daily_goal_pct, weekly_goal_pct, monthly_goal_pct
    } = req.body;

    // Desativar configuração anterior
    await supabase.from('bank_configs').update({ is_active: false }).eq('user_id', req.userId);

    const { data, error } = await supabase
      .from('bank_configs')
      .insert({
        user_id: req.userId,
        trader_name,
        broker: broker || 'Deriv',
        account_type,
        initial_balance: parseFloat(initial_balance),
        current_balance: parseFloat(initial_balance),
        currency,
        operational_profile,
        daily_goal_pct: parseFloat(daily_goal_pct),
        weekly_goal_pct: parseFloat(weekly_goal_pct),
        monthly_goal_pct: parseFloat(monthly_goal_pct),
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/bank/:id — atualizar configuração
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('bank_configs')
      .update(req.body)
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
