const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const supabase = require('../config/supabase');
const derivApi = require('../services/derivApi');

// Rota protegida: Validar e salvar o Token da Deriv
router.post('/validate', authMiddleware, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token não fornecido' });

    // 1. Testa a conexão com a Deriv
    const validation = await derivApi.validateToken(token);
    
    if (!validation.valid) {
      return res.status(400).json({ error: 'Token inválido', details: validation.error });
    }

    // 2. Salva o token no perfil do usuário no Supabase
    const { error: dbError } = await supabase
      .from('user_profiles')
      .update({ deriv_token: token })
      .eq('id', req.userId);

    if (dbError) {
      return res.status(500).json({ error: 'Erro ao salvar token no banco', details: dbError.message });
    }

    res.json({ message: 'Token validado e salvo com sucesso!', account: validation.account });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  }
});

// Rota protegida: Disparar sincronização
router.post('/sync', authMiddleware, async (req, res) => {
  try {
    // 1. Busca o token do usuário no banco
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('deriv_token')
      .eq('id', req.userId)
      .single();

    if (error || !profile || !profile.deriv_token) {
      return res.status(400).json({ error: 'Nenhum token da Deriv encontrado. Conecte sua conta primeiro.' });
    }

    // 2. Executa a sincronização chamando a API da Deriv
    const result = await derivApi.syncDerivOperations(profile.deriv_token, req.userId);

    res.json({ message: 'Sincronização concluída com sucesso', synced_count: result.count });
  } catch (error) {
    res.status(500).json({ error: 'Erro durante a sincronização', details: error.message });
  }
});

module.exports = router;
