import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';

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
  const { profile } = useStore();
  const ws = useRef(null);
  const isComponentMounted = useRef(true);

  // Configuration
  const [config, setConfig] = useState({
    initialStake: 1,
    targetProfit: 10,
    stopLoss: 1000,
    market: 'R_10', // Volatility 10 Index
    strategy: 'LOW',
    mode: 'preciso', // veloz (1), balanceado (2), preciso (3)
    riskManagement: 'conservador', // conservador, otimizado, agressivo
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
  });

  // Logs / Trades
  const [trades, setTrades] = useState([]);
  
  // Internal Refs for fast state access inside callbacks
  const statsRef = useRef({ ...stats });
  const configRef = useRef(config);
  const isRunningRef = useRef(isRunning);
  const isTradingRef = useRef(false);

  useEffect(() => {
    configRef.current = config;
    isRunningRef.current = isRunning;
  }, [config, isRunning]);

  const connect = useCallback(() => {
    if (ws.current) {
      ws.current.onclose = null;
      ws.current.onerror = null;
      ws.current.onmessage = null;
      ws.current.onopen = null;
      if (ws.current.pingInterval) clearInterval(ws.current.pingInterval);
      if (ws.current.pongTimeout) clearTimeout(ws.current.pongTimeout);
      if (ws.current.authTimeout) clearTimeout(ws.current.authTimeout);
      ws.current.close();
    }
    
    setStatus('Conectando...');
    const socket = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${APP_ID}`);
    ws.current = socket;
    
    socket.onopen = () => {
      setStatus('Autorizando...');
      
      const accountType = useStore.getState().activeAccountType || 'REAL';
      const token = accountType === 'DEMO' ? profile?.deriv_demo_token : profile?.deriv_token;

      if (token) {
        socket.send(JSON.stringify({ authorize: token }));
        
        socket.authTimeout = setTimeout(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.close();
          }
        }, 15000);
      } else {
        setStatus(`Token da conta ${accountType} não encontrado. Cadastre em Integrações.`);
      }
      
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
        if (socket.authTimeout) clearTimeout(socket.authTimeout);
        setAuthorized(true);
        setStatus('Autorizado. Pronto.');
        statsRef.current.balance = data.authorize.balance;
        statsRef.current.currency = data.authorize.currency;
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
  }, [profile]);

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
    if (!isRunningRef.current || isTradingRef.current) return;
    
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
    
    // Atualiza Radar de Ondas (últimos 50 ticks)
    statsRef.current.recentDigits.push(lastDigit);
    if (statsRef.current.recentDigits.length > 50) {
      statsRef.current.recentDigits.shift();
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

    const targetLosses = configRef.current.mode === 'veloz' ? 1 : 
                         configRef.current.mode === 'balanceado' ? 2 : 
                         configRef.current.mode === 'preciso' ? 3 : 4; // Super Sniper = 4

    // 3. Radar de Micro-Ondas (Proteção Curta de 10 ticks)
    if (statsRef.current.recentDigits.length >= 10) {
      const last10 = statsRef.current.recentDigits.slice(-10);
      const highInLast10 = last10.filter(d => d === 8 || d === 9).length;
      
      // Só bloqueia se tiver mais dígitos ruins agrupados do que o nosso alvo permite
      if (highInLast10 > targetLosses) {
        statsRef.current.virtualLossCount = 0;
        setStats({ ...statsRef.current });
        if (status !== 'Micro-Onda detectada. Pausando...') setStatus('Micro-Onda detectada. Pausando...');
        return; // Bloqueia entradas
      }
    }

    if (status === 'Resfriando após Loss...' || status === 'Onda de anomalia detectada. Pausando...' || status === 'Micro-Onda detectada. Pausando...') {
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
          if (recent.length >= 5) {
            // Analisa os 3 ticks anteriores ao gatilho
            const last4 = recent.slice(-4);
            const prev3 = last4.slice(0, 3);
            const hasHighInPrev3 = prev3.some(d => d >= 6); // Mercado já estava agitado
            
            // Analisa a temperatura (média dos últimos 5)
            const last5 = recent.slice(-5);
            const avg5 = last5.reduce((a, b) => a + b, 0) / 5;

            if (hasHighInPrev3 || avg5 > 5.0) {
              // Falso gatilho detectado! Aborta entrada para evitar loss
              statsRef.current.virtualLossCount = 0;
              setStats({ ...statsRef.current });
              if (status !== 'Filtro Veloz: Ignorando cluster perigoso...') setStatus('Filtro Veloz: Ignorando cluster perigoso...');
              return;
            }
          }
        }

        // Enviar ordem direta de compra (Zero Delay)
        statsRef.current.virtualLossCount = 0; // reset
        setStats({ ...statsRef.current });
        
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
    
    ws.current.send(JSON.stringify({
      buy: "1",
      price: statsRef.current.currentStake,
      parameters: {
        amount: statsRef.current.currentStake,
        basis: "stake",
        contract_type: "DIGITUNDER",
        currency: "USD",
        duration: 1,
        duration_unit: "t",
        symbol: configRef.current.market,
        barrier: "8"
      }
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

  const handleContractClosed = (contract) => {
    isTradingRef.current = false;

    const profit = parseFloat(contract.profit);
    const won = profit > 0;
    
    statsRef.current.profit += profit;
    if (won) statsRef.current.wins += 1;
    else statsRef.current.losses += 1;

    // Registra trade
    const newTrade = {
      id: contract.contract_id,
      date: new Date().toISOString(),
      amount: contract.buy_price,
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
    const maxLevel = 1; // 1 nível de martingale somente para todos os modos
    const multiplier = rm === 'conservador' ? 2.7 : rm === 'otimizado' ? 5.5 : 6;
    
    let nextStake = statsRef.current.currentStake;
    let level = statsRef.current.martingaleLevel;

    if (statsRef.current.cycleProfit >= 0) {
      // Ciclo encerrado com lucro (ou zero). Reseta!
      nextStake = configRef.current.initialStake;
      level = 0;
      statsRef.current.cycleProfit = 0;
    } else {
      // Está no prejuízo neste ciclo.
      if (!won) {
        // Se perdeu na entrada real, ativa o Resfriamento para fugir da "onda"
        // Modo Veloz usa 8 ticks para manter agilidade, Sniper usa 25 ticks.
        statsRef.current.cooldownTicks = configRef.current.mode === 'veloz' ? 8 : 25;
        
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
        // Se ganhou a operação, encerramos o ciclo do Martingale.
        // No modo Conservador (2.7x) a recuperação é parcial para proteger a banca.
        // É mais seguro aceitar o pequeno prejuízo restante e recomeçar do que arriscar uma aposta alta novamente.
        setStatus(statsRef.current.cycleProfit >= 0 ? 'Ciclo finalizado com lucro! Reiniciando...' : 'Recuperação parcial concluída. Reiniciando por segurança...');
        level = 0;
        nextStake = configRef.current.initialStake;
        statsRef.current.cycleProfit = 0;
      }
    }
    
    nextStake = parseFloat(nextStake.toFixed(2));
    
    statsRef.current.currentStake = nextStake;
    statsRef.current.martingaleLevel = level;
    
    setStats({ ...statsRef.current });

    // Verifica metas
    const totalProfit = statsRef.current.profit;
    if (totalProfit >= configRef.current.targetProfit) {
      stopBot();
      setStatus('Meta de Lucro Atingida!');
      playAlertSound('win');
    } else if (totalProfit <= -configRef.current.stopLoss) {
      stopBot();
      setStatus('Stop Loss Atingido!');
      playAlertSound('loss');
    } else {
      setStatus('Buscando trades...');
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
