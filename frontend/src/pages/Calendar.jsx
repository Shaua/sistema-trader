import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Header from '../components/layout/Header'
import { formatCurrency, formatDate, MONTHS } from '../utils/formatters'
import { useStore } from '../store/useStore'
import api from '../lib/api'

// Dados de demo
const DEMO_DAILY = {
  '2026-06-16': { net_result: 26.50, total_operations: 7, wins: 5, losses: 2 },
  '2026-06-15': { net_result: 42.25, total_operations: 6, wins: 5, losses: 1 },
  '2026-06-14': { net_result: -20.00, total_operations: 8, wins: 3, losses: 5 },
  '2026-06-13': { net_result: 15.30, total_operations: 5, wins: 4, losses: 1 },
  '2026-06-12': { net_result: -8.50, total_operations: 4, wins: 1, losses: 3 },
  '2026-06-11': { net_result: 38.75, total_operations: 9, wins: 7, losses: 2 },
  '2026-06-10': { net_result: 22.00, total_operations: 6, wins: 5, losses: 1 },
  '2026-06-09': { net_result: 0, total_operations: 0, wins: 0, losses: 0 },
  '2026-06-08': { net_result: 0, total_operations: 0, wins: 0, losses: 0 },
  '2026-06-07': { net_result: -35.00, total_operations: 10, wins: 3, losses: 7 },
  '2026-06-06': { net_result: 18.50, total_operations: 6, wins: 5, losses: 1 },
  '2026-06-05': { net_result: 45.20, total_operations: 8, wins: 7, losses: 1 },
  '2026-06-04': { net_result: 12.75, total_operations: 5, wins: 4, losses: 1 },
  '2026-06-03': { net_result: -15.00, total_operations: 7, wins: 2, losses: 5 },
}

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default function CalendarView() {
  const { bankConfig } = useStore()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [dailyData, setDailyData] = useState(DEMO_DAILY)
  const [selectedDay, setSelectedDay] = useState(null)
  const [dayOps, setDayOps] = useState([])

  const currency = bankConfig?.currency || 'USD'

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  const getDateStr = (day) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  const getDayStatus = (day) => {
    const dateStr = getDateStr(day)
    const data = dailyData[dateStr]
    if (!data || data.total_operations === 0) return 'no-ops'
    if (data.net_result > 0) return 'positive'
    if (data.net_result < 0) return 'negative'
    return 'no-ops'
  }

  const handleDayClick = async (day) => {
    const dateStr = getDateStr(day)
    const data = dailyData[dateStr]
    if (!data || data.total_operations === 0) return
    
    setSelectedDay({ day, dateStr, ...data })
    
    try {
      const res = await api.get('/operations', { params: { date: dateStr } })
      setDayOps(res.data.data || [])
    } catch {
      setDayOps([])
    }
  }

  // Estatísticas do mês
  const monthData = Object.entries(dailyData).filter(([date]) => date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`))
  const monthProfit = monthData.reduce((s, [, d]) => s + (d.net_result || 0), 0)
  const positiveDays = monthData.filter(([, d]) => d.net_result > 0).length
  const negativeDays = monthData.filter(([, d]) => d.net_result < 0).length

  return (
    <div style={{ background: 'var(--color-bg-primary)', minHeight: '100vh' }}>
      <Header title="Calendário Operacional" subtitle="Visualize seu desempenho diário no mês" />

      <div className="page-container">
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, alignItems: 'start' }}>
          
          {/* Calendário */}
          <div className="card">
            {/* Header do mês */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <button className="btn btn-ghost btn-icon" onClick={prevMonth}><ChevronLeft size={20} /></button>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{MONTHS[month]} {year}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  {positiveDays} dias positivos · {negativeDays} dias negativos
                </div>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={nextMonth}><ChevronRight size={20} /></button>
            </div>

            {/* Dias da semana */}
            <div className="calendar-grid" style={{ marginBottom: 8 }}>
              {DAY_NAMES.map(d => (
                <div key={d} className="calendar-day-header">{d}</div>
              ))}
            </div>

            {/* Grid dos dias */}
            <div className="calendar-grid">
              {/* Células vazias */}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="calendar-day empty" />
              ))}
              
              {/* Dias do mês */}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const dateStr = getDateStr(day)
                const data = dailyData[dateStr]
                const status = getDayStatus(day)
                const today = new Date().toISOString().split('T')[0]
                const isToday = dateStr === today

                return (
                  <motion.div
                    key={day}
                    className={`calendar-day ${status} ${isToday ? 'today' : ''}`}
                    whileHover={status !== 'no-ops' ? { scale: 1.08 } : {}}
                    onClick={() => handleDayClick(day)}
                    style={{ cursor: data?.total_operations > 0 ? 'pointer' : 'default' }}
                  >
                    <div className="calendar-day-num">{day}</div>
                    {data && data.total_operations > 0 && (
                      <>
                        <div className="calendar-day-profit" style={{ fontSize: 9 }}>
                          {data.net_result >= 0 ? '+' : ''}{formatCurrency(data.net_result, currency, true)}
                        </div>
                        <div style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>{data.total_operations} ops</div>
                      </>
                    )}
                  </motion.div>
                )
              })}
            </div>

            {/* Legenda */}
            <div style={{ display: 'flex', gap: 16, marginTop: 20, justifyContent: 'center' }}>
              {[
                { color: 'var(--color-profit-bg)', border: 'var(--color-profit-border)', label: 'Positivo' },
                { color: 'var(--color-loss-bg)', border: 'var(--color-loss-border)', label: 'Negativo' },
                { color: 'var(--color-bg-secondary)', border: 'var(--color-border)', label: 'Sem operação' },
              ].map(({ color, border, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-muted)' }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: color, border: `1px solid ${border}` }} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Painel lateral */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Resumo do mês */}
            <div className="card">
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Resumo de {MONTHS[month]}</div>
              <div className="stat-row">
                <span className="stat-row-label">Resultado Líquido</span>
                <span className={`stat-row-value ${monthProfit >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {monthProfit >= 0 ? '+' : ''}{formatCurrency(monthProfit, currency)}
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-row-label">Dias Positivos</span>
                <span className="stat-row-value text-profit">{positiveDays}</span>
              </div>
              <div className="stat-row">
                <span className="stat-row-label">Dias Negativos</span>
                <span className="stat-row-value text-loss">{negativeDays}</span>
              </div>
              <div className="stat-row">
                <span className="stat-row-label">Taxa de Dias Pos.</span>
                <span className="stat-row-value">
                  {positiveDays + negativeDays > 0 ? ((positiveDays / (positiveDays + negativeDays)) * 100).toFixed(0) : 0}%
                </span>
              </div>
            </div>

            {/* Detalhe do dia selecionado */}
            <AnimatePresence>
              {selectedDay && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className={`card ${selectedDay.net_result >= 0 ? 'card-gradient-profit' : 'card-gradient-loss'}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{formatDate(selectedDay.dateStr)}</div>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSelectedDay(null)}><X size={14} /></button>
                  </div>
                  <div className="stat-row">
                    <span className="stat-row-label">Resultado</span>
                    <span className={`stat-row-value ${selectedDay.net_result >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {selectedDay.net_result >= 0 ? '+' : ''}{formatCurrency(selectedDay.net_result, currency)}
                    </span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-row-label">Operações</span>
                    <span className="stat-row-value">{selectedDay.total_operations}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-row-label">WIN / LOSS</span>
                    <span className="stat-row-value">
                      <span style={{ color: 'var(--color-profit)' }}>{selectedDay.wins}</span>
                      {' / '}
                      <span style={{ color: 'var(--color-loss)' }}>{selectedDay.losses}</span>
                    </span>
                  </div>
                  {dayOps.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>Operações:</div>
                      {dayOps.slice(0, 5).map((op, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--color-border)' }}>
                          <span>{op.asset} · {op.operation_type}</span>
                          <span className={op.result === 'WIN' ? 'text-profit' : 'text-loss'}>{op.result}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
