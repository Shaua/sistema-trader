import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';
import api from '../lib/api';
import axios from 'axios';

const APP_ID = 1089;

const playAlertSound = (type) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const audioCtx = new AudioContext();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    if (type === 'win') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
      oscillator.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2); // G5
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.5);
    } else if (type === 'loss') {
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(150, audioCtx.currentTime); 
      oscillator.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + 0.5);
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.8);
    }
  } catch (e) {
    console.error("Audio alert failed", e);
  }
};

export default function useDerivBot() {
  const profile = useStore(state => state.profile);
  const activeAccountType = useStore(state => state.activeAccountType);
  const ws = useRef(null);
  const isComponentMounted = useRef(true);

  const [config, setConfig] = useState({
    initialStake: 0.35,
    targetProfit: 0.33,
    stopLoss: 11.00,
    market: '1HZ100V', // Volatility 100 (1s) Index
    strategy: 'LOW',
    mode: 'veloz', // veloz (1), balanceado (2), preciso (3)
    riskManagement: 'hit_and_run', // conservador, otimizado, agressivo, hit_and_run
  });

  // State
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState('Desconectado');
  const [authorized, setAuthorized] = useState(false);
  
  // Stats
  const [stats, setStats] = useState({
    balance: 0,
    currency: 'USD',
    profit: 0,
    wins: 0,
    losses: 0,
    currentStake: 1,
    virtualLossCount: 0,
    martingaleLevel: 0,
    cycleProfit: 0,
    lastDigit: null,
    cooldownTicks: 0,
    recentDigits: [],
    guaranteedFloor: 0,
    consecutiveWins: 0,
    ghostMode: false,
    ghostEntryWait: false,
    recentQuotes: [],
    diagnostic: {
      targetLosses: 1,
      highInLast10: 0,
      radarMessage: 'Analisando o mercado...',
    }
  });

  // Logs / Trades
  const [trades, setTrades] = useState([]);
  
  // Internal Refs for fast state access inside callbacks
  const statsRef = useRef({ ...stats });
  const configRef = useRef(config);
  const isRunningRef = useRef(isRunning);
  const isTradingRef = useRef(false);
  const isNewFlowRef = useRef(false);
  const connectionIdRef = useRef(0);

  useEffect(() => {
    configRef.current = config;
    isRunningRef.current = isRunning;
  }, [config, isRunning]);

  const connect = useCallback(async () => {
    const currentConnectionId = Date.now() + Math.random();
    connectionIdRef.current = currentConnectionId;

    if (ws.current) {
      ws.current.onclose = null;
      ws.current.onerror = null;
      ws.current.onmessage = null;
      ws.current.onopen = null;
      if (ws.current.pingInterval) clearInterval(ws.current.pingInterval);
      if (ws.current.pongTimeout) clearTimeout(ws.current.pongTimeout);
      if (ws.current.authTimeout) clearTimeout(ws.current.authTimeout);
      ws.current.close();
      ws.current = null;
    }
    
    setStatus('Conectando...');
    setAuthorized(false);
    
    const accountType = activeAccountType || 'REAL';
    const token = accountType === 'DEMO' ? profile?.deriv_demo_token : profile?.deriv_token;
    const appId = profile?.deriv_app_id || 1089;

    if (!token) {
      setStatus(`Token da conta ${accountType} não encontrado. Cadastre em Integrações.`);
      return;
    }

    setStatus('Obtendo chave de acesso segura (Backend)...');
    
    let wsUrl = '';
    let initialBalance = 0;
    let initialCurrency = 'USD';
    let isNewFlow = false;

    try {
      const { data } = await api.get('/deriv/connection-info', {
        headers: { 'x-account-type': accountType }
      });
      wsUrl = data.wsUrl;
      isNewFlow = data.isNewFlow;
      isNewFlowRef.current = isNewFlow;
      initialBalance = data.balance || 0;
      initialCurrency = data.currency || 'USD';
    } catch (err) {
      if (connectionIdRef.current !== currentConnectionId) return;
      setStatus(`Erro de conexão: ${err.response?.data?.details || err.message}`);
      return;
    }
    
    if (connectionIdRef.current !== currentConnectionId) return;

    const socket = new WebSocket(wsUrl);
    ws.current = socket;

    const onAuthSuccess = (balance = 0, currency = 'USD') => {
      if (socket.authTimeout) clearTimeout(socket.authTimeout);
      setAuthorized(true);
      setStatus('Autorizado. Pronto.');
      statsRef.current.balance = balance;
      statsRef.current.currency = currency;
      setStats({ ...statsRef.current });
      
      socket.send(JSON.stringify({ balance: 1, subscribe: 1 }));
      socket.send(JSON.stringify({ proposal_open_contract: 1, subscribe: 1 }));

      if (isRunningRef.current) {
        setStatus('Reconectado! Buscando trades...');
        isTradingRef.current = false;
        socket.send(JSON.stringify({
          ticks: configRef.current.market,
          subscribe: 1
        }));
      }
    };
    
    socket.onopen = () => {
      setStatus('Conectado. Autorizando...');
      
      if (!isNewFlow) {
        socket.send(JSON.stringify({ authorize: token }));
      } else {
        // No fluxo novo (OTP), a conexão já abre autenticada
        onAuthSuccess(initialBalance, initialCurrency);
      }
      
      socket.authTimeout = setTimeout(() => {
        if (socket.readyState === WebSocket.OPEN && !authorized) {
          socket.close();
        }
      }, 15000);
      
      setTimeout(() => {
        if (socket.readyState !== WebSocket.OPEN) return;
        socket.pingInterval = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ ping: 1 }));
            if (socket.pongTimeout) clearTimeout(socket.pongTimeout);
            socket.pongTimeout = setTimeout(() => {
              if (socket.readyState === WebSocket.OPEN) {
                socket.close(); 
              }
            }, 10000); 
          }
        }, 30000); 
      }, 5000);
    };

    socket.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      
      if (data.msg_type === 'ping') {
        if (socket.pongTimeout) clearTimeout(socket.pongTimeout);
        return;
      }
      
      if (data.error) {
        if (socket.authTimeout) clearTimeout(socket.authTimeout);
        const ignoredErrors = ['AlreadySubscribed', 'ForgetInvalid', 'UnrecognizedRequest'];
        
        if (data.error.code === 'RateLimit' && data.error.message.includes('ping')) {
          return;
        }

        if (!ignoredErrors.includes(data.error.code)) {
          setStatus(`Erro: ${data.error.message}`);
          setIsRunning(false);
        }
        return;
      }

      if (data.msg_type === 'authorize') {
        onAuthSuccess(data.authorize.balance, data.authorize.currency);
      }

      if (data.msg_type === 'balance') {
        statsRef.current.balance = data.balance.balance;
        setStats({ ...statsRef.current });
      }

      if (data.msg_type === 'tick') {
        handleTick(data.tick);
      }

      // Removida escuta de 'proposal' para ganho de velocidade (Compra Direta)

      if (data.msg_type === 'buy') {
        setStatus('Comprado! Aguardando resultado...');
      }

      if (data.msg_type === 'proposal_open_contract') {
        const contract = data.proposal_open_contract;
        if (contract.is_sold) {
          handleContractClosed(contract);
        }
      }
    };

    socket.onclose = () => {
      if (socket.pingInterval) clearInterval(socket.pingInterval);
      if (socket.pongTimeout) clearTimeout(socket.pongTimeout);
      if (socket.authTimeout) clearTimeout(socket.authTimeout);
      if (isComponentMounted.current) {
        setStatus('Desconectado. Reconectando...');
        setAuthorized(false);
        setTimeout(() => connect(), 5000);
      }
    };
  }, [profile, activeAccountType]);

  useEffect(() => {
    connect();
    return () => {
      isComponentMounted.current = false;
      if (ws.current) {
        ws.current.onclose = null;
        if (ws.current.pingInterval) clearInterval(ws.current.pingInterval);
        if (ws.current.pongTimeout) clearTimeout(ws.current.pongTimeout);
        if (ws.current.authTimeout) clearTimeout(ws.current.authTimeout);
        ws.current.close();
      }
    };
  }, [connect]);

  const startBot = () => {
    if (!authorized) {
      alert("Aguarde a autorização da Deriv ou verifique seu Token.");
      return;
    }
    
    setIsRunning(true);
    setStatus('Buscando trades...');
    isTradingRef.current = false;
    
    statsRef.current.profit = 0;
    statsRef.current.wins = 0;
    statsRef.current.losses = 0;
    statsRef.current.currentStake = configRef.current.initialStake;
    statsRef.current.virtualLossCount = 0;
    statsRef.current.martingaleLevel = 0;
    statsRef.current.cycleProfit = 0;
    statsRef.current.cooldownTicks = 0;
    statsRef.current.recentDigits = [];
    statsRef.current.recentQuotes = [];
    statsRef.current.guaranteedFloor = 0;
    statsRef.current.consecutiveWins = 0;
    statsRef.current.ghostMode = false;
    statsRef.current.ghostEntryWait = false;
    statsRef.current.diagnostic = {
      targetLosses: 1,
      highInLast10: 0,
      radarMessage: 'Iniciando telemetria...',
    };
    
    setStats({ ...statsRef.current });

    // Reset trades for new session
    setTrades([]);

    // Subscribe to ticks
    ws.current.send(JSON.stringify({
      ticks: configRef.current.market,
      subscribe: 1
    }));
  };

  const stopBot = () => {
    setIsRunning(false);
    setStatus('IA Parada.');
    
    // Unsubscribe from ticks
    ws.current.send(JSON.stringify({
      forget_all: 'ticks'
    }));
  };

  const updateConfig = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleTick = (tickData) => {
    if (!isRunningRef.current) return;
    
    // Sistema Anti-Congelamento (Proteção contra falhas da API da Deriv)
    if (statsRef.current.lastQuote === tickData.quote) {
      statsRef.current.frozenTicks = (statsRef.current.frozenTicks || 0) + 1;
    } else {
      statsRef.current.frozenTicks = 0;
      statsRef.current.lastQuote = tickData.quote;
    }

    // Se o preço ficar EXATAMENTE igual por 8 ticks seguidos (o que é impossível em Volatility), a API travou.
    if (statsRef.current.frozenTicks >= 8) {
      statsRef.current.frozenTicks = 0; // reseta
      setStatus('Sinal da Deriv congelado. Forçando reconexão...');
      if (ws.current) {
        ws.current.close(); // Isso vai disparar o evento onclose que faz o Auto-Resume automático!
      }
      return;
    }

    // Fix: Format quote with 2 decimal places to prevent trailing zero dropping
    // e.g. 739.80 -> toString() is "739.8" (last digit 8 incorrectly)
    // with toFixed(2) -> "739.80" (last digit 0 correctly)
    const pipSize = tickData.pip_size || 2;
    const quoteStr = Number(tickData.quote).toFixed(pipSize);
    const lastDigit = parseInt(quoteStr.slice(-1));

    statsRef.current.lastDigit = lastDigit;
    
    // -----------------------------------------------------
    // 0. Filtro de Alta Volatilidade (Spike Detector)
    // -----------------------------------------------------
    const currentQuote = parseFloat(tickData.quote);
    if (statsRef.current.lastQuoteValue !== undefined) {
      const diff = Math.abs(currentQuote - statsRef.current.lastQuoteValue);
      statsRef.current.recentQuotes.push(diff);
      if (statsRef.current.recentQuotes.length > 50) {
        statsRef.current.recentQuotes.shift();
      }
      
      if (statsRef.current.recentQuotes.length >= 10) {
        const avgDiff = statsRef.current.recentQuotes.reduce((a, b) => a + b, 0) / statsRef.current.recentQuotes.length;
        // Se o salto for > 3x a média histórica (Spike)
        if (diff > avgDiff * 3 && avgDiff > 0) {
          statsRef.current.cooldownTicks = 10; // Força resfriamento de 10 ticks
          statsRef.current.virtualLossCount = 0;
          statsRef.current.diagnostic.radarMessage = `⚠️ Spike detectado! (${diff.toFixed(pipSize)}). Resfriando...`;
          setStats({ ...statsRef.current });
          if (status !== 'Alta volatilidade detectada. Pausando...') setStatus('Alta volatilidade detectada. Pausando...');
        }
      }
    }
    statsRef.current.lastQuoteValue = currentQuote;

    // Atualiza Radar de Ondas (últimos 50 ticks) SEMPRE, mesmo com operação aberta, para não perder o tracking do mercado.
    statsRef.current.recentDigits.push(lastDigit);
    if (statsRef.current.recentDigits.length > 50) {
      statsRef.current.recentDigits.shift();
    }

    // Se houver uma operação em andamento, bloqueia a leitura de novos gatilhos, 
    // mas o histórico de dígitos continuou sendo perfeitamente alimentado acima.
    if (isTradingRef.current) return;

    // -----------------------------------------------------
    // Resolução do MODO FANTASMA (Paper Trading Background)
    // -----------------------------------------------------
    if (statsRef.current.ghostEntryWait) {
      statsRef.current.ghostEntryWait = false;
      const isVirtualLossNow = lastDigit === 8 || lastDigit === 9;
      
      if (!isVirtualLossNow) {
        // Ghost Win! A tempestade passou, desliga o ghost mode.
        statsRef.current.ghostMode = false;
        statsRef.current.virtualLossCount = 0;
        statsRef.current.diagnostic.radarMessage = 'Ghost Trade Win! Retornando ao mercado real...';
        setStats({ ...statsRef.current });
        setStatus('Buscando trades reais...');
      } else {
        // Ghost Loss! O mercado ainda está ruim. Continua no Ghost Mode.
        statsRef.current.virtualLossCount = 0;
        statsRef.current.diagnostic.radarMessage = 'Ghost Trade Loss! O mercado continua ruim. Evitamos um loss real.';
        setStats({ ...statsRef.current });
        setStatus('Ghost Trade Loss. Aguardando novo ciclo fantasma...');
      }
      return; // Já consumiu este tick para resolver o fantasma
    }
    
    // 1. Resfriamento Pós-Loss
    if (statsRef.current.cooldownTicks > 0) {
      statsRef.current.cooldownTicks -= 1;
      setStats({ ...statsRef.current });
      if (status !== 'Resfriando após Loss...') setStatus('Resfriando após Loss...');
      return; // Ignora o mercado durante o resfriamento
    }

    // 2. Radar de Ondas (Análise de Frequência Global)
    if (statsRef.current.recentDigits.length === 50) {
      const highDigitsCount = statsRef.current.recentDigits.filter(d => d === 8 || d === 9).length;
      if (highDigitsCount >= 15) { // 30% ou mais de números 8 e 9 (Mercado Quente/Ruim)
        statsRef.current.virtualLossCount = 0;
        setStats({ ...statsRef.current });
        if (status !== 'Onda de anomalia detectada. Pausando...') setStatus('Onda de anomalia detectada. Pausando...');
        return; // Bloqueia entradas
      }
    }

    let targetLosses = configRef.current.mode === 'veloz' ? 1 : 
                         configRef.current.mode === 'balanceado' ? 2 : 
                         configRef.current.mode === 'preciso' ? 3 : 4; // Super Sniper = 4

    // Gatilho Dinâmico de Risco (Smart Recovery Delay)
    // Aumenta a exigência gráfica nos Martingales para TODOS os modos
    if (statsRef.current.martingaleLevel === 1) {
      targetLosses += 1; 
    } else if (statsRef.current.martingaleLevel >= 2) {
      targetLosses += 2;
    }

    statsRef.current.diagnostic.targetLosses = targetLosses;

    // 3. Radar de Micro-Ondas (Proteção Curta de 10 ticks)
    if (statsRef.current.recentDigits.length >= 10) {
      const last10 = statsRef.current.recentDigits.slice(-10);
      const highInLast10 = last10.filter(d => d === 8 || d === 9).length;
      statsRef.current.diagnostic.highInLast10 = highInLast10;
      
      // Para modo veloz, permitimos até 2 perdas em 10 ticks para manter a agilidade
      // BUGFIX: Se o targetLosses do Martingale for maior que 2 (ex: 3 ou 4), o radar deve permitir que esses
      // dígitos ruins se formem sem abortar a entrada prematuramente (evitando deadlock infinito).
      const allowedMicroLosses = configRef.current.mode === 'veloz' ? Math.max(2, targetLosses) : targetLosses;

      // Só bloqueia se tiver mais dígitos ruins agrupados do que o nosso alvo permite
      if (highInLast10 > allowedMicroLosses) {
        statsRef.current.virtualLossCount = 0;
        statsRef.current.diagnostic.radarMessage = `Micro-Onda bloqueou! Tem ${highInLast10} ruins nos ultimos 10 ticks (limite ${allowedMicroLosses})`;
        setStats({ ...statsRef.current });
        if (status !== 'Micro-Onda detectada. Pausando...') setStatus('Micro-Onda detectada. Pausando...');
        return; // Bloqueia entradas
      }
    }

    statsRef.current.diagnostic.radarMessage = 'Gráfico limpo. Rastreador ativado.';

    if (status === 'Resfriando após Loss...' || status === 'Onda de anomalia detectada. Pausando...' || status === 'Micro-Onda detectada. Pausando...' || status === 'Filtro Veloz: Ignorando cluster perigoso...') {
      setStatus('Buscando trades...');
    }

    setStats({ ...statsRef.current });

    // Se a estratégia for LOW (Digits Under 8)
    // Loss Virtual: Digito 8 ou 9
    const isVirtualLoss = lastDigit === 8 || lastDigit === 9;
    
    if (isVirtualLoss) {
      statsRef.current.virtualLossCount += 1;
      setStats({ ...statsRef.current });
      
      if (statsRef.current.virtualLossCount >= targetLosses) {
        
        // --- Filtros Inteligentes Exclusivos para Modo Veloz ---
        if (targetLosses === 1) {
          const recent = statsRef.current.recentDigits;
          if (recent.length >= 3) {
            // No modo Veloz, queremos entradas rápidas. 
            // Vamos bloquear apenas se o tick imediatamente anterior também for um dígito alto (cluster colado)
            const prevDigit = recent[recent.length - 2];
            
            if (prevDigit >= 8) {
              // Falso gatilho detectado! Aborta entrada para evitar loss duplo
              statsRef.current.virtualLossCount = 0;
              statsRef.current.diagnostic.radarMessage = 'Aviso: Cluster perigoso detectado no tick anterior. Abortando...';
              setStats({ ...statsRef.current });
              if (status !== 'Filtro Veloz: Ignorando cluster perigoso...') setStatus('Filtro Veloz: Ignorando cluster perigoso...');
              return;
            }
          }
        }

        // Enviar ordem direta de compra (Zero Delay) ou Ordem Fantasma
        statsRef.current.virtualLossCount = 0; // reset
        setStats({ ...statsRef.current });
        
        if (statsRef.current.ghostMode) {
          statsRef.current.ghostEntryWait = true;
          setStatus('Executando Ghost Trade...');
          return;
        }

        buyContractDirect();
      }
    } else {
      // MODO CONSECUTIVO:
      // Se vier qualquer dígito abaixo de 8, zeramos a contagem.
      // Isso obriga que os losses virtuais sejam um colado no outro!
      if (statsRef.current.virtualLossCount > 0) {
        statsRef.current.virtualLossCount = 0;
        setStats({ ...statsRef.current });
      }
    }
  };

  const buyContractDirect = () => {
    isTradingRef.current = true; // Trava os ticks para não abrir múltiplas operações
    setStatus('Executando entrada Rápida...');
    
    const params = {
      amount: statsRef.current.currentStake,
      basis: "stake",
      contract_type: "DIGITUNDER",
      currency: "USD",
      duration: 1,
      duration_unit: "t",
      barrier: "8"
    };

    if (isNewFlowRef.current) {
      params.underlying_symbol = configRef.current.market;
    } else {
      params.symbol = configRef.current.market;
    }

    ws.current.send(JSON.stringify({
      buy: "1",
      price: statsRef.current.currentStake,
      parameters: params
    }));

    // Sistema de segurança: Se a operação travar por qualquer motivo na Deriv (delay, erro de rede), destrava após 15s
    setTimeout(() => {
      if (isTradingRef.current) {
        isTradingRef.current = false;
        if (isRunningRef.current) {
          setStatus('Buscando trades...');
        }
      }
    }, 15000);
  };

  const processedContractsRef = useRef(new Set());

  const handleContractClosed = (contract) => {
    // Evita processar o mesmo contrato duas vezes (ex: reconexão do websocket envia o último fechado)
    if (processedContractsRef.current.has(contract.contract_id)) {
      return;
    }
    processedContractsRef.current.add(contract.contract_id);
    // Limita o tamanho do Set para evitar vazamento de memória
    if (processedContractsRef.current.size > 100) {
      const iterator = processedContractsRef.current.values();
      processedContractsRef.current.delete(iterator.next().value);
    }

    isTradingRef.current = false;

    const profit = parseFloat(contract.profit);
    const won = profit > 0;
    
    statsRef.current.profit += profit;
    statsRef.current.balance += profit;
    if (won) {
      statsRef.current.wins += 1;
      statsRef.current.consecutiveWins += 1;
    } else {
      statsRef.current.losses += 1;
      statsRef.current.consecutiveWins = 0;
    }

    // Registra trade
    const newTrade = {
      id: contract.contract_id,
      date: new Date().toISOString(),
      amount: parseFloat(contract.buy_price),
      profit: profit,
      won: won,
      entry: contract.entry_tick_display_value,
      exit: contract.exit_tick_display_value,
      market: configRef.current.market
    };
    
    setTrades(prev => [newTrade, ...prev]);

    // Aplica Gerenciamento de Risco (Recovery Martingale)
    if (statsRef.current.cycleProfit === undefined) {
      statsRef.current.cycleProfit = 0;
    }
    
    statsRef.current.cycleProfit += profit;
    
    const rm = configRef.current.riskManagement;
    const maxLevel = rm === 'hit_and_run' ? 3 : 1; // 3 níveis para Hit and Run, 1 para os demais modos
    const multiplier = rm === 'hit_and_run' ? 2.7 : rm === 'conservador' ? 2.7 : rm === 'otimizado' ? 5.5 : 6;
    
    let nextStake = statsRef.current.currentStake;
    let level = statsRef.current.martingaleLevel;

    // -----------------------------------------------------
    // Trailing Stop (Piso Garantido)
    // -----------------------------------------------------
    const totalProfitForTrailing = statsRef.current.profit;
    const target = configRef.current.targetProfit;
    
    // Se bater 70% da meta, garante 30%. Se bater 90%, garante 60%.
    if (target > 0) {
      if (totalProfitForTrailing >= target * 0.9 && statsRef.current.guaranteedFloor < target * 0.6) {
        statsRef.current.guaranteedFloor = target * 0.6;
      } else if (totalProfitForTrailing >= target * 0.7 && statsRef.current.guaranteedFloor < target * 0.3) {
        statsRef.current.guaranteedFloor = target * 0.3;
      }
    }

    // Resolve o bug de precisão de ponto flutuante do JavaScript (ex: -0.14 + 0.21 = 0.07? Não, -0.35 + 0.21 = -0.14)
    // Para evitar que um lucro residual quase zero seja tratado como prejuízo, usamos um pequeno epsilon
    if (statsRef.current.cycleProfit >= -0.01) {
      // Ciclo encerrado com lucro (ou zero). Reseta!
      nextStake = configRef.current.initialStake;
      level = 0;
      statsRef.current.cycleProfit = 0;

      // -----------------------------------------------------
      // Pausa após Grande Sequência de Vitórias (Win-Streak Breaker)
      // -----------------------------------------------------
      if (statsRef.current.consecutiveWins >= 12) {
        statsRef.current.cooldownTicks = 30; // Pausa para embaralhar o mercado
        statsRef.current.consecutiveWins = 0;
        statsRef.current.diagnostic.radarMessage = '🎉 Sequência de 12 Wins! Fazendo pausa preventiva de 30 ticks.';
        setStatus('Resfriando após Sequência de Vitórias...');
      }
    } else {
      // Está no prejuízo neste ciclo.
      if (!won) {
        // Se perdeu na entrada real, ativa o Resfriamento para fugir da "onda"
        // Modo Veloz usa 8 ticks para manter agilidade, Sniper usa 25 ticks.
        let cooldown = configRef.current.mode === 'veloz' ? 8 : 25;
        
        // Gatilho Dinâmico de Risco: Maior resfriamento se estivermos indo para o Martingale no modo veloz
        if (configRef.current.mode === 'veloz' && level > 0) {
          cooldown = 15;
        }
        
        statsRef.current.cooldownTicks = cooldown;
        
        // -----------------------------------------------------
        // MODO FANTASMA (Ativa após Loss)
        // -----------------------------------------------------
        statsRef.current.ghostMode = true;
        statsRef.current.ghostEntryWait = false;
        statsRef.current.diagnostic.radarMessage = '👻 Ghost Mode Ativado para blindar o próximo Martingale.';

        // Se perdeu, multiplica a aposta se ainda não bateu no limite
        if (level < maxLevel) {
          level += 1;
          nextStake = nextStake * multiplier;
        } else {
          // Bateu no limite máximo de perdas da estratégia!
          // Aceita a perda do ciclo e volta para a entrada inicial
          nextStake = configRef.current.initialStake;
          level = 0;
          statsRef.current.cycleProfit = 0;
        }
      } else {
        // Se ganhou a operação, mas ainda tem prejuízo no ciclo:
        if (rm === 'hit_and_run') {
          // Martingale Fracionado: Mantém a stake atual para continuar recuperando!
          setStatus('Recuperação fracionada. Mantendo valor da aposta...');
          // Não alteramos o level nem a nextStake (elas continuam as mesmas do último trade)
        } else {
          // Outros modos: Recuperação parcial. Aceita o pequeno loss do ciclo e recomeça para proteger a banca.
          setStatus('Recuperação parcial concluída. Reiniciando por segurança...');
          level = 0;
          nextStake = configRef.current.initialStake;
          statsRef.current.cycleProfit = 0;
        }
      }
    }
    
    nextStake = parseFloat(nextStake.toFixed(2));
    
    statsRef.current.currentStake = nextStake;
    statsRef.current.martingaleLevel = level;
    
    setStats({ ...statsRef.current });

    // Verifica metas
    const currentTotalProfit = statsRef.current.profit;
    if (currentTotalProfit >= configRef.current.targetProfit) {
      stopBot();
      setStatus('Meta de Lucro Atingida!');
      playAlertSound('win');
    } else if (currentTotalProfit <= -configRef.current.stopLoss) {
      stopBot();
      setStatus('Stop Loss Atingido!');
      playAlertSound('loss');
    } else if (statsRef.current.guaranteedFloor > 0 && currentTotalProfit < statsRef.current.guaranteedFloor) {
      // Bateu no Trailing Stop (Piso Garantido)
      stopBot();
      setStatus(`Piso Garantido Atingido! (Lucro protegido: $${statsRef.current.guaranteedFloor.toFixed(2)})`);
      playAlertSound('win');
    } else {
      if (status !== 'Resfriando após Sequência de Vitórias...') {
        setStatus('Buscando trades...');
      }
    }
  };

  return {
    config,
    updateConfig,
    stats,
    trades,
    isRunning,
    startBot,
    stopBot,
    status,
    authorized
  };
}
