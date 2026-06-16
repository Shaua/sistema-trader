import React, { useEffect, useState } from 'react'
import {
  DollarSign, TrendingUp, TrendingDown, Target, ArrowUpCircle,
  ArrowDownCircle, CheckCircle, XCircle, Percent, Activity,
  AlertTriangle, BarChart2, Calendar, Zap
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Legend, ReferenceLine
} from 'recharts'
import { motion } from 'framer-motion'
import Header from '../components/layout/Header'
import { KpiCard } from '../components/ui/Card'
import DashboardFilterBar from '../components/DashboardFilterBar'
import { useStore } from '../store/useStore'
import { formatCurrency, formatPercent, formatNumber, valueColor, generateDemoData } from '../utils/formatters'

// ============================================================
// Tooltip customizado para gráficos
// ============================================================
const CustomTooltip = ({ active, payload, label, currency = 'USD' }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
      borderRadius: 8, padding: '10px 14px', fontSize: 13
    }}>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 4, fontSize: 11 }}>{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
          {entry.name}: {typeof entry.value === 'number' && entry.value > 100 ? formatCurrency(entry.value, currency) : `${entry.value >= 0 ? '+' : ''}${formatNumber(entry.value)}`}
        </p>
      ))}
    </div>
  )
}

// ============================================================
// Alert de risco
// ============================================================
function RiskAlert({ alert }) {
  const classes = {
    critical: 'alert-critical',
    warning: 'alert-warning',
    success: 'alert-success',
    info: 'alert-info'
  }
  return (
    <div className={`alert ${classes[alert.severity] || 'alert-info'}`}>
      <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
      <span>{alert.message}</span>
    </div>
  )
}

// ============================================================
// Insight Card
// ============================================================
function InsightCard({ insight, index }) {
  const styles = {
    success: { bg: 'var(--color-profit-bg)', border: 'var(--color-profit-border)', color: 'var(--color-profit-light)' },
    warning: { bg: 'var(--color-warning-bg)', border: 'rgba(245,158,11,0.3)', color: 'var(--color-warning)' },
    danger: { bg: 'var(--color-loss-bg)', border: 'var(--color-loss-border)', color: 'var(--color-loss-light)' },
    info: { bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)', color: 'var(--color-accent-light)' },
  }
  const s = styles[insight.type] || styles.info

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      style={{
        background: s.bg, border: `1px solid ${s.border}`,
        borderRadius: 10, padding: '12px 14px', fontSize: 13,
        color: s.color, display: 'flex', gap: 10, alignItems: 'flex-start'
      }}
    >
      <Zap size={14} style={{ flexShrink: 0, marginTop: 2 }} />
      <span>{insight.message}</span>
    </motion.div>
  )
}

// ============================================================
// Dashboard Principal
// ============================================================
export default function Dashboard() {
  const { kpis, charts, alerts, insights, fetchDashboard, loading, bankConfig } = useStore()
  const [demoData, setDemoData] = useState(null)

  useEffect(() => {
    fetchDashboard()
    // Se não há configuração, usar dados de demo
    if (!kpis || !kpis.configured) {
      const demo = generateDemoData(1000, 45)
      setDemoData(demo)
    }
  }, [])

  // Usar dados reais ou demo
  const isDemo = !kpis?.configured
  const currency = bankConfig?.currency || kpis?.bankConfig?.currency || 'USD'

  // Dados de exemplo para visualização
  const demoKpis = {
    initialBalance: 1000,
    currentBalance: 1842.50,
    accumulatedProfit: 842.50,
    roi: 84.25,
    totalWithdrawn: 200,
    totalDeposited: 0,
    positiveDays: 28,
    negativeDays: 8,
    winRate: 65.4,
    totalOperations: 187,
    wins: 122,
    losses: 65,
    dailyGoalPct: 2,
    dailyGoalValue: 36.85,
    weeklyGoalValue: 184.25,
    monthlyGoalValue: 736.10,
    monthlyGoalProgress: 114.5,
    dailyGoalProgress: 72,
    todayProfit: 26.50,
    todayOperations: 7,
    currentDrawdown: 1.2,
    maxDrawdown: 8.3,
    maxWinStreak: 11,
    maxLossStreak: 4,
    payoff: 1.32,
    mathExpectancy: 8.45,
    profitFactor: 2.18,
    configured: true
  }

  const data = (kpis?.configured ? kpis : demoKpis)

  // Gerar gráfico de equity de demo
  const generateEquityCurve = () => {
    const result = []
    let balance = data.initialBalance
    const days = 45
    for (let i = 0; i <= days; i++) {
      const daily = (Math.random() - 0.35) * balance * 0.04
      balance = Math.max(balance + daily, balance * 0.8)
      const date = new Date()
      date.setDate(date.getDate() - (days - i))
      result.push({ date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), balance: parseFloat(balance.toFixed(2)) })
    }
    return result
  }

  const generateDailyProfits = () => {
    const result = []
    for (let i = 29; i >= 0; i--) {
      const profit = (Math.random() - 0.35) * 80
      const date = new Date()
      date.setDate(date.getDate() - i)
      result.push({
        date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        profit: parseFloat(profit.toFixed(2))
      })
    }
    return result
  }

  const equityCurve = charts?.equityCurve || generateEquityCurve()
  const dailyProfits = charts?.dailyProfit || generateDailyProfits()

  return (
    <div style={{ background: 'var(--color-bg-primary)', minHeight: '100vh' }}>
      <Header
        title="Dashboard"
        subtitle={isDemo ? '🎯 Modo demonstração — Configure sua banca para ver dados reais' : `Banca ${bankConfig?.account_type === 'demo' ? 'Demo' : 'Real'} · ${bankConfig?.broker || 'Deriv'}`}
        onRefresh={fetchDashboard}
        loading={loading}
      />

      <div className="page-container">
        
        <DashboardFilterBar />

        {/* Alertas de risco */}
        {alerts?.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {alerts.map((alert, i) => <RiskAlert key={i} alert={alert} />)}
          </div>
        )}

        {/* KPIs Row 1 — Saldo & Lucro */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="kpi-grid"
          style={{ marginBottom: 20 }}
        >
          <KpiCard
            icon={DollarSign}
            label="Saldo Atual"
            value={formatCurrency(data.currentBalance, currency)}
            subValue={`Inicial: ${formatCurrency(data.initialBalance, currency)}`}
            colorClass="accent"
          />
          <KpiCard
            icon={TrendingUp}
            label="Lucro Acumulado"
            value={formatCurrency(data.accumulatedProfit, currency)}
            subValue={`ROI: ${formatPercent(data.roi)}`}
            colorClass={data.accumulatedProfit >= 0 ? 'profit' : 'loss'}
            trend={data.accumulatedProfit >= 0 ? 'up' : 'down'}
          />
          <KpiCard
            icon={Target}
            label="Meta Mensal"
            value={formatCurrency(data.monthlyGoalValue, currency)}
            subValue={`Progresso: ${formatPercent(data.monthlyGoalProgress)}`}
            colorClass="accent"
            progress={Math.min(data.monthlyGoalProgress, 100)}
            progressColor={data.monthlyGoalProgress >= 100 ? 'profit' : data.monthlyGoalProgress >= 60 ? 'accent' : 'warning'}
          />
          <KpiCard
            icon={Activity}
            label="Hoje"
            value={formatCurrency(data.todayProfit, currency)}
            subValue={`${data.todayOperations} operações · Meta: ${formatCurrency(data.dailyGoalValue, currency)}`}
            colorClass={data.todayProfit >= 0 ? 'profit' : 'loss'}
            progress={Math.min(data.dailyGoalProgress, 100)}
            progressColor={data.dailyGoalProgress >= 100 ? 'profit' : 'accent'}
          />
          <KpiCard
            icon={Percent}
            label="Win Rate"
            value={`${formatNumber(data.winRate)}%`}
            subValue={`${data.wins} WIN · ${data.losses} LOSS`}
            colorClass={data.winRate >= 60 ? 'profit' : data.winRate >= 50 ? 'accent' : 'loss'}
          />
          <KpiCard
            icon={ArrowUpCircle}
            label="Total Sacado"
            value={formatCurrency(data.totalWithdrawn, currency)}
            colorClass="purple"
          />
          <KpiCard
            icon={CheckCircle}
            label="Dias Positivos"
            value={data.positiveDays}
            subValue={`${data.negativeDays} negativos`}
            colorClass="profit"
          />
          <KpiCard
            icon={AlertTriangle}
            label="Drawdown Máx"
            value={`${formatNumber(data.maxDrawdown)}%`}
            subValue={`Atual: ${formatNumber(data.currentDrawdown)}%`}
            colorClass={data.maxDrawdown > 15 ? 'loss' : data.maxDrawdown > 8 ? 'warning' : 'accent'}
          />
          <KpiCard
            icon={BarChart2}
            label="Profit Factor"
            value={formatNumber(data.profitFactor, 2)}
            subValue={`Payoff: ${formatNumber(data.payoff, 2)}`}
            colorClass={data.profitFactor >= 1.5 ? 'profit' : data.profitFactor >= 1 ? 'accent' : 'loss'}
          />
          <KpiCard
            icon={Zap}
            label="Expect. Matemática"
            value={`$${formatNumber(data.mathExpectancy, 2)}`}
            colorClass={data.mathExpectancy >= 0 ? 'profit' : 'loss'}
          />
          <KpiCard
            icon={TrendingUp}
            label="Maior Seq. WIN"
            value={`${data.maxWinStreak}x`}
            subValue={`Maior LOSS: ${data.maxLossStreak}x`}
            colorClass="profit"
          />
          <KpiCard
            icon={ArrowDownCircle}
            label="Total Depositado"
            value={formatCurrency(data.totalDeposited, currency)}
            colorClass="accent"
          />
        </motion.div>

        {/* Gráficos Row 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>
          
          {/* Curva de Patrimônio */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="chart-container"
          >
            <div className="chart-title">Curva de Patrimônio</div>
            <div className="chart-subtitle">Evolução do saldo ao longo do tempo</div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={equityCurve} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(1)}k`} />
                <Tooltip content={<CustomTooltip currency={currency} />} />
                <Area type="monotone" dataKey="balance" name="Saldo" stroke="#3B82F6" fill="url(#balanceGradient)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Metas & Progresso */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="card"
          >
            <div className="chart-title">Metas & Progresso</div>
            <div className="chart-subtitle">Status das suas metas</div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Meta Diária */}
              <div>
                <div className="flex justify-between mb-1">
                  <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Meta Diária ({data.dailyGoalPct}%)</span>
                  <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)', color: data.dailyGoalProgress >= 100 ? 'var(--color-profit)' : 'var(--color-text-primary)' }}>
                    {formatPercent(data.dailyGoalProgress)}
                  </span>
                </div>
                <div className="progress-bar">
                  <div className={`progress-fill ${data.dailyGoalProgress >= 100 ? 'profit' : 'accent'}`}
                       style={{ width: `${Math.min(data.dailyGoalProgress, 100)}%` }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 3 }}>
                  {formatCurrency(data.todayProfit, currency)} / {formatCurrency(data.dailyGoalValue, currency)}
                </div>
              </div>

              {/* Meta Semanal */}
              <div>
                <div className="flex justify-between mb-1">
                  <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Meta Semanal</span>
                  <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                    {formatCurrency(data.weeklyGoalValue, currency)}
                  </span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill accent" style={{ width: '55%' }} />
                </div>
              </div>

              {/* Meta Mensal */}
              <div>
                <div className="flex justify-between mb-1">
                  <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Meta Mensal</span>
                  <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)', color: data.monthlyGoalProgress >= 100 ? 'var(--color-profit)' : 'inherit' }}>
                    {formatPercent(data.monthlyGoalProgress)}
                  </span>
                </div>
                <div className="progress-bar">
                  <div className={`progress-fill ${data.monthlyGoalProgress >= 100 ? 'profit' : data.monthlyGoalProgress >= 60 ? 'accent' : 'warning'}`}
                       style={{ width: `${Math.min(data.monthlyGoalProgress, 100)}%` }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 3 }}>
                  Meta: {formatCurrency(data.monthlyGoalValue, currency)}
                </div>
              </div>

              <div className="divider" />

              {/* Drawdown */}
              <div>
                <div className="flex justify-between mb-1">
                  <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Drawdown Atual</span>
                  <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)', color: data.currentDrawdown > 10 ? 'var(--color-loss)' : 'var(--color-text-primary)' }}>
                    {formatPercent(data.currentDrawdown)}
                  </span>
                </div>
                <div style={{ position: 'relative', height: 6, borderRadius: 99, background: 'linear-gradient(90deg, var(--color-profit), var(--color-warning), var(--color-loss))', marginBottom: 3 }}>
                  <div style={{
                    position: 'absolute',
                    left: `${Math.min(data.currentDrawdown * 5, 95)}%`,
                    top: '50%', transform: 'translate(-50%, -50%)',
                    width: 14, height: 14, borderRadius: '50%',
                    background: 'white', border: '2px solid var(--color-bg-primary)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.4)'
                  }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Máx: {formatPercent(data.maxDrawdown)}</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Lucro Diário + Insights */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>
          
          {/* Lucro Diário */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="chart-container"
          >
            <div className="chart-title">Resultado Diário</div>
            <div className="chart-subtitle">Lucro/Perda por dia nos últimos 30 dias</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyProfits} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="var(--color-border-light)" strokeWidth={1} />
                <Bar dataKey="profit" name="Resultado" radius={[3, 3, 0, 0]}
                     fill="#10B981"
                     label={false}
                >
                  {dailyProfits.map((entry, index) => (
                    <rect key={index} fill={entry.profit >= 0 ? '#10B981' : '#EF4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Inteligência Operacional */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="card"
          >
            <div className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={16} style={{ color: 'var(--color-accent-light)' }} />
              Insights
            </div>
            <div className="chart-subtitle">Inteligência operacional automática</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(insights?.length > 0 ? insights : [
                { type: 'success', message: '🌟 Seu win rate de 65% está acima da média! Continue assim.' },
                { type: 'info', message: '📊 Você tem 11 wins consecutivos — seu melhor streak!' },
                { type: 'warning', message: '⚡ Atenção: Não opere após atingir sua meta diária.' }
              ]).slice(0, 5).map((insight, i) => (
                <InsightCard key={i} insight={insight} index={i} />
              ))}
            </div>
          </motion.div>
        </div>

        {/* Stats finais */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card">
            <div className="chart-title">Estatísticas de Risco</div>
            <div className="divider" style={{ marginTop: 12 }} />
            <div className="stat-row"><span className="stat-row-label">Risk/Op</span><span className="stat-row-value text-accent">2%</span></div>
            <div className="stat-row"><span className="stat-row-label">Stop Loss Diário</span><span className="stat-row-value text-loss">5%</span></div>
            <div className="stat-row"><span className="stat-row-label">Stop Gain Diário</span><span className="stat-row-value text-profit">10%</span></div>
            <div className="stat-row"><span className="stat-row-label">Stop Loss Mensal</span><span className="stat-row-value text-loss">20%</span></div>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="card">
            <div className="chart-title">Performance</div>
            <div className="divider" style={{ marginTop: 12 }} />
            <div className="stat-row"><span className="stat-row-label">Total Operações</span><span className="stat-row-value">{data.totalOperations}</span></div>
            <div className="stat-row"><span className="stat-row-label">Média de Ganho</span><span className="stat-row-value text-profit">{formatCurrency(data.avgWin || 15.4, currency)}</span></div>
            <div className="stat-row"><span className="stat-row-label">Média de Perda</span><span className="stat-row-value text-loss">{formatCurrency(-(data.avgLoss || 11.7), currency)}</span></div>
            <div className="stat-row"><span className="stat-row-label">Expect. Matemática</span><span className="stat-row-value text-profit">${formatNumber(data.mathExpectancy, 2)}</span></div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="card">
            <div className="chart-title">Saques & Depósitos</div>
            <div className="divider" style={{ marginTop: 12 }} />
            <div className="stat-row"><span className="stat-row-label">Total Sacado</span><span className="stat-row-value text-profit">{formatCurrency(data.totalWithdrawn, currency)}</span></div>
            <div className="stat-row"><span className="stat-row-label">Total Depositado</span><span className="stat-row-value">{formatCurrency(data.totalDeposited, currency)}</span></div>
            <div className="stat-row">
              <span className="stat-row-label">Resultado Líquido</span>
              <span className={`stat-row-value ${valueColor(data.accumulatedProfit + data.totalWithdrawn - data.totalDeposited)}`}>
                {formatCurrency(data.accumulatedProfit + data.totalWithdrawn - data.totalDeposited, currency)}
              </span>
            </div>
            <div className="stat-row"><span className="stat-row-label">ROI Total</span><span className={`stat-row-value ${valueColor(data.roi)}`}>{formatPercent(data.roi)}</span></div>
          </motion.div>
        </div>

        {isDemo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{
              marginTop: 24, padding: '16px 20px',
              background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: 12, fontSize: 14, color: 'var(--color-accent-light)',
              display: 'flex', alignItems: 'center', gap: 12
            }}
          >
            <Zap size={18} style={{ flexShrink: 0 }} />
            <span>
              <strong>Modo Demonstração:</strong> Estes são dados fictícios para visualização.{' '}
              <a href="/bank-config" style={{ color: 'inherit', textDecoration: 'underline' }}>Configure sua banca</a>{' '}
              para ver seus dados reais.
            </span>
          </motion.div>
        )}
      </div>
    </div>
  )
}
