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
      // Arpejo da vitória (Chamativo)
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      notes.forEach((freq, i) => {
        oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime + (i * 0.1));
      });
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.4, audioCtx.currentTime + 0.05);
      gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime + 0.4);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.5);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 1.5);
    } else if (type === 'loss') {
      oscillator.type = 'sawtooth';
      // Sirene de Stop Loss (Dramático e pulsante)
      for (let i = 0; i < 5; i++) {
        oscillator.frequency.setValueAtTime(400, audioCtx.currentTime + (i * 0.25));
        oscillator.frequency.setValueAtTime(250, audioCtx.currentTime + (i * 0.25) + 0.125);
      }
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.4, audioCtx.currentTime + 0.05);
      gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime + 1.0);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.5);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 1.5);
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

  const loadConfig = () => {
    try {
      const saved = localStorage.getItem('bot_config');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      initialStake: 0.35,
      targetProfit: 5.00,
      stopLoss: 15.00,
      maxStake: 10.00,
      maxMartingaleLevel: 3,
      market: 'R_10',
      strategy: 'LOW',
      mode: 'veloz',
      riskManagement: 'hibrido',
      enableCycles: false,
      cycleTarget: 0.33,
      pauseTimeMinutes: 30,
      enableSchedule: false,
      schedules: [
        { id: 1, startTime: '08:00', endTime: '12:00', cycleTarget: 0.33, pauseTimeMinutes: 30, maxCycles: 5 },
        { id: 2, startTime: '14:00', endTime: '18:00', cycleTarget: 0.33, pauseTimeMinutes: 30, maxCycles: 5 },
        { id: 3, startTime: '20:00', endTime: '23:59', cycleTarget: 0.33, pauseTimeMinutes: 30, maxCycles: 5 }
      ]
    };
  };

  const [config, setConfig] = useState(loadConfig());

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
    currentCycle: 1,
    cycleSessionProfit: 0,
    lastDigit: null,
    cooldownTicks: 0,
    recentDigits: [],
    guaranteedFloor: 0,
    consecutiveWins: 0,
    ghostMode: false,
    ghostEntryWait: false,
    recentQuotes: [],
    amortizationDebt: 0,
    activeScheduleId: null,
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
  const statusRef = useRef(status);
  const wakeLockRef = useRef(null);
  const keepAliveAudioRef = useRef(null);
  const tradeTimeoutRef = useRef(null);
  const workerRef = useRef(null);
  const cyclePauseTimeoutRef = useRef(null);
  const checkScheduleRef = useRef(null);
  const lastMessageTimeRef = useRef(Date.now());
  const wsTimeoutCheckRef = useRef(null);

  useEffect(() => {
    configRef.current = config;
    isRunningRef.current = isRunning;
    statusRef.current = status;
  }, [config, isRunning, status]);

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch (err) {
      console.log('Wake Lock request failed:', err);
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current !== null) {
      wakeLockRef.current.release().then(() => {
        wakeLockRef.current = null;
      }).catch(() => {});
    }
  };

  const startAudioKeepAlive = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      
      const audioCtx = new AudioContext();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      // Truque: Frequência ultrassônica (20kHz) e volume 1% (não audível)
      // Se for 0 absoluto, os navegadores modernos ignoram e suspendem a aba.
      oscillator.type = 'sine';
      oscillator.frequency.value = 20000; 
      gainNode.gain.value = 0.01; 
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      keepAliveAudioRef.current = { audioCtx, oscillator };

      // 2. Truque de Vídeo Oculto (Canvas MediaStream)
      // Força o navegador a tratar a aba como uma transmissão de vídeo ativa,
      // prevenindo throttling severo e suspensão no Chrome/Edge.
      if (!keepAliveAudioRef.current.video) {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, 1, 1);
        
        // 1 frame por segundo é suficiente para manter ativo
        const stream = canvas.captureStream(1); 
        const video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        video.loop = true;
        video.style.position = 'absolute';
        video.style.bottom = '0';
        video.style.right = '0';
        video.style.width = '1px';
        video.style.height = '1px';
        video.style.opacity = '0.01'; // Maior que 0 para o Chrome considerar renderizado
        video.style.pointerEvents = 'none';
        video.style.zIndex = '9999';
        
        document.body.appendChild(video);
        video.play().catch(e => console.log('Video keep-alive prevent:', e));
        keepAliveAudioRef.current.video = video;
      }
    } catch (err) {
      console.log('Keep-Alive failed:', err);
    }
  };

  const stopAudioKeepAlive = () => {
    if (keepAliveAudioRef.current) {
      try {
        keepAliveAudioRef.current.oscillator.stop();
        keepAliveAudioRef.current.audioCtx.close();
      } catch (e) {}
      
      if (keepAliveAudioRef.current.video) {
        try {
          keepAliveAudioRef.current.video.pause();
          keepAliveAudioRef.current.video.remove();
        } catch (e) {}
      }
      
      keepAliveAudioRef.current = null;
    }
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isRunningRef.current) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
      stopAudioKeepAlive();
    };
  }, []);

  const connect = useCallback(async () => {
    const currentConnectionId = Date.now() + Math.random();
    connectionIdRef.current = currentConnectionId;

    if (ws.current) {
      ws.current.onclose = null;
      ws.current.onerror = null;
      ws.current.onmessage = null;
      ws.current.onopen = null;
      if (workerRef.current) {
        workerRef.current.postMessage({ command: 'stop' });
        workerRef.current.terminate();
        workerRef.current = null;
      }
      if (ws.current.authTimeout) clearTimeout(ws.current.authTimeout);
      ws.current.close();
      ws.current = null;
    }
    
    if (wsTimeoutCheckRef.current) {
      clearInterval(wsTimeoutCheckRef.current);
      wsTimeoutCheckRef.current = null;
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
      const response = await Promise.race([
        api.get('/deriv/connection-info', {
          headers: { 'x-account-type': accountType }
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout de conexão com o backend. Tente novamente.')), 10000))
      ]);
      const { data } = response;
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
        if (cyclePauseTimeoutRef.current) {
          setStatus('Reconectado! Aguardando fim da pausa do ciclo...');
          return;
        }

        if (configRef.current.enableSchedule && statsRef.current.activeScheduleId) {
          const activeSchedule = configRef.current.schedules?.find(s => s.id === statsRef.current.activeScheduleId);
          if (activeSchedule && statsRef.current.currentCycle > activeSchedule.maxCycles) {
            setStatus('Reconectado! Limite de ciclos atingido.');
            return;
          }
        }

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
      
      socket.authTimeout = setTimeout(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.close();
        }
      }, 15000);
      
      if (!isNewFlow) {
        socket.send(JSON.stringify({ authorize: token }));
      } else {
        // No fluxo novo (OTP), a conexão já abre autenticada
        onAuthSuccess(initialBalance, initialCurrency);
      }
      
      // Inline Web Worker para Ping (Evita throttling de aba em background)
      const workerCode = `
        let intervalId;
        self.onmessage = function(e) {
          if (e.data.command === 'start') {
            intervalId = setInterval(function() {
              self.postMessage('ping');
            }, e.data.interval);
          } else if (e.data.command === 'stop') {
            clearInterval(intervalId);
          }
        };
      `;
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const worker = new Worker(URL.createObjectURL(blob));
      workerRef.current = worker;
      
      worker.onmessage = () => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ ping: 1 }));
        }
      };
      
      setTimeout(() => {
        if (socket.readyState !== WebSocket.OPEN) return;
        worker.postMessage({ command: 'start', interval: 10000 });
      }, 5000);
      
      // Heartbeat detector: check if no messages received for 20s
      lastMessageTimeRef.current = Date.now();
      socket.lastTickTime = Date.now(); // Track ticks separately
      
      wsTimeoutCheckRef.current = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          const now = Date.now();
          const timeSinceLastMsg = now - lastMessageTimeRef.current;
          const timeSinceLastTick = now - socket.lastTickTime;
          
          if (timeSinceLastMsg > 20000) {
            console.log('Websocket timeout detectado (sem mensagens por 20s). Forçando reconexão...');
            socket.close(); // Dispara o onclose automaticamente e reconecta
          } else if (isRunningRef.current && timeSinceLastTick > 30000) {
            // Se está rodando, mas não recebe ticks há 30s (e não está em pausa intencional sem ticks)
            const st = statusRef.current;
            const isPaused = (st.includes('Ciclo') && st.includes('Concluído! Pausa')) || 
                             st.includes('Aguardando próximo') || 
                             st.includes('Limite de ciclos') || 
                             st.includes('Sessão encerrada');
            if (!isPaused) {
              console.log('Tick stream timeout detectado (sem ticks por 30s). A API da Deriv parou de enviar o fluxo. Forçando reconexão...');
              setStatus('Fluxo de dados interrompido. Reconectando...');
              socket.close();
            }
          }
        }
      }, 5000);
    };

    socket.onmessage = (msg) => {
      lastMessageTimeRef.current = Date.now();
      const data = JSON.parse(msg.data);
      
      if (data.msg_type === 'tick') {
        socket.lastTickTime = Date.now();
      }
      
      if (data.msg_type === 'ping') {
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
      if (workerRef.current) {
        workerRef.current.postMessage({ command: 'stop' });
        workerRef.current.terminate();
        workerRef.current = null;
      }
      if (socket.authTimeout) clearTimeout(socket.authTimeout);
      if (wsTimeoutCheckRef.current) {
        clearInterval(wsTimeoutCheckRef.current);
        wsTimeoutCheckRef.current = null;
      }
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
        if (workerRef.current) {
          workerRef.current.postMessage({ command: 'stop' });
          workerRef.current.terminate();
          workerRef.current = null;
        }
        if (ws.current.authTimeout) clearTimeout(ws.current.authTimeout);
        if (wsTimeoutCheckRef.current) clearInterval(wsTimeoutCheckRef.current);
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
    statsRef.current.amortizationDebt = 0;
    statsRef.current.fixedInstallment = 0;
    statsRef.current.currentCycle = 1;
    statsRef.current.cycleSessionProfit = 0;
    statsRef.current.activeScheduleId = null; // Reset schedule tracking on full start
    statsRef.current.diagnostic = {
      targetLosses: 1,
      highInLast10: 0,
      radarMessage: 'Iniciando telemetria...',
    };
    
    setStats({ ...statsRef.current });

    // Reset trades for new session
    setTrades([]);

    // Anti-Sleep / Keep-Alive
    requestWakeLock();
    startAudioKeepAlive();

    // Se estiver usando cronograma, não se inscreve logo de cara.
    // O useEffect do cronograma fará a checagem e inscrição.
    if (!configRef.current.enableSchedule) {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({
          ticks: configRef.current.market,
          subscribe: 1
        }));
      }
    }
  };

  const stopBot = () => {
    setIsRunning(false);
    setStatus('IA Parada.');
    
    releaseWakeLock();
    stopAudioKeepAlive();
    if (cyclePauseTimeoutRef.current) {
      clearTimeout(cyclePauseTimeoutRef.current);
      cyclePauseTimeoutRef.current = null;
    }
    
    // Unsubscribe from ticks
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        forget_all: 'ticks'
      }));
    }
  };

  const updateConfig = (key, value) => {
    setConfig(prev => {
      const newConf = { ...prev, [key]: value };
      localStorage.setItem('bot_config', JSON.stringify(newConf));
      return newConf;
    });
  };

  useEffect(() => {
    if (!isRunning || !config.enableSchedule) {
      if (checkScheduleRef.current) clearInterval(checkScheduleRef.current);
      return;
    }

    const checkSchedule = () => {
      const now = new Date();
      const currentHour = now.getHours().toString().padStart(2, '0');
      const currentMin = now.getMinutes().toString().padStart(2, '0');
      const currentTimeStr = `${currentHour}:${currentMin}`;

      let activeSchedule = null;
      for (const schedule of config.schedules) {
        const start = schedule.startTime;
        const end = schedule.endTime;
        
        let isActive = false;
        if (start <= end) {
          isActive = currentTimeStr >= start && currentTimeStr <= end;
        } else {
          // Crosses midnight
          isActive = currentTimeStr >= start || currentTimeStr <= end;
        }

        if (isActive) {
           activeSchedule = schedule;
           break;
        }
      }

      if (activeSchedule) {
        if (statsRef.current.activeScheduleId !== activeSchedule.id) {
           // Started a new schedule block!
           statsRef.current.activeScheduleId = activeSchedule.id;
           statsRef.current.currentCycle = 1;
           statsRef.current.cycleSessionProfit = 0;
           setStats({ ...statsRef.current });
           
           if (statsRef.current.currentCycle <= activeSchedule.maxCycles) {
               setStatus(`Sessão ${activeSchedule.startTime} iniciada! Buscando trades...`);
               if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                 ws.current.send(JSON.stringify({ forget_all: 'ticks' }));
                 setTimeout(() => {
                   if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                     ws.current.send(JSON.stringify({ ticks: configRef.current.market, subscribe: 1 }));
                   }
                 }, 1000);
               }
           }
        } else {
           // Same schedule block as before
           if (statsRef.current.currentCycle > activeSchedule.maxCycles) {
               if (statusRef.current !== 'Limite de ciclos do período atingido. Aguardando próximo horário...') {
                   setStatus('Limite de ciclos do período atingido. Aguardando próximo horário...');
                   if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                     ws.current.send(JSON.stringify({ forget_all: 'ticks' }));
                   }
               }
           }
        }
      } else {
        // No active schedule block
        if (statsRef.current.activeScheduleId) {
          statsRef.current.activeScheduleId = null;
          setStatus('Sessão encerrada. Aguardando próximo horário...');
          if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ forget_all: 'ticks' }));
          }
        } else {
          if (statusRef.current !== 'Aguardando próximo horário agendado...' && statusRef.current !== 'Sessão encerrada. Aguardando próximo horário...') {
            setStatus('Aguardando próximo horário agendado...');
          }
        }
      }
    };

    checkSchedule();
    checkScheduleRef.current = setInterval(checkSchedule, 30000);

    return () => {
      if (checkScheduleRef.current) clearInterval(checkScheduleRef.current);
    };
  }, [isRunning, config.enableSchedule, config.schedules]);

  const handleTick = (tickData) => {
    if (!isRunningRef.current) return;
    
    // Sistema Anti-Congelamento (Proteção contra falhas da API da Deriv)
    if (statsRef.current.lastQuote === tickData.quote) {
      statsRef.current.frozenTicks = (statsRef.current.frozenTicks || 0) + 1;
    } else {
      statsRef.current.frozenTicks = 0;
      statsRef.current.lastQuote = tickData.quote;
    }

    // Se o preço ficar EXATAMENTE igual por 60 ticks seguidos (anomalia severa), a API travou.
    if (statsRef.current.frozenTicks >= 60) {
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
          if (statusRef.current !== 'Alta volatilidade detectada. Pausando...') setStatus('Alta volatilidade detectada. Pausando...');
        }
      }
    }
    statsRef.current.lastQuoteValue = currentQuote;

    // Atualiza Radar de Ondas (últimos 50 ticks) SEMPRE, mesmo com operação aberta, para não perder o tracking do mercado.
    statsRef.current.recentDigits.push(lastDigit);
    if (statsRef.current.recentDigits.length > 100) {
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
        statsRef.current.ghostConsecutiveWins = (statsRef.current.ghostConsecutiveWins || 0) + 1;
        
        if (statsRef.current.ghostConsecutiveWins >= 2) {
          statsRef.current.ghostMode = false;
          statsRef.current.virtualLossCount = 0;
          statsRef.current.ghostConsecutiveWins = 0;
          statsRef.current.diagnostic.radarMessage = 'Ghost Win Duplo Confirmado! Retornando ao mercado real...';
          setStats({ ...statsRef.current });
          setStatus('Buscando trades reais...');
        } else {
          statsRef.current.diagnostic.radarMessage = 'Ghost Win (1/2). Aguardando confirmação...';
          setStats({ ...statsRef.current });
          setStatus('Ghost Mode: Confirmando tendência...');
        }
      } else {
        statsRef.current.ghostConsecutiveWins = 0;
        statsRef.current.virtualLossCount = 0;
        statsRef.current.diagnostic.radarMessage = 'Ghost Loss! O mercado continua ruim. Evitamos um loss real.';
        setStats({ ...statsRef.current });
        setStatus('Ghost Trade Loss. Aguardando novo ciclo fantasma...');
      }
      return; 
    }
    
    // 1. Resfriamento (Pausas)
    if (statsRef.current.cooldownTicks > 0) {
      statsRef.current.cooldownTicks -= 1;
      setStats({ ...statsRef.current });
      
      // Apenas atualiza o status se não for uma mensagem prioritária
      const current = statusRef.current;
      if (!current.includes('Amortizando') && !current.includes('Alta volatilidade') && !current.includes('Sequência de Vitórias')) {
        if (current !== 'Resfriando (Pausa de Segurança)...') {
          setStatus('Resfriando (Pausa de Segurança)...');
        }
      }
      return; // Ignora o mercado durante o resfriamento
    }

    // 2. Radar de Ondas (Análise de Frequência Global - 50 e 100 Ticks)
    if (statsRef.current.recentDigits.length >= 50) {
      const last50 = statsRef.current.recentDigits.slice(-50);
      const highDigits50 = last50.filter(d => d === 8 || d === 9).length;
      
      let highDigits100 = 0;
      if (statsRef.current.recentDigits.length === 100) {
        highDigits100 = statsRef.current.recentDigits.filter(d => d === 8 || d === 9).length;
      }

      if (highDigits50 >= 15 || highDigits100 >= 26) { // 30% em 50, ou 26% em 100
        statsRef.current.virtualLossCount = 0;
        setStats({ ...statsRef.current });
        if (statusRef.current !== 'Onda longa de anomalia detectada. Pausando...') setStatus('Onda longa de anomalia detectada. Pausando...');
        return; 
      }
    }

    let targetLosses = configRef.current.mode === 'veloz' ? 1 : 
                         configRef.current.mode === 'balanceado' ? 2 : 
                         configRef.current.mode === 'preciso' ? 3 : 4; // Super Sniper = 4

    // Gatilho Dinâmico de Risco (Smart Recovery Delay)
    // Aumenta a exigência gráfica nos Martingales, mas sem exagerar para não congelar o robô
    if (statsRef.current.martingaleLevel >= 1) {
      if (configRef.current.mode === 'veloz' || configRef.current.mode === 'balanceado') {
        targetLosses = 2; // Limite máximo de 2 perdas virtuais seguidas para garantir rapidez
      } else {
        targetLosses += 1; // Modos preciso/sniper ganham +1 de exigência no martingale
      }
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
      // Adicionado +1 para garantir que haja folga e não exija um cenário perfeitamente limpo irreal.
      const allowedMicroLosses = configRef.current.mode === 'veloz' ? Math.max(3, targetLosses + 1) : targetLosses + 1;

      // Só bloqueia se tiver mais dígitos ruins agrupados do que o nosso alvo permite
      if (highInLast10 > allowedMicroLosses) {
        statsRef.current.virtualLossCount = 0;
        statsRef.current.diagnostic.radarMessage = `Micro-Onda bloqueou! Tem ${highInLast10} ruins nos ultimos 10 ticks (limite ${allowedMicroLosses})`;
        setStats({ ...statsRef.current });
        if (statusRef.current !== 'Micro-Onda detectada. Pausando...') setStatus('Micro-Onda detectada. Pausando...');
        return; // Bloqueia entradas
      }
    }

    statsRef.current.diagnostic.radarMessage = 'Gráfico limpo. Rastreador ativado.';

    if (statusRef.current === 'Resfriando (Pausa de Segurança)...' || statusRef.current === 'Resfriando após Loss...' || statusRef.current === 'Onda longa de anomalia detectada. Pausando...' || statusRef.current === 'Micro-Onda detectada. Pausando...' || statusRef.current === 'Filtro Veloz: Ignorando cluster perigoso...' || statusRef.current === 'Reconectado! Buscando trades...') {
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
              if (statusRef.current !== 'Filtro Veloz: Ignorando cluster perigoso...') setStatus('Filtro Veloz: Ignorando cluster perigoso...');
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
    if (tradeTimeoutRef.current) clearTimeout(tradeTimeoutRef.current);
    tradeTimeoutRef.current = setTimeout(() => {
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

    if (tradeTimeoutRef.current) {
      clearTimeout(tradeTimeoutRef.current);
      tradeTimeoutRef.current = null;
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
    if (configRef.current.enableCycles || configRef.current.enableSchedule) {
      statsRef.current.cycleSessionProfit += profit;
    }
    
    const rm = configRef.current.riskManagement;
    const fractionDivider = configRef.current.strategy === 'LOW' ? 5 : 3;
    const limitNiveis = configRef.current.maxMartingaleLevel || 3;
    const maxLevel = rm === 'hit_and_run' ? limitNiveis : rm === 'amortizacao' || rm === 'hibrido' ? limitNiveis : 1;
    const multiplier = rm === 'hit_and_run' ? 2.7 : rm === 'conservador' ? 2.7 : rm === 'otimizado' ? 5.5 : 6;
    const estimatedPayoutRatio = 0.1714; // Payout médio estimado da estratégia LOW (Dígito abaixo de 8)
    
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

    // Lógica especial para o modo Amortização
    if (rm === 'amortizacao') {
      if (!won) {
        // Adiciona a perda exata à dívida
        statsRef.current.amortizationDebt += Math.abs(profit);
          level += 1;
          
          if (level > maxLevel) {
            nextStake = configRef.current.initialStake;
            level = 0;
            statsRef.current.cycleProfit = 0;
            statsRef.current.amortizationDebt = 0; // Assume o loss do ciclo
            statsRef.current.fixedInstallment = 0; // Limpa a parcela fixa
            statsRef.current.cooldownTicks = 60; // Pausa longa
            statsRef.current.diagnostic.radarMessage = '⚠️ Limite de Amortização atingido! Pausa de segurança pesada (60 ticks).';
          } else {
            let cooldown = configRef.current.mode === 'veloz' ? 8 : 25;
            statsRef.current.cooldownTicks = cooldown;
            
            statsRef.current.ghostMode = true;
            statsRef.current.ghostEntryWait = false;
            statsRef.current.diagnostic.radarMessage = '👻 Ghost Mode Ativado. Amortizando dívida...';

            // Cria uma parcela fixa baseada na dívida dividida pela fração (Recuperação Rápida ou Suave)
            if (!statsRef.current.fixedInstallment || statsRef.current.amortizationDebt > (statsRef.current.fixedInstallment * (fractionDivider + 2))) {
              statsRef.current.fixedInstallment = statsRef.current.amortizationDebt / fractionDivider;
            }
            
            const installment = Math.min(statsRef.current.fixedInstallment, statsRef.current.amortizationDebt);
            nextStake = configRef.current.initialStake + (installment / estimatedPayoutRatio);
          }
        
      } else {
        if (statsRef.current.amortizationDebt > 0) {
          // Abate a dívida usando o lucro extra gerado pela aposta maior
          const baseExpectedProfit = configRef.current.initialStake * estimatedPayoutRatio;
          const excessProfit = profit - baseExpectedProfit;
          
          if (excessProfit > 0) {
            statsRef.current.amortizationDebt -= excessProfit;
          }
          
          if (statsRef.current.amortizationDebt <= 0.02) {
            // Dívida zerada!
            statsRef.current.amortizationDebt = 0;
            statsRef.current.fixedInstallment = 0; // Limpa a parcela fixa
            nextStake = configRef.current.initialStake;
            level = 0;
            statsRef.current.cycleProfit = 0;
            setStatus('Dívida amortizada! Retornando ao lucro padrão.');
          } else {
            // Usa a parcela fixa para abater a dívida de forma linear (sem cair em assíntota)
            if (!statsRef.current.fixedInstallment) {
              statsRef.current.fixedInstallment = statsRef.current.amortizationDebt / fractionDivider;
            }
            const installment = Math.min(statsRef.current.fixedInstallment, statsRef.current.amortizationDebt);
            nextStake = configRef.current.initialStake + (installment / estimatedPayoutRatio);
            setStatus(`Amortizando... Resta $${statsRef.current.amortizationDebt.toFixed(2)}`);
          }
        } else {
          // Win normal
          nextStake = configRef.current.initialStake;
          level = 0;
          statsRef.current.cycleProfit = 0;
          statsRef.current.fixedInstallment = 0; // Limpa a parcela fixa
        }
      }
    } else if (rm === 'hibrido') {
      // -----------------------------------------------------
      // Lógica de Ciclo Híbrido (Agressivo + Amortizado)
      // -----------------------------------------------------
      if (statsRef.current.cycleProfit >= -0.01) {
        // Ciclo encerrado com lucro (ou zero). Reseta!
        nextStake = configRef.current.initialStake;
        level = 0;
        statsRef.current.cycleProfit = 0;
        statsRef.current.fixedInstallment = 0; // Limpa a parcela fixa
      } else {
        // Está no prejuízo neste ciclo.
        if (!won) {
          level += 1;
          
          if (level > maxLevel) {
            nextStake = configRef.current.initialStake;
            level = 0;
            statsRef.current.cycleProfit = 0;
            statsRef.current.fixedInstallment = 0; // Limpa a parcela fixa
            statsRef.current.cooldownTicks = 60;
            statsRef.current.diagnostic.radarMessage = '⚠️ Limite Híbrido atingido! Pausa de segurança pesada (60 ticks).';
          } else {
            let cooldown = configRef.current.mode === 'veloz' ? 8 : 25;
            if (configRef.current.mode === 'veloz' && level > 0) {
              cooldown = 15;
            }
            statsRef.current.cooldownTicks = cooldown;
            
            statsRef.current.ghostMode = true;
            statsRef.current.ghostEntryWait = false;
            
            const baseProfit = configRef.current.initialStake * estimatedPayoutRatio;
            const debt = Math.abs(statsRef.current.cycleProfit);

            if (level === 1) {
              statsRef.current.diagnostic.radarMessage = '👻 Ghost Mode Ativado para Martingale Agressivo (Nível 1).';
              nextStake = (debt + baseProfit) / estimatedPayoutRatio;
            } else {
              statsRef.current.diagnostic.radarMessage = `👻 Ghost Mode Ativado. Amortização Híbrida (Nível ${level})...`;
              
              // Cria uma parcela fixa dividindo a dívida pela fração apenas na primeira vez que entra neste bloco
              if (!statsRef.current.fixedInstallment || debt > (statsRef.current.fixedInstallment * (fractionDivider + 2))) {
                statsRef.current.fixedInstallment = debt / fractionDivider;
              }
              const installment = Math.min(statsRef.current.fixedInstallment, debt);
              nextStake = (installment + baseProfit) / estimatedPayoutRatio;
            }
          }
        } else {
          // Se ganhou mas ainda está no prejuízo, usa a parcela fixa previamente calculada
          const baseProfit = configRef.current.initialStake * estimatedPayoutRatio;
          const debt = Math.abs(statsRef.current.cycleProfit);
          
          if (!statsRef.current.fixedInstallment) {
            statsRef.current.fixedInstallment = debt / fractionDivider;
          }
          const installment = Math.min(statsRef.current.fixedInstallment, debt);
          
          nextStake = (installment + baseProfit) / estimatedPayoutRatio;
          setStatus(`Amortização Híbrida: Resta $${debt.toFixed(2)}`);
        }
      }
    } else {
      // -----------------------------------------------------
      // Lógica de Ciclo Convencional (Outros Modos)
      // -----------------------------------------------------
      // Resolve o bug de precisão de ponto flutuante do JavaScript
      if (statsRef.current.cycleProfit >= -0.01) {
        // Ciclo encerrado com lucro (ou zero). Reseta!
        nextStake = configRef.current.initialStake;
        level = 0;
        statsRef.current.cycleProfit = 0;
      } else {
        // Está no prejuízo neste ciclo.
        if (!won) {
          // Se perdeu na entrada real, ativa o Resfriamento para fugir da "onda"
          let cooldown = configRef.current.mode === 'veloz' ? 8 : 25;
          
          if (configRef.current.mode === 'veloz' && level > 0) {
            cooldown = 15;
          }
          
          statsRef.current.cooldownTicks = cooldown;
          
          statsRef.current.ghostMode = true;
          statsRef.current.ghostEntryWait = false;
          statsRef.current.diagnostic.radarMessage = '👻 Ghost Mode Ativado para blindar o próximo Martingale.';

          // Se perdeu, multiplica a aposta se ainda não bateu no limite
          if (level < maxLevel) {
            level += 1;
            nextStake = nextStake * multiplier;
          } else {
            nextStake = configRef.current.initialStake;
            level = 0;
            statsRef.current.cycleProfit = 0;
            statsRef.current.cooldownTicks = 60;
            statsRef.current.diagnostic.radarMessage = '⚠️ Limite de Martingale atingido! Pausa de segurança pesada (60 ticks).';
          }
        } else {
          // Se ganhou a operação, mas ainda tem prejuízo no ciclo:
          if (rm === 'hit_and_run') {
            setStatus('Recuperação fracionada. Mantendo valor da aposta...');
          } else {
            setStatus('Recuperação parcial concluída. Reiniciando por segurança...');
            level = 0;
            nextStake = configRef.current.initialStake;
            statsRef.current.cycleProfit = 0;
            statsRef.current.fixedInstallment = 0;
          }
        }
      }
    }

    // -----------------------------------------------------
    // Pausa após Grande Sequência de Vitórias (Win-Streak Breaker)
    // -----------------------------------------------------
    if (statsRef.current.consecutiveWins >= 12 && level === 0 && statsRef.current.amortizationDebt <= 0 && statsRef.current.cycleProfit >= -0.01) {
      statsRef.current.cooldownTicks = 30; // Pausa para embaralhar o mercado
      statsRef.current.consecutiveWins = 0;
      statsRef.current.diagnostic.radarMessage = '🎉 Sequência de 12 Wins! Fazendo pausa preventiva de 30 ticks.';
      setStatus('Resfriando após Sequência de Vitórias...');
    }
    
    nextStake = parseFloat(nextStake.toFixed(2));
    
    // Trava 1: Limite máximo de aposta (Max Stake)
    if (configRef.current.maxStake > 0 && nextStake > configRef.current.maxStake) {
      nextStake = configRef.current.maxStake;
    }
    
    // Verifica metas ATUAIS
    const currentTotalProfit = statsRef.current.profit;
    
    // Trava 2: Pre-Emptive Stop Loss (Verifica se a próxima aposta quebraria o Stop Loss)
    const wouldExceedStopLoss = (currentTotalProfit - nextStake) <= -configRef.current.stopLoss;
    
    statsRef.current.currentStake = nextStake;
    statsRef.current.martingaleLevel = level;
    
    setStats({ ...statsRef.current });

    if (wouldExceedStopLoss) {
      stopBot();
      setStatus(`Stop Loss Preventivo! Evitou entrada de $${nextStake.toFixed(2)}`);
      playAlertSound('loss');
      api.post('/telegram/notify', { message: `🚨 *STOP LOSS PREVENTIVO ATINGIDO* 🚨\n\nLucro Atual: *$${currentTotalProfit.toFixed(2)}*\nAposta Evitada: *$${nextStake.toFixed(2)}*\n\nO robô foi pausado automaticamente.` }).catch(err => console.error('Falha ao notificar telegram', err));
    } else if (currentTotalProfit >= configRef.current.targetProfit) {
      stopBot();
      setStatus('Meta de Lucro Atingida!');
      playAlertSound('win');
      api.post('/telegram/notify', { message: `✅ *META DE LUCRO ATINGIDA!* ✅\n\nLucro Final: *$${currentTotalProfit.toFixed(2)}*\nMeta: *$${configRef.current.targetProfit.toFixed(2)}*\n\nParabéns! O robô foi pausado automaticamente.` }).catch(err => console.error('Falha ao notificar telegram', err));
    } else if (currentTotalProfit <= -configRef.current.stopLoss) {
      stopBot();
      setStatus('Stop Loss Atingido!');
      playAlertSound('loss');
      api.post('/telegram/notify', { message: `❌ *STOP LOSS ATINGIDO* ❌\n\nPrejuízo Final: *$${currentTotalProfit.toFixed(2)}*\nLimite: *$${configRef.current.stopLoss.toFixed(2)}*\n\nO robô foi pausado automaticamente.` }).catch(err => console.error('Falha ao notificar telegram', err));
    } else if (statsRef.current.guaranteedFloor > 0 && currentTotalProfit < statsRef.current.guaranteedFloor && currentTotalProfit > 0) {
      // Bateu no Trailing Stop (Piso Garantido), mas só sai se ainda estiver no lucro
      stopBot();
      setStatus(`Piso de Lucro Atingido! (Saída em: $${currentTotalProfit.toFixed(2)})`);
      playAlertSound('win');
      api.post('/telegram/notify', { message: `🛡️ *TRAILING STOP ATIVADO* 🛡️\n\nPiso de Lucro Garantido Atingido!\nLucro Final: *$${currentTotalProfit.toFixed(2)}*\n\nO robô garantiu parte do lucro e foi pausado automaticamente.` }).catch(err => console.error('Falha ao notificar telegram', err));
    } else {
      let currentCycleTarget = configRef.current.cycleTarget;
      let currentPauseMins = configRef.current.pauseTimeMinutes || 30;
      let maxCycles = Infinity;
      let isScheduleActive = false;

      if (configRef.current.enableSchedule && statsRef.current.activeScheduleId) {
        const activeSchedule = configRef.current.schedules?.find(s => s.id === statsRef.current.activeScheduleId);
        if (activeSchedule) {
           currentCycleTarget = activeSchedule.cycleTarget;
           currentPauseMins = activeSchedule.pauseTimeMinutes;
           maxCycles = activeSchedule.maxCycles;
           isScheduleActive = true;
        }
      }

      const isCycleMode = configRef.current.enableCycles || isScheduleActive;

      if (isCycleMode && statsRef.current.cycleSessionProfit >= currentCycleTarget && currentCycleTarget > 0) {
        // Ciclo concluído
        setStatus(`Ciclo ${statsRef.current.currentCycle} Concluído! Pausa de ${currentPauseMins} min...`);
        playAlertSound('win');
        api.post('/telegram/notify', { message: `⏳ *CICLO ${statsRef.current.currentCycle} CONCLUÍDO* ⏳\n\nLucro do Ciclo: *$${statsRef.current.cycleSessionProfit.toFixed(2)}*\nLucro Total: *$${currentTotalProfit.toFixed(2)}*\n\nO robô fará uma pausa de ${currentPauseMins} minutos e retornará automaticamente.` }).catch(err => console.error('Falha ao notificar telegram', err));
        
        // Unsubscribe from ticks temporarily
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({ forget_all: 'ticks' }));
        }
        
        if (cyclePauseTimeoutRef.current) clearTimeout(cyclePauseTimeoutRef.current);
        
        cyclePauseTimeoutRef.current = setTimeout(() => {
          cyclePauseTimeoutRef.current = null;
          if (!isRunningRef.current) return; // Se o usuário parou o robô manualmente na pausa
          
          statsRef.current.cycleSessionProfit = 0;
          statsRef.current.currentCycle += 1;
          setStats({ ...statsRef.current });
          
          // Se for cronograma e estourou os ciclos, não reinicia os ticks.
          // O useEffect vai tratar de encerrar a sessão.
          if (isScheduleActive && statsRef.current.currentCycle > maxCycles) {
             setStatus('Limite de ciclos do período atingido. Aguardando próximo horário...');
             return;
          }
          
          setStatus(`Buscando trades (Ciclo ${statsRef.current.currentCycle})...`);
          
          // Resubscribe to ticks
          if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ ticks: configRef.current.market, subscribe: 1 }));
          }
        }, currentPauseMins * 60000);
      } else {
        if (isRunningRef.current && status !== 'Resfriando após Sequência de Vitórias...') {
          setStatus(isCycleMode ? `Buscando trades (Ciclo ${statsRef.current.currentCycle})...` : 'Buscando trades...');
        }
      }
    }

    // -----------------------------------------------------
    // Auto-Pilot IA (Regulador de Risco Dinâmico)
    // -----------------------------------------------------
    const totalTrades = statsRef.current.wins + statsRef.current.losses;
    if (configRef.current.enableAiRegulator && isRunningRef.current) {
      if ((totalTrades > 0 && totalTrades % 10 === 0) || statsRef.current.martingaleLevel >= 2) {
        // Envia raio-x em background sem travar o frontend
        api.post('/ai/regulate', {
          stats: statsRef.current,
          config: configRef.current
        }).then(res => {
          const result = res.data;
          if (result && result.action) {
            if (result.action === 'pause' && result.duration_ticks) {
              statsRef.current.cooldownTicks = result.duration_ticks;
              statsRef.current.virtualLossCount = 0;
              statsRef.current.diagnostic.radarMessage = `🤖 Auto-Pilot interveio: ${result.reason}`;
              setStatus('Auto-Pilot: Pausa Preventiva Ativada!');
              setStats({ ...statsRef.current });
            } else if (result.action === 'change_mode' && result.mode) {
              // Trigger config change via custom event so it updates UI too
              const event = new CustomEvent('advisor_apply_config', { detail: { mode: result.mode } });
              window.dispatchEvent(event);
              statsRef.current.diagnostic.radarMessage = `🤖 Auto-Pilot interveio: Modo alterado para ${result.mode}. Motivo: ${result.reason}`;
              setStatus(`Auto-Pilot ativou modo ${result.mode}`);
              setStats({ ...statsRef.current });
            } else if (result.action === 'continue') {
              console.log('[Auto-Pilot] IA avaliou o cenário e permitiu continuar.');
            }
          }
        }).catch(err => console.error('Erro no Auto-Pilot IA:', err));
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
