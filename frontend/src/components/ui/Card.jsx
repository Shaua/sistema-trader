import React from 'react'

/**
 * KPI Card — Exibe um indicador principal do dashboard
 */
export function KpiCard({ icon: Icon, label, value, subValue, colorClass = 'accent', trend, progress, progressColor = 'accent' }) {
  return (
    <div className={`kpi-card ${colorClass === 'profit' ? 'profit' : colorClass === 'loss' ? 'loss' : ''}`}>
      <div className={`kpi-icon ${colorClass}`}>
        <Icon size={18} />
      </div>
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value ${colorClass}`}>{value}</div>
      {subValue && (
        <div className={`kpi-change ${trend === 'up' ? 'up' : trend === 'down' ? 'down' : ''}`}>
          {subValue}
        </div>
      )}
      {progress !== undefined && (
        <div className="progress-bar" style={{ marginTop: 10 }}>
          <div
            className={`progress-fill ${progressColor}`}
            style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}

/**
 * Card base reutilizável
 */
export function Card({ children, className = '', style = {}, gradient }) {
  return (
    <div className={`card ${gradient || ''} ${className}`} style={style}>
      {children}
    </div>
  )
}

/**
 * Linha de estatística (label + value)
 */
export function StatRow({ label, value, valueClass = '' }) {
  return (
    <div className="stat-row">
      <span className="stat-row-label">{label}</span>
      <span className={`stat-row-value ${valueClass}`}>{value}</span>
    </div>
  )
}
