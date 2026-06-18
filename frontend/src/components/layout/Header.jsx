import React from 'react'
import { Menu, Bell, RefreshCw, Activity, ShieldAlert } from 'lucide-react'
import { useStore } from '../../store/useStore'

export default function Header({ title, subtitle, onRefresh, loading }) {
  const { toggleSidebar, alerts, activeAccountType, setActiveAccountType } = useStore()
  const criticalAlerts = (alerts || []).filter(a => a.severity === 'critical').length

  const handleToggleAccount = () => {
    setActiveAccountType(activeAccountType === 'REAL' ? 'DEMO' : 'REAL')
  }

  return (
    <>
      {activeAccountType === 'DEMO' && (
        <div style={{
          background: '#ff9800',
          color: '#fff',
          padding: '6px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          fontSize: 13,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: 1
        }}>
          <ShieldAlert size={16} /> Você está operando na Conta de Treinamento (Demo)
        </div>
      )}
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

        <div className="flex items-center gap-4">
          
          <div 
            style={{ 
              display: 'flex', alignItems: 'center', gap: 6, 
              background: 'var(--color-bg-secondary)', 
              padding: '4px', borderRadius: 20, 
              border: '1px solid var(--color-border)'
            }}
          >
            <button
              onClick={() => setActiveAccountType('REAL')}
              style={{
                padding: '4px 12px', borderRadius: 16, fontSize: 12, fontWeight: 600,
                background: activeAccountType === 'REAL' ? 'var(--color-success)' : 'transparent',
                color: activeAccountType === 'REAL' ? '#fff' : 'var(--color-text-muted)',
                transition: 'all 0.2s', border: 'none', cursor: 'pointer'
              }}
            >
              REAL
            </button>
            <button
              onClick={() => setActiveAccountType('DEMO')}
              style={{
                padding: '4px 12px', borderRadius: 16, fontSize: 12, fontWeight: 600,
                background: activeAccountType === 'DEMO' ? '#ff9800' : 'transparent',
                color: activeAccountType === 'DEMO' ? '#fff' : 'var(--color-text-muted)',
                transition: 'all 0.2s', border: 'none', cursor: 'pointer'
              }}
            >
              DEMO
            </button>
          </div>

          <div style={{ width: 1, height: 24, background: 'var(--color-border)' }} />

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
    </>
  )
}
