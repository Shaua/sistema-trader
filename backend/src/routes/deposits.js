const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');

// GET /api/deposits
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('deposits').select('*').eq('user_id', req.userId)
      .order('deposit_date', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/deposits
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { deposit_date, amount, method, observations } = req.body;
    const { data, error } = await supabase.from('deposits').insert({
      user_id: req.userId, deposit_date,
      amount: parseFloat(amount), method, observations
    }).select().single();

    if (error) throw error;
    await supabase.rpc('recalculate_balance', { p_user_id: req.userId });
    res.status(201).json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/deposits/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase.from('deposits').delete().eq('id', req.params.id).eq('user_id', req.userId);
    if (error) throw error;
    await supabase.rpc('recalculate_balance', { p_user_id: req.userId });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
