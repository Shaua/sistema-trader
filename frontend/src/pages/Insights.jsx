import React, { useState } from 'react'
import { Zap, Brain, AlertTriangle, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Header from '../components/layout/Header'
import { useStore } from '../store/useStore'
import api from '../lib/api'
import toast from 'react-hot-toast'

const DEMO_INSIGHTS = [
  { type: 'success', message: '🌟 Seu win rate de 65% está acima da média histórica! Continue com a estratégia atual.' },
  { type: 'success', message: '🏆 Você está em uma sequência de 5 wins consecutivos. Excelente consistência!' },
  { type: 'info', message: '📊 Seus melhores resultados ocorrem entre 9h e 11h. Concentre suas operações neste período.' },
  { type: 'warning', message: '⚡ Você tem operado mais que 8 vezes por dia nos últimos 3 dias. Monitore o overtrading.' },
  { type: 'info', message: '📈 Seu profit factor de 2.18 é excelente. Você ganha mais do que perde proporcionalmente.' },
  { type: 'success', message: '💰 Seu lucro está 14.5% acima da meta mensal! Considere encerrar e preservar o ganho.' },
]

const STYLE_MAP = {
  success: { bg: 'var(--color-profit-bg)', border: 'var(--color-profit-border)', color: 'var(--color-profit-light)', icon: TrendingUp },
  warning: { bg: 'var(--color-warning-bg)', border: 'rgba(245,158,11,0.3)', color: 'var(--color-warning)', icon: AlertTriangle },
  danger: { bg: 'var(--color-loss-bg)', border: 'var(--color-loss-border)', color: 'var(--color-loss-light)', icon: TrendingDown },
  info: { bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)', color: 'var(--color-accent-light)', icon: Zap },
}

export default function Insights() {
  const { insights, fetchDashboard } = useStore()
  const [loading, setLoading] = useState(false)

  const displayInsights = insights?.length > 0 ? insights : DEMO_INSIGHTS

  const refresh = async () => {
    setLoading(true)
    await fetchDashboard()
    setLoading(false)
    toast.success('Insights atualizados!')
  }

  return (
    <div style={{ background: 'var(--color-bg-primary)', minHeight: '100vh' }}>
      <Header title="Inteligência Operacional" subtitle="Análise automática do seu comportamento de trading" onRefresh={refresh} loading={loading} />
      
      <div className="page-container">
        
        {/* Header card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="card card-gradient-accent" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Brain size={28} style={{ color: 'var(--color-accent-light)' }} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Motor de Análise Ativo</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
              Analisando padrões de comportamento, gestão de risco e consistência operacional...
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }} onClick={refresh} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </motion.div>

        {/* Insights */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <AnimatePresence>
            {displayInsights.map((insight, i) => {
              const s = STYLE_MAP[insight.type] || STYLE_MAP.info
              const Icon = s.icon
              return (
                <motion.div key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: i * 0.08 }}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 14,
                    padding: '16px 18px', borderRadius: 12,
                    background: s.bg, border: `1px solid ${s.border}`,
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: `${s.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={18} style={{ color: s.color }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, color: s.color, lineHeight: 1.6 }}>{insight.message}</div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        {/* Dicas gerais */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="card" style={{ marginTop: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Regras de Ouro do Trading</div>
          {[
            '✅ Nunca opere após atingir seu stop loss diário.',
            '✅ Encerre quando atingir sua meta diária — preservar é parte do lucro.',
            '✅ Não faça overtrading: qualidade > quantidade.',
            '✅ Mantenha um diário emocional — rastrear o estado mental é essencial.',
            '✅ Consistência > Ganhos isolados. Foque no processo, não no resultado.',
            '✅ Nunca aumente o lote após perdas (Martingale destrói bancas).',
          ].map((tip, i) => (
            <div key={i} style={{ padding: '10px 0', borderBottom: i < 5 ? '1px solid var(--color-border)' : 'none', fontSize: 14, color: 'var(--color-text-secondary)' }}>
              {tip}
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
