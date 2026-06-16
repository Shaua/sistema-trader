import React from 'react'
import { BarChart2, TrendingUp, TrendingDown, Award, Zap } from 'lucide-react'
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip, Legend
} from 'recharts'
import { motion } from 'framer-motion'
import Header from '../components/layout/Header'
import { StatRow } from '../components/ui/Card'
import { useStore } from '../store/useStore'
import { formatCurrency, formatPercent, formatNumber } from '../utils/formatters'

const DEMO_STATS = {
  winRate: 65.4,
  payoff: 1.32,
  mathExpectancy: 8.45,
  profitFactor: 2.18,
  roiGeneral: 84.25,
  roiMonthly: 12.5,
  roiWeekly: 3.1,
  roiDaily: 0.8,
  maxDrawdown: 8.3,
  currentDrawdown: 1.2,
  bestDay: 84.50,
  worstDay: -45.00,
  bestWeek: 210.75,
  worstWeek: -67.50,
  bestMonth: 380.20,
  worstMonth: -95.40,
  maxWinStreak: 11,
  maxLossStreak: 4,
  totalOperations: 187,
  avgWin: 15.40,
  avgLoss: -11.67
}

export default function Statistics() {
  const { kpis, bankConfig } = useStore()
  const currency = bankConfig?.currency || 'USD'
  const stats = kpis?.configured ? kpis : DEMO_STATS

  const radarData = [
    { metric: 'Win Rate', value: Math.min((stats.winRate / 80) * 100, 100) },
    { metric: 'Payoff', value: Math.min((stats.payoff / 2) * 100, 100) },
    { metric: 'Consist.', value: Math.min(stats.profitFactor * 40, 100) },
    { metric: 'Capital', value: Math.max(100 - stats.maxDrawdown * 3, 10) },
    { metric: 'ROI', value: Math.min(stats.roiGeneral / 1.5, 100) },
  ]

  const pieData = [
    { name: 'WIN', value: Math.round(stats.totalOperations * stats.winRate / 100), color: '#10B981' },
    { name: 'LOSS', value: Math.round(stats.totalOperations * (1 - stats.winRate / 100)), color: '#EF4444' },
  ]

  return (
    <div style={{ background: 'var(--color-bg-primary)', minHeight: '100vh' }}>
      <Header title="Estatísticas Avançadas" subtitle="Análise completa do seu desempenho operacional" />
      
      <div className="page-container">
        
        {/* KPIs Principais */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { icon: BarChart2, label: 'Win Rate', value: `${formatNumber(stats.winRate)}%`, color: stats.winRate >= 60 ? 'var(--color-profit)' : 'var(--color-loss)' },
            { icon: TrendingUp, label: 'Profit Factor', value: formatNumber(stats.profitFactor), color: stats.profitFactor >= 1.5 ? 'var(--color-profit)' : 'var(--color-accent-light)' },
            { icon: Zap, label: 'Expect. Matemática', value: `$${formatNumber(stats.mathExpectancy)}`, color: stats.mathExpectancy >= 0 ? 'var(--color-profit)' : 'var(--color-loss)' },
            { icon: TrendingUp, label: 'Payoff Médio', value: formatNumber(stats.payoff), color: 'var(--color-accent-light)' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="card" style={{ textAlign: 'center' }}>
              <s.icon size={20} style={{ color: s.color, margin: '0 auto 8px' }} />
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-mono)', color: s.color }}>{s.value}</div>
            </motion.div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>

          {/* ROI por período */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>ROI por Período</div>
            <StatRow label="ROI Geral" value={formatPercent(stats.roiGeneral)} valueClass={stats.roiGeneral >= 0 ? 'text-profit' : 'text-loss'} />
            <StatRow label="ROI Mensal" value={formatPercent(stats.roiMonthly)} valueClass={stats.roiMonthly >= 0 ? 'text-profit' : 'text-loss'} />
            <StatRow label="ROI Semanal" value={formatPercent(stats.roiWeekly)} valueClass={stats.roiWeekly >= 0 ? 'text-profit' : 'text-loss'} />
            <StatRow label="ROI Médio Diário" value={formatPercent(stats.roiDaily)} valueClass="text-profit" />
          </motion.div>

          {/* Melhores e Piores */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card">
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Melhores & Piores</div>
            <StatRow label="Melhor Dia" value={`+${formatCurrency(stats.bestDay, currency)}`} valueClass="text-profit" />
            <StatRow label="Pior Dia" value={formatCurrency(stats.worstDay, currency)} valueClass="text-loss" />
            <StatRow label="Melhor Semana" value={`+${formatCurrency(stats.bestWeek, currency)}`} valueClass="text-profit" />
            <StatRow label="Pior Semana" value={formatCurrency(stats.worstWeek, currency)} valueClass="text-loss" />
            <StatRow label="Melhor Mês" value={`+${formatCurrency(stats.bestMonth, currency)}`} valueClass="text-profit" />
            <StatRow label="Pior Mês" value={formatCurrency(stats.worstMonth, currency)} valueClass="text-loss" />
          </motion.div>

          {/* Sequências & Médias */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card">
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Sequências & Médias</div>
            <StatRow label="Maior Seq. WIN" value={`${stats.maxWinStreak}x`} valueClass="text-profit" />
            <StatRow label="Maior Seq. LOSS" value={`${stats.maxLossStreak}x`} valueClass="text-loss" />
            <StatRow label="Média de Ganho" value={formatCurrency(stats.avgWin, currency)} valueClass="text-profit" />
            <StatRow label="Média de Perda" value={formatCurrency(stats.avgLoss, currency)} valueClass="text-loss" />
            <StatRow label="Drawdown Máx." value={formatPercent(stats.maxDrawdown)} valueClass={stats.maxDrawdown > 15 ? 'text-loss' : 'text-accent'} />
            <StatRow label="Total Operações" value={stats.totalOperations} />
          </motion.div>
        </div>

        {/* Gráficos */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          
          {/* Radar */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="chart-container">
            <div className="chart-title">Score de Performance</div>
            <div className="chart-subtitle">Análise multidimensional do seu trading</div>
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--color-border)" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
                <Radar name="Score" dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* WIN x LOSS */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="chart-container">
            <div className="chart-title">Distribuição WIN / LOSS</div>
            <div className="chart-subtitle">{stats.totalOperations} operações totais</div>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} strokeWidth={0} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [`${v} ops (${((v / stats.totalOperations) * 100).toFixed(1)}%)`, n]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
