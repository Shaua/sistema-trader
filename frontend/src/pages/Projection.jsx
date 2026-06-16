import React, { useState } from 'react'
import { TrendingUp, Calculator, BarChart2 } from 'lucide-react'
import { motion } from 'framer-motion'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, AreaChart
} from 'recharts'
import Header from '../components/layout/Header'
import { formatCurrency } from '../utils/formatters'
import { useStore } from '../store/useStore'

const PERIODS = [
  { label: '30 Dias', days: 30 },
  { label: '60 Dias', days: 60 },
  { label: '90 Dias', days: 90 },
  { label: '180 Dias', days: 180 },
  { label: '365 Dias', days: 365 },
]

function calculateProjection({ initialBalance, dailyGoalPct, tradingDaysPerMonth, winRate, payoff, totalDays }) {
  const results = []
  let balance = parseFloat(initialBalance)
  const totalTradingDays = Math.round((totalDays / 30) * tradingDaysPerMonth)
  const dailyReturn = (winRate / 100 * payoff - (1 - winRate / 100)) * (parseFloat(dailyGoalPct) / 100)

  for (let day = 0; day <= totalTradingDays; day++) {
    if (day % Math.ceil(totalTradingDays / 30) === 0 || day === totalTradingDays) {
      const calendarDay = Math.round((day / tradingDaysPerMonth) * 30)
      results.push({
        day: calendarDay,
        label: calendarDay === 0 ? 'Início' : `Dia ${calendarDay}`,
        balance: parseFloat(balance.toFixed(2)),
        profit: parseFloat((balance - parseFloat(initialBalance)).toFixed(2)),
        roi: parseFloat(((balance - parseFloat(initialBalance)) / parseFloat(initialBalance) * 100).toFixed(2))
      })
    }
    balance = balance * (1 + dailyReturn)
  }
  return results
}

export default function Projection() {
  const { bankConfig } = useStore()
  const currency = bankConfig?.currency || 'USD'

  const [params, setParams] = useState({
    initialBalance: bankConfig?.current_balance || bankConfig?.initial_balance || 1000,
    dailyGoalPct: bankConfig?.daily_goal_pct || 2,
    tradingDaysPerMonth: 20,
    winRate: 65,
    payoff: 0.85,
  })
  const [selectedPeriod, setSelectedPeriod] = useState(90)

  const handleChange = (e) => setParams(p => ({ ...p, [e.target.name]: e.target.value }))

  const projectionData = calculateProjection({ ...params, totalDays: selectedPeriod })
  const finalData = projectionData[projectionData.length - 1]

  const summaries = PERIODS.map(p => {
    const data = calculateProjection({ ...params, totalDays: p.days })
    const last = data[data.length - 1]
    return { ...p, finalBalance: last?.balance || 0, profit: last?.profit || 0, roi: last?.roi || 0 }
  })

  return (
    <div style={{ background: 'var(--color-bg-primary)', minHeight: '100vh' }}>
      <Header title="Projeção de Crescimento" subtitle="Simulador de crescimento composto da banca" />

      <div className="page-container">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20, alignItems: 'start' }}>

          {/* Parâmetros */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="card">
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calculator size={18} style={{ color: 'var(--color-accent-light)' }} />
              Parâmetros
            </div>

            {[
              { name: 'initialBalance', label: 'Saldo Inicial', type: 'number', step: '10', min: '0', placeholder: '1000' },
              { name: 'dailyGoalPct', label: 'Meta Diária (%)', type: 'number', step: '0.1', min: '0.1', max: '20', placeholder: '2' },
              { name: 'tradingDaysPerMonth', label: 'Dias Operados/Mês', type: 'number', step: '1', min: '1', max: '31', placeholder: '20' },
              { name: 'winRate', label: 'Taxa de Acerto (%)', type: 'number', step: '1', min: '1', max: '99', placeholder: '65' },
              { name: 'payoff', label: 'Payoff Médio (ex: 0.85 = 85%)', type: 'number', step: '0.01', min: '0.1', max: '10', placeholder: '0.85' },
            ].map(f => (
              <div key={f.name} className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">{f.label}</label>
                <input type={f.type} step={f.step} min={f.min} max={f.max} className="form-input" name={f.name} value={params[f.name]} onChange={handleChange} placeholder={f.placeholder} />
              </div>
            ))}

            {finalData && (
              <div style={{ marginTop: 16, padding: 14, background: 'var(--color-profit-bg)', borderRadius: 10, border: '1px solid var(--color-profit-border)' }}>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>Resultado em {selectedPeriod} dias:</div>
                <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-profit)' }}>
                  {formatCurrency(finalData.balance, currency)}
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-profit)', marginTop: 4 }}>
                  +{formatCurrency(finalData.profit, currency)} ({finalData.roi >= 0 ? '+' : ''}{finalData.roi}%)
                </div>
              </div>
            )}
          </motion.div>

          {/* Gráfico e tabela */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            {/* Seletor de período */}
            <div style={{ display: 'flex', gap: 8 }}>
              {PERIODS.map(p => (
                <button key={p.days} type="button"
                  className={`btn ${selectedPeriod === p.days ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                  onClick={() => setSelectedPeriod(p.days)}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Gráfico */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="chart-container">
              <div className="chart-title">Projeção de Crescimento — {selectedPeriod} dias</div>
              <div className="chart-subtitle">Crescimento composto baseado nos parâmetros configurados</div>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={projectionData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      return (
                        <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
                          <p style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{label}</p>
                          <p style={{ color: 'var(--color-profit)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                            {formatCurrency(payload[0]?.value, currency)}
                          </p>
                          <p style={{ color: 'var(--color-accent-light)', fontSize: 11 }}>ROI: +{payload[1]?.value}%</p>
                        </div>
                      )
                    }}
                  />
                  <Area type="monotone" dataKey="balance" name="Saldo" stroke="#10B981" fill="url(#projGrad)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="roi" name="ROI" stroke="transparent" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Tabela comparativa */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Período</th>
                    <th>Saldo Projetado</th>
                    <th>Lucro</th>
                    <th>ROI</th>
                    <th>Multiplicador</th>
                  </tr>
                </thead>
                <tbody>
                  {summaries.map((s, i) => (
                    <tr key={s.days} style={{ background: selectedPeriod === s.days ? 'rgba(59, 130, 246, 0.05)' : 'transparent' }}>
                      <td style={{ fontWeight: 600 }}>{s.label}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-profit)' }}>
                        {formatCurrency(s.finalBalance, currency)}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-profit)' }}>
                        +{formatCurrency(s.profit, currency)}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-profit)' }}>
                        +{s.roi.toFixed(1)}%
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>
                        {(s.finalBalance / parseFloat(params.initialBalance)).toFixed(2)}x
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
