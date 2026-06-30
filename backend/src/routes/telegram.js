const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');
const axios = require('axios');

// POST /api/telegram/config — Salvar as configurações do Telegram do usuário
router.post('/config', authMiddleware, async (req, res) => {
  try {
    const { telegram_bot_token, telegram_chat_id } = req.body;
    const userId = req.userId;

    const { data, error } = await supabase
      .from('user_profiles')
      .update({ 
        telegram_bot_token, 
        telegram_chat_id 
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    res.json({ message: 'Configurações salvas com sucesso', profile: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/telegram/notify — Enviar mensagem via Telegram
router.post('/notify', authMiddleware, async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.userId;

    if (!message) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }

    // Busca configurações do usuário
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('telegram_bot_token, telegram_chat_id')
      .eq('id', userId)
      .single();

    if (error) throw error;

    if (!profile || !profile.telegram_bot_token || !profile.telegram_chat_id) {
      return res.status(400).json({ error: 'Configuração do Telegram incompleta.' });
    }

    // Dispara via API do Telegram
    const url = `https://api.telegram.org/bot${profile.telegram_bot_token}/sendMessage`;
    const response = await axios.post(url, {
      chat_id: profile.telegram_chat_id,
      text: message,
      parse_mode: 'Markdown'
    });

    res.json({ success: true, message: 'Notificação enviada.' });
  } catch (err) {
    console.error('Erro ao enviar notificação Telegram:', err.response?.data || err.message);
    res.status(500).json({ error: 'Falha ao enviar notificação para o Telegram.' });
  }
});

module.exports = router;
