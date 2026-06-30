const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const supabase = require('../config/supabase');
const derivApi = require('../services/derivApi');
const derivRealtime = require('../services/derivRealtime');
const logger = require('../utils/logger');

// Rota protegida: Salvar os Tokens da Deriv
router.post('/token', authMiddleware, async (req, res) => {
  try {
    let { deriv_token, deriv_demo_token, deriv_app_id } = req.body;
    
    const isNewFlow = (deriv_app_id && /[a-zA-Z]/.test(String(deriv_app_id)));

    // Intercepta se o usuário colou um PAT token no campo da conta real ou demo
    if ((deriv_token && deriv_token.startsWith('pat_')) || (deriv_demo_token && deriv_demo_token.startsWith('pat_'))) {
      const patToken = deriv_token?.startsWith('pat_') ? deriv_token : deriv_demo_token;
      console.log(`[Deriv Route] PAT Token detectado. Extraindo tokens específicos...`);
      
      const extraction = await derivApi.extractTokensFromPAT(patToken, deriv_app_id);
      
      if (!extraction.success) {
        return res.status(400).json({ error: 'Falha ao extrair contas do PAT Token: ' + extraction.error });
      }
      
      // Substitui os tokens PAT pelos tokens clássicos de cada conta
      if (extraction.realToken) deriv_token = extraction.realToken;
      if (extraction.demoToken) deriv_demo_token = extraction.demoToken;
    }
    
    // Validate Real Token
    if (deriv_token) {
      const validation = await derivApi.validateToken(deriv_token, deriv_app_id);
      if (!validation.valid) {
        return res.status(400).json({ error: 'Token Real inválido: ' + validation.error });
      }
      if (!isNewFlow && (validation.account.startsWith('VRTC') || validation.account.startsWith('DOT'))) {
        return res.status(400).json({ error: 'Token Real não pode ser uma conta virtual (VRTC/DOT).' });
      }
    }

    // Validate Demo Token
    if (deriv_demo_token) {
      const validation = await derivApi.validateToken(deriv_demo_token, deriv_app_id);
      if (!validation.valid) {
        return res.status(400).json({ error: 'Token Demo inválido: ' + validation.error });
      }
      if (!isNewFlow && !validation.account.startsWith('VRTC') && !validation.account.startsWith('DOT')) {
        return res.status(400).json({ error: 'Token Demo deve ser uma conta virtual (VRTC/DOT).' });
      }
    }

    // Atualiza o perfil do usuário no Supabase
    const { error: dbError } = await supabase
      .from('user_profiles')
      .update({ deriv_token, deriv_demo_token, deriv_app_id })
      .eq('id', req.userId);

    if (dbError) {
      return res.status(500).json({ error: 'Erro ao salvar tokens no banco', details: dbError.message });
    }

    // Reinicia as conexões em tempo real com as novas credenciais
    derivRealtime.stopRealtimeSync(req.userId + '_REAL');
    derivRealtime.stopRealtimeSync(req.userId + '_DEMO');
    
    if (deriv_token) {
      derivRealtime.startRealtimeSync(req.userId, deriv_token, 'REAL', deriv_app_id);
    }
    if (deriv_demo_token) {
      derivRealtime.startRealtimeSync(req.userId, deriv_demo_token, 'DEMO', deriv_app_id);
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
      .select('deriv_token, deriv_demo_token, deriv_app_id')
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
    const result = await derivApi.syncDerivOperations(tokenToUse, req.userId, 500, accountType, profile.deriv_app_id);

    res.json({ message: 'Sincronização concluída com sucesso', synced_count: result.count });
  } catch (error) {
    res.status(500).json({ error: 'Erro durante a sincronização', details: error.message });
  }
});

// Rota protegida: Diagnóstico do Sistema
router.get('/diagnostic', authMiddleware, async (req, res) => {
  try {
    const diagnostic = {
      database: { status: 'ERROR', details: 'Não verificado' },
      broker: { status: 'ERROR', details: 'Não verificado' },
      scanner: { status: 'ERROR', details: 'Não verificado' },
      logs: { status: 'OK', details: 'Nenhum erro ou alerta recente nos logs.' }
    };

    // 1. Check Database
    const { data: profile, error: dbError } = await supabase
      .from('user_profiles')
      .select('deriv_token, deriv_demo_token, deriv_app_id')
      .eq('id', req.userId)
      .single();

    if (dbError) {
      diagnostic.database.details = 'Falha ao conectar no banco de dados.';
    } else {
      diagnostic.database.status = 'OK';
      diagnostic.database.details = 'Conexão com o banco de dados estabelecida.';
    }

    // 2. Check Broker
    const token = profile?.deriv_token || profile?.deriv_demo_token;
    if (token) {
      const brokerInfo = await derivApi.getDiagnosticInfo(token, profile?.deriv_app_id);
      if (brokerInfo.status === 'OK') {
        diagnostic.broker.status = 'OK';
        diagnostic.broker.details = `Conexão OK (Deriv). Saldo: $${brokerInfo.balance} ${brokerInfo.currency}`;
      } else {
        diagnostic.broker.details = `Falha na conexão Deriv: ${brokerInfo.error}`;
      }
    } else {
      diagnostic.broker.details = 'Nenhum token da Deriv configurado.';
    }

    // 3. Check Scanner
    const scannerStatus = derivRealtime.getRealtimeStatus(req.userId);
    if (scannerStatus.active) {
      diagnostic.scanner.status = 'OK';
      diagnostic.scanner.details = `Thread do scanner operando. Monitorando: ${scannerStatus.details.real ? 'REAL ' : ''}${scannerStatus.details.demo ? 'DEMO' : ''}`;
    } else {
      diagnostic.scanner.details = 'Scanner inativo. Nenhuma conexão em tempo real estabelecida.';
    }

    // 4. Check Logs
    const allLogs = logger.getLogs();
    const recentLogs = allLogs.slice(-100); // Last 100 lines
    const errorLogs = recentLogs.filter(line => line.includes('[ERROR]'));
    
    diagnostic.logs.fullLogs = recentLogs; // Send to frontend
    
    if (errorLogs.length > 0) {
      diagnostic.logs.status = 'ERROR';
      diagnostic.logs.details = `Foram encontrados ${errorLogs.length} erro(s) recentes no sistema.`;
    } else {
      diagnostic.logs.status = 'OK';
      diagnostic.logs.details = 'Nenhum erro ou alerta recente nos logs.';
    }

    res.json(diagnostic);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao executar diagnóstico', details: error.message });
  }
});

// Rota protegida: Obter URL OTP e Saldo (para contornar CORS no Frontend)
router.get('/connection-info', authMiddleware, async (req, res) => {
  try {
    const accountType = req.headers['x-account-type'] || 'REAL';
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('deriv_token, deriv_demo_token, deriv_app_id')
      .eq('id', req.userId)
      .single();

    if (error || !profile) {
      return res.status(400).json({ error: 'Perfil não encontrado.' });
    }

    const token = accountType === 'DEMO' ? profile.deriv_demo_token : profile.deriv_token;
    const appId = profile.deriv_app_id || 1089;

    if (!token) {
      return res.status(400).json({ error: `Nenhum token da Deriv encontrado para a conta ${accountType}.` });
    }

    const isNewFlow = (appId && /[a-zA-Z]/.test(String(appId)));
    
    if (!isNewFlow) {
      return res.json({ wsUrl: `wss://ws.derivws.com/websockets/v3?app_id=${appId}`, isNewFlow: false });
    }

    const axios = require('axios');
    const accountsRes = await axios.get('https://api.derivws.com/trading/v1/options/accounts', {
      headers: { 'Deriv-App-ID': appId, 'Authorization': `Bearer ${token}` },
      timeout: 10000
    });
    
    const accounts = accountsRes.data.data;
    const targetAccountType = accountType === 'DEMO' ? 'demo' : 'real';
    
    // Filter matching account types
    const matchingAccounts = accounts.filter(a => a.account_type === targetAccountType);
    
    if (matchingAccounts.length === 0) {
      return res.status(400).json({ error: 'Conta não encontrada para este App ID.' });
    }

    // Priority: 'CR' prefix (standard fiat options account)
    let targetAccount = matchingAccounts[0];
    if (targetAccountType === 'real') {
      const crAccount = matchingAccounts.find(a => a.account_id && a.account_id.startsWith('CR'));
      if (crAccount) {
        targetAccount = crAccount;
      }
    }

    const otpRes = await axios.post(`https://api.derivws.com/trading/v1/options/accounts/${targetAccount.account_id}/otp`, {}, {
      headers: { 'Deriv-App-ID': appId, 'Authorization': `Bearer ${token}` },
      timeout: 10000
    });

    res.json({ 
      wsUrl: otpRes.data.data.url, 
      isNewFlow: true,
      balance: targetAccount.balance || 0,
      currency: targetAccount.currency || 'USD'
    });
  } catch (error) {
    const errorMsg = error.response?.data?.error?.message || error.message;
    res.status(500).json({ error: 'Erro de conexão Deriv', details: errorMsg });
  }
});

module.exports = router;
