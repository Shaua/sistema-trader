const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');

// POST /api/auth/profile — criar ou atualizar perfil após login
router.post('/profile', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.userId;

    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({ id: userId, name: name || req.user.email, email: req.user.email }, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/profile — obter perfil
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', req.userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    res.json(data || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
