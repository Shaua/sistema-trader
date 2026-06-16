const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');

// Middleware extra para garantir que é admin
const requireAdmin = (req, res, next) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }
  next();
};

// GET /api/admin/users — Listar todos os traders
router.get('/users', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select(`
        id, name, email, role, created_at,
        bank_configs ( current_balance, currency, operational_profile, is_active )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/user/:userId — Detalhes do trader (Banca e Risco)
router.get('/user/:userId', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Obter perfil
    const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', userId).single();
    
    // Obter config banca
    const { data: bank } = await supabase.from('bank_configs').select('*').eq('user_id', userId).eq('is_active', true).single();
    
    // Obter config risco
    const { data: risk } = await supabase.from('risk_configs').select('*').eq('user_id', userId).single();

    res.json({ profile, bank, risk });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/bank/:userId — Admin editar banca do trader
router.put('/bank/:userId', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const { data: existing } = await supabase.from('bank_configs').select('id').eq('user_id', userId).eq('is_active', true).single();

    if (existing) {
      const { data, error } = await supabase.from('bank_configs').update(req.body).eq('id', existing.id).select().single();
      if (error) throw error;
      res.json(data);
    } else {
      const { data, error } = await supabase.from('bank_configs').insert({ ...req.body, user_id: userId, is_active: true }).select().single();
      if (error) throw error;
      res.json(data);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/risk/:userId — Admin editar risco do trader
router.put('/risk/:userId', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: existing } = await supabase.from('risk_configs').select('id').eq('user_id', userId).single();

    if (existing) {
      const { data, error } = await supabase.from('risk_configs').update(req.body).eq('id', existing.id).select().single();
      if (error) throw error;
      res.json(data);
    } else {
      const { data, error } = await supabase.from('risk_configs').insert({ ...req.body, user_id: userId }).select().single();
      if (error) throw error;
      res.json(data);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
