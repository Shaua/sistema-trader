import React, { useState } from 'react';
import { Bot, Play, Square, Settings, Activity, Clock, ShieldAlert, BarChart2, TrendingUp, AlertCircle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useDerivBot from '../hooks/useDerivBot';
import Header from '../components/layout/Header';

export default function AIRobots() {
  const { config, updateConfig, stats, trades, isRunning, startBot, stopBot, status, authorized } = useDerivBot();
  const [activeTab, setActiveTab] = useState('negociacoes'); // grafico, digitos, negociacoes, registros
  const [deepAnalysis, setDeepAnalysis] = useState(false);

  const getMarketName = (symbol) => {
    const markets = {
      '1HZ10V': 'Volatility 10 (1s) Index',
      '1HZ25V': 'Volatility 25 (1s) Index',
      '1HZ50V': 'Volatility 50 (1s) Index',
      '1HZ75V': 'Volatility 75 (1s) Index',
      '1HZ100V': 'Volatility 100 (1s) Index',
      'R_10': 'Volatility 10 Index',
      'R_25': 'Volatility 25 Index',
      'R_50': 'Volatility 50 Index',
      'R_75': 'Volatility 75 Index',
      'R_100': 'Volatility 100 Index'
    };
    return markets[symbol] || symbol || 'Volatility 100 (1s) Index';
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: stats.currency || 'USD' }).format(val);
  };

  const getWinRate = () => {
    const total = stats.wins + stats.losses;
    return total === 0 ? '0.00' : ((stats.wins / total) * 100).toFixed(2);
  };

  return (
    <div style={{ background: 'var(--color-bg-primary)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header title="Robôs IA" subtitle="Execute suas estratégias de forma automatizada" />
      <div className="page-container" style={{ padding: 24, display: 'flex', gap: 24, flex: 1, overflow: 'hidden' }}>
      
      {/* Left Panel: Controls */}
      <div className="card" style={{ width: 340, display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto' }}>
        
        {/* Header Stats */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: 16 }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 4 }}>Lucro</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: stats.profit >= 0 ? 'var(--color-success)' : 'var(--color-critical)' }}>
              {stats.profit >= 0 ? '+' : ''}{formatCurrency(stats.profit)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 4 }}>Saldo</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {formatCurrency(stats.balance)}
            </div>
          </div>
        </div>

        {/* Status */}
        <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
          {status}
        </div>

        {/* Deep Analysis Toggle */}
        <button 
          className="btn" 
          style={{ 
            background: deepAnalysis ? 'linear-gradient(90deg, #F97316 0%, #EA580C 100%)' : 'var(--color-bg-secondary)', 
            color: deepAnalysis ? 'white' : 'var(--color-text-primary)',
            justifyContent: 'center', border: 'none', transition: 'all 0.3s'
          }}
          onClick={() => setDeepAnalysis(!deepAnalysis)}
        >
          <Sparkles size={16} />
          MODO DEEP ANALYSIS
        </button>

        {deepAnalysis && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            style={{ 
              background: '#111827', padding: 12, borderRadius: 8, fontSize: 12, 
              color: '#34D399', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', gap: 6, 
              border: '1px solid #065F46' 
            }}
          >
            <div style={{ color: '#F97316', fontWeight: 600, marginBottom: 4 }}>[ TELEMETRIA ATIVA ]</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{color: '#9CA3AF'}}>Gatilho Alvo:</span> 
              <span>{stats.diagnostic?.targetLosses} perdas</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{color: '#9CA3AF'}}>Contagem Virtual:</span> 
              <span>{stats.virtualLossCount} perdas</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{color: '#9CA3AF'}}>Radar (10 ticks):</span> 
              <span>{stats.diagnostic?.highInLast10} ruins</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{color: '#9CA3AF'}}>Resfriamento:</span> 
              <span>{stats.cooldownTicks > 0 ? `${stats.cooldownTicks}s` : 'Pronto'}</span>
            </div>
            {stats.ghostMode && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#A78BFA', fontWeight: 600 }}>
                <span>Modo Fantasma:</span> 
                <span>ATIVADO 👻</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{color: '#9CA3AF'}}>Piso Garantido:</span> 
              <span style={{ color: stats.guaranteedFloor > 0 ? '#34D399' : '#9CA3AF' }}>${stats.guaranteedFloor.toFixed(2)}</span>
            </div>
            <div style={{ color: '#FCD34D', marginTop: 4, borderTop: '1px solid #1F2937', paddingTop: 6, lineHeight: 1.4 }}>
              &gt; {stats.diagnostic?.radarMessage}
            </div>
          </motion.div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><Activity size={16} /> Quantia inicial</div>
            <input 
              type="number" className="form-input" style={{ width: 100, textAlign: 'right' }} 
              value={config.initialStake} onChange={(e) => updateConfig('initialStake', parseFloat(e.target.value))} 
              disabled={isRunning}
            />
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><TrendingUp size={16} /> Lucro alvo</div>
            <input 
              type="number" className="form-input" style={{ width: 100, textAlign: 'right' }} 
              value={config.targetProfit} onChange={(e) => updateConfig('targetProfit', parseFloat(e.target.value))}
              disabled={isRunning}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><ShieldAlert size={16} /> Limite de perda</div>
            <input 
              type="number" className="form-input" style={{ width: 100, textAlign: 'right' }} 
              value={config.stopLoss} onChange={(e) => updateConfig('stopLoss', parseFloat(e.target.value))}
              disabled={isRunning}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><BarChart2 size={16} /> Mercado</div>
            <select className="form-input" style={{ width: 150 }} value={config.market} onChange={(e) => updateConfig('market', e.target.value)} disabled={isRunning}>
              <option value="1HZ10V">Volatility 10 (1s) Index</option>
              <option value="1HZ25V">Volatility 25 (1s) Index</option>
              <option value="1HZ50V">Volatility 50 (1s) Index</option>
              <option value="1HZ75V">Volatility 75 (1s) Index</option>
              <option value="1HZ100V">Volatility 100 (1s) Index</option>
              <option value="R_10">Volatility 10 Index</option>
              <option value="R_25">Volatility 25 Index</option>
              <option value="R_50">Volatility 50 Index</option>
              <option value="R_75">Volatility 75 Index</option>
              <option value="R_100">Volatility 100 Index</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><Bot size={16} /> Estratégia</div>
            <select className="form-input" style={{ width: 150 }} value={config.strategy} onChange={(e) => updateConfig('strategy', e.target.value)} disabled={isRunning}>
              <option value="LOW">LOW</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><Settings size={16} /> Modo</div>
            <select className="form-input" style={{ width: 150 }} value={config.mode} onChange={(e) => updateConfig('mode', e.target.value)} disabled={isRunning}>
              <option value="veloz">Veloz</option>
              <option value="balanceado">Balanceado</option>
              <option value="preciso">Preciso</option>
              <option value="super_sniper">Super Sniper</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><AlertCircle size={16} /> Gerenc. Risco</div>
            <select className="form-input" style={{ width: 150 }} value={config.riskManagement} onChange={(e) => updateConfig('riskManagement', e.target.value)} disabled={isRunning}>
              <option value="hit_and_run">Hit and Run (2.7x)</option>
              <option value="conservador">Conservador</option>
              <option value="otimizado">Otimizado</option>
              <option value="agressivo">Agressivo</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: 20 }}>
          {isRunning ? (
            <button className="btn w-full" style={{ background: 'var(--color-critical)', color: 'white', justifyContent: 'center', padding: '16px' }} onClick={stopBot}>
              <Square size={20} fill="white" /> Parar IA
            </button>
          ) : (
            <button className="btn btn-primary w-full" style={{ justifyContent: 'center', padding: '16px' }} onClick={startBot} disabled={!authorized}>
              <Play size={20} fill="white" /> {authorized ? 'Iniciar IA' : 'Aguardando API...'}
            </button>
          )}
        </div>
      </div>

      {/* Right Panel: Data & Charts */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
        
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)' }}>
          {['Gráfico', 'Dígitos', 'Negociações', 'Registros'].map((tab) => (
            <button
              key={tab}
              style={{
                padding: '16px 24px', background: 'none', border: 'none', color: activeTab === tab.toLowerCase() ? 'var(--color-primary)' : 'var(--color-text-muted)',
                fontWeight: activeTab === tab.toLowerCase() ? 600 : 500,
                borderBottom: activeTab === tab.toLowerCase() ? '2px solid var(--color-primary)' : '2px solid transparent',
                cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase', fontSize: 13
              }}
              onClick={() => setActiveTab(tab.toLowerCase())}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {activeTab === 'negociacoes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Virtual Operations Toggle Simulation */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
                  Histórico de Operações
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                  <div style={{ display: 'flex', gap: 6 }}><span style={{ color: 'var(--color-text-muted)' }}>Wins:</span> <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>{stats.wins}</span></div>
                  <div style={{ display: 'flex', gap: 6 }}><span style={{ color: 'var(--color-text-muted)' }}>Losses:</span> <span style={{ color: 'var(--color-critical)', fontWeight: 600 }}>{stats.losses}</span></div>
                  <div style={{ display: 'flex', gap: 6 }}><span style={{ color: 'var(--color-text-muted)' }}>Win Rate:</span> <span style={{ fontWeight: 600 }}>{getWinRate()}%</span></div>
                </div>
              </div>

              {trades.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-muted)' }}>
                  <Bot size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
                  <p>Nenhuma negociação realizada ainda.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <AnimatePresence>
                    {trades.map((trade, i) => (
                      <motion.div
                        key={trade.id || i}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="card"
                        style={{ padding: 16, background: 'var(--color-bg-secondary)', display: 'flex', flexDirection: 'column', gap: 12 }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ padding: '2px 8px', background: 'var(--color-bg-tertiary)', borderRadius: 12, fontSize: 12 }}>Robot</span>
                            <span style={{ color: trade.won ? 'var(--color-success)' : 'var(--color-critical)', fontWeight: 600, fontSize: 14 }}>
                              {trade.won ? 'Ganho' : 'Perda'}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                            {new Date(trade.date).toLocaleTimeString()}
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 500 }}>
                            <Activity size={16} /> {getMarketName(trade.market || config.market)}
                          </div>
                          <div style={{ display: 'flex', gap: 12, fontWeight: 600 }}>
                            <span>${trade.amount.toFixed(2)}</span>
                            <span style={{ color: trade.won ? 'var(--color-success)' : 'var(--color-critical)' }}>
                              {trade.won ? '+' : ''}{trade.profit.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', gap: 16 }}>
                          <span>Entrada: {trade.entry}</span>
                          <span>Saída: {trade.exit}</span>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}

          {activeTab === 'digitos' && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 24 }}>Último dígito capturado</div>
              <div style={{ fontSize: 120, fontWeight: 800, lineHeight: 1, color: stats.lastDigit === 8 || stats.lastDigit === 9 ? 'var(--color-critical)' : 'var(--color-success)' }}>
                {stats.lastDigit !== null ? stats.lastDigit : '-'}
              </div>
              <div style={{ marginTop: 24, fontSize: 14, color: 'var(--color-text-muted)' }}>
                Loss Virtual Atual: <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{stats.virtualLossCount}</span> / {
                  config.mode === 'veloz' ? 1 : config.mode === 'balanceado' ? 2 : 3
                }
              </div>
            </div>
          )}

          {(activeTab === 'grafico' || activeTab === 'registros') && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-muted)' }}>
              Em desenvolvimento...
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
