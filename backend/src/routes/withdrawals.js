const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');

// GET /api/withdrawals
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('withdrawals').select('*').eq('user_id', req.userId)
      .order('withdrawal_date', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/withdrawals
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { withdrawal_date, gross_amount, dollar_rate, fee_pct, method, observations } = req.body;
    const fee_amount = (parseFloat(gross_amount) * parseFloat(fee_pct || 0)) / 100;
    const net_amount = parseFloat(gross_amount) - fee_amount;

    const { data, error } = await supabase.from('withdrawals').insert({
      user_id: req.userId, withdrawal_date,
      gross_amount: parseFloat(gross_amount),
      dollar_rate: dollar_rate ? parseFloat(dollar_rate) : null,
      fee_pct: parseFloat(fee_pct || 0), fee_amount, net_amount, method, observations
    }).select().single();

    if (error) throw error;
    await supabase.rpc('recalculate_balance', { p_user_id: req.userId });
    res.status(201).json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/withdrawals/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase.from('withdrawals').delete().eq('id', req.params.id).eq('user_id', req.userId);
    if (error) throw error;
    await supabase.rpc('recalculate_balance', { p_user_id: req.userId });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
