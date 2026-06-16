const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');

// GET /api/operations — listar operações
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { date, from, to, result, limit = 100, offset = 0 } = req.query;
    
    let query = supabase.from('operations').select('*').eq('user_id', req.userId);
    
    if (date) query = query.eq('operation_date', date);
    if (from) query = query.gte('operation_date', from);
    if (to) query = query.lte('operation_date', to);
    if (result) query = query.eq('result', result);
    
    query = query.order('operation_date', { ascending: false })
                 .order('operation_time', { ascending: false })
                 .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
    
    const { data, error, count } = await query;
    if (error) throw error;
    res.json({ data, total: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/operations — registrar nova operação
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      operation_date, operation_time, asset, operation_type,
      entry_value, result, profit_loss, observations, print_url
    } = req.body;

    // Calcular ROI da operação
    const roi_pct = entry_value > 0 ? (profit_loss / entry_value) * 100 : 0;

    const { data, error } = await supabase
      .from('operations')
      .insert({
        user_id: req.userId,
        operation_date,
        operation_time: operation_time || new Date().toTimeString().split(' ')[0],
        asset,
        operation_type,
        entry_value: parseFloat(entry_value),
        result,
        profit_loss: parseFloat(profit_loss),
        roi_pct: parseFloat(roi_pct.toFixed(4)),
        observations,
        print_url
      })
      .select()
      .single();

    if (error) throw error;

    // Recalcular saldo
    await supabase.rpc('recalculate_balance', { p_user_id: req.userId });

    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/operations/:id — atualizar operação
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    if (updates.entry_value && updates.profit_loss) {
      updates.roi_pct = (updates.profit_loss / updates.entry_value) * 100;
    }

    const { data, error } = await supabase
      .from('operations')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.userId)
      .select()
      .single();

    if (error) throw error;
    await supabase.rpc('recalculate_balance', { p_user_id: req.userId });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/operations/:id — deletar operação
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase
      .from('operations')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId);

    if (error) throw error;
    await supabase.rpc('recalculate_balance', { p_user_id: req.userId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
