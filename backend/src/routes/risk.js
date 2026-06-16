const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');

// GET /api/risk — obter configuração de risco
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('risk_configs').select('*').eq('user_id', req.userId).single();
    if (error && error.code !== 'PGRST116') throw error;
    res.json(data || null);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/risk — criar/atualizar configuração de risco
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('risk_configs')
      .upsert({ user_id: req.userId, ...req.body }, { onConflict: 'user_id' })
      .select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
