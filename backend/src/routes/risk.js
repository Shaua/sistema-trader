const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');

// GET /api/risk — obter configuração de risco
router.get('/', authMiddleware, async (req, res) => {
  try {
    const accountType = req.headers['x-account-type'] || 'REAL';
    const { data, error } = await supabase
      .from('risk_configs').select('*').eq('user_id', req.userId)      .eq('account_type', accountType)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;
    res.json(data ? data[0] : null);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/risk — criar/atualizar configuração de risco
router.post('/', authMiddleware, async (req, res) => {
  try {
    const accountType = req.headers['x-account-type'] || 'REAL';
    
    // Como a constraint pode ser apenas user_id, se usarmos upsert com a tabela alterada e não houver constraint combinada, 
    // precisamos deletar e inserir, ou verificar a existência. 
    // Delete prev config for this account_type:
    await supabase.from('risk_configs').delete().eq('user_id', req.userId).eq('account_type', accountType);

    const { data, error } = await supabase
      .from('risk_configs')
      .insert({ user_id: req.userId, account_type: accountType, ...req.body })
      .select().single();
      
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
