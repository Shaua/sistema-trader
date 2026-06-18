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
    market: '1HZ100V', // Volatility 100 (1s) Index
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
      ws.current.close();
    }
    
    setStatus('Conectando...');
    ws.current = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${APP_ID}`);
    
    ws.current.onopen = () => {
      setStatus('Autorizando...');
      if (profile?.deriv_token) {
        ws.current.send(JSON.stringify({ authorize: profile.deriv_token }));
      } else {
        setStatus('Token Deriv não encontrado. Cadastre em Integrações.');
      }
      
      // Keep-alive ping
      ws.current.pingInterval = setInterval(() => {
        if (ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({ ping: 1 }));
        }
      }, 60000); // Aumentado para 60s para evitar rate limit
    };

    ws.current.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      
      if (data.error) {
        // Ignorar erros de subscription duplicada ou irrelevantes
        const ignoredErrors = ['AlreadySubscribed', 'ForgetInvalid', 'UnrecognizedRequest'];
        
        // Ignorar RateLimit APENAS se for do ping
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
        setAuthorized(true);
        setStatus('Autorizado. Pronto.');
        statsRef.current.balance = data.authorize.balance;
        statsRef.current.currency = data.authorize.currency;
        setStats({ ...statsRef.current });
        
        // Subscrever a balanço
        ws.current.send(JSON.stringify({ balance: 1, subscribe: 1 }));
        // Subscrever a TODAS as transações abertas (evita conflitos de múltiplas assinaturas)
        ws.current.send(JSON.stringify({ proposal_open_contract: 1, subscribe: 1 }));

        // Sistema de Auto-Resume: Se o robô estava ligado e a conexão caiu, ele volta a operar sozinho!
        if (isRunningRef.current) {
          setStatus('Reconectado! Buscando trades...');
          isTradingRef.current = false; // Garante que não está travado
          ws.current.send(JSON.stringify({
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

      if (data.msg_type === 'proposal') {
        // Se receber uma proposta, e estivermos rodando, podemos comprar
        if (isRunningRef.current && data.proposal.id) {
          buyContract(data.proposal.id);
        }
      }

      if (data.msg_type === 'buy') {
        setStatus('Comprado! Aguardando resultado...');
        // O resultado será capturado pela subscription global do proposal_open_contract
      }

      if (data.msg_type === 'proposal_open_contract') {
        const contract = data.proposal_open_contract;
        if (contract.is_sold) {
          handleContractClosed(contract);
        }
      }
    };

    ws.current.onclose = () => {
      if (ws.current?.pingInterval) clearInterval(ws.current.pingInterval);
      if (isComponentMounted.current) {
        setStatus('Desconectado. Reconectando...');
        setAuthorized(false);
        // Removido o setIsRunning(false) para manter a memória de que a IA estava ligada
        // Tentar reconectar após 5 segundos
        setTimeout(() => connect(), 5000);
      }
    };
  }, [profile]);

  useEffect(() => {
    connect();
    return () => {
      isComponentMounted.current = false;
      if (ws.current) ws.current.close();
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
    const quote = tickData.quote.toString();
    const lastDigit = parseInt(quote.slice(-1));

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

    if (status === 'Resfriando após Loss...' || status === 'Onda de anomalia detectada. Pausando...') {
      setStatus('Buscando trades...');
    }

    setStats({ ...statsRef.current });

    // Se a estratégia for LOW (Digits Under 8)
    // Loss Virtual: Digito 8 ou 9
    const isVirtualLoss = lastDigit === 8 || lastDigit === 9;
    
    if (isVirtualLoss) {
      statsRef.current.virtualLossCount += 1;
      setStats({ ...statsRef.current });
      
      const targetLosses = configRef.current.mode === 'veloz' ? 1 : 
                           configRef.current.mode === 'balanceado' ? 2 : 
                           configRef.current.mode === 'preciso' ? 3 : 4; // Super Sniper = 4

      if (statsRef.current.virtualLossCount >= targetLosses) {
        // Enviar proposta de compra
        statsRef.current.virtualLossCount = 0; // reset
        setStats({ ...statsRef.current });
        
        requestProposal();
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

  const requestProposal = () => {
    isTradingRef.current = true; // Trava os ticks para não abrir múltiplas operações
    setStatus('Analisando entrada...');
    ws.current.send(JSON.stringify({
      proposal: 1,
      amount: statsRef.current.currentStake,
      basis: "stake",
      contract_type: "DIGITUNDER",
      currency: "USD",
      duration: 1,
      duration_unit: "t",
      symbol: configRef.current.market,
      barrier: 8
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

  const buyContract = (proposalId) => {
    ws.current.send(JSON.stringify({
      buy: proposalId,
      price: statsRef.current.currentStake
    }));
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
    };
    
    setTrades(prev => [newTrade, ...prev]);

    // Aplica Gerenciamento de Risco (Recovery Martingale)
    if (statsRef.current.cycleProfit === undefined) {
      statsRef.current.cycleProfit = 0;
    }
    
    statsRef.current.cycleProfit += profit;
    
    const rm = configRef.current.riskManagement;
    const maxLevel = rm === 'conservador' ? 3 : rm === 'otimizado' ? 2 : 1;
    const multiplier = rm === 'conservador' ? 2.7 : rm === 'otimizado' ? 3.5 : 6;
    
    let nextStake = statsRef.current.currentStake;
    let level = statsRef.current.martingaleLevel;

    if (statsRef.current.cycleProfit >= 0) {
      // Ciclo encerrado com lucro (ou zero). Reseta!
      nextStake = configRef.current.initialStake;
      level = 0;
      statsRef.current.cycleProfit = 0;
    } else {
      // Ciclo ainda está negativo
      if (!won) {
        // Se perdeu na entrada real, ativa o Resfriamento para fugir da "onda"
        statsRef.current.cooldownTicks = 15;
        
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
