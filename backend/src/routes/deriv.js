const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const supabase = require('../config/supabase');
const derivApi = require('../services/derivApi');

// Rota protegida: Salvar os Tokens da Deriv
router.post('/token', authMiddleware, async (req, res) => {
  try {
    const { deriv_token, deriv_demo_token } = req.body;
    
    // Validate Real Token
    if (deriv_token) {
      const validation = await derivApi.validateToken(deriv_token);
      if (!validation.valid) {
        return res.status(400).json({ error: 'Token Real inválido: ' + validation.error });
      }
      if (validation.account.startsWith('VRTC')) {
        return res.status(400).json({ error: 'Token Real não pode ser uma conta virtual (VRTC).' });
      }
    }

    // Validate Demo Token
    if (deriv_demo_token) {
      const validation = await derivApi.validateToken(deriv_demo_token);
      if (!validation.valid) {
        return res.status(400).json({ error: 'Token Demo inválido: ' + validation.error });
      }
      if (!validation.account.startsWith('VRTC')) {
        return res.status(400).json({ error: 'Token Demo deve ser uma conta virtual (VRTC).' });
      }
    }

    // Atualiza o perfil do usuário no Supabase
    const { error: dbError } = await supabase
      .from('user_profiles')
      .update({ deriv_token, deriv_demo_token })
      .eq('id', req.userId);

    if (dbError) {
      return res.status(500).json({ error: 'Erro ao salvar tokens no banco', details: dbError.message });
    }

    res.json({ message: 'Tokens salvos com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  }
});

// Rota protegida: Disparar sincronização
router.post('/sync', authMiddleware, async (req, res) => {
  try {
    const accountType = req.headers['x-account-type'] || 'REAL';

    // 1. Busca o token do usuário no banco
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('deriv_token, deriv_demo_token')
      .eq('id', req.userId)
      .single();

    if (error || !profile) {
      return res.status(400).json({ error: 'Perfil não encontrado.' });
    }

    const tokenToUse = accountType === 'DEMO' ? profile.deriv_demo_token : profile.deriv_token;

    if (!tokenToUse) {
      return res.status(400).json({ error: `Nenhum token da Deriv encontrado para a conta ${accountType}.` });
    }

    // 2. Executa a sincronização chamando a API da Deriv
    const result = await derivApi.syncDerivOperations(tokenToUse, req.userId, 500, accountType);

    res.json({ message: 'Sincronização concluída com sucesso', synced_count: result.count });
  } catch (error) {
    res.status(500).json({ error: 'Erro durante a sincronização', details: error.message });
  }
});

module.exports = router;
