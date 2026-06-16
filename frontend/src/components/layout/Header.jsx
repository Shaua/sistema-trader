import React from 'react'
import { Menu, Bell, RefreshCw } from 'lucide-react'
import { useStore } from '../../store/useStore'

export default function Header({ title, subtitle, onRefresh, loading }) {
  const { toggleSidebar, alerts } = useStore()
  const criticalAlerts = (alerts || []).filter(a => a.severity === 'critical').length

  return (
    <header className="page-header">
      <div className="flex items-center gap-3">
        <button className="btn btn-ghost btn-icon" onClick={toggleSidebar}>
          <Menu size={20} />
        </button>
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onRefresh && (
          <button
            className="btn btn-ghost btn-icon"
            onClick={onRefresh}
            disabled={loading}
            title="Atualizar"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        )}
        
        <button className="btn btn-ghost btn-icon" style={{ position: 'relative' }} title="Alertas">
          <Bell size={18} />
          {criticalAlerts > 0 && (
            <span style={{
              position: 'absolute', top: 6, right: 6,
              width: 8, height: 8,
              background: 'var(--color-loss)',
              borderRadius: '50%',
              border: '2px solid var(--color-bg-primary)'
            }} />
          )}
        </button>
      </div>
    </header>
  )
}
