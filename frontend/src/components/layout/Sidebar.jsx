import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Settings, Shield, BookOpen, Calendar,
  ArrowUpCircle, ArrowDownCircle, BarChart2, TrendingUp,
  FileText, Users, Brain, ChevronLeft, X, LogOut,
  Zap
} from 'lucide-react'
import { useStore } from '../../store/useStore'

const navItems = [
  {
    section: 'Principal',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
      { icon: Brain, label: 'Inteligência', path: '/insights' },
    ]
  },
  {
    section: 'Operações',
    items: [
      { icon: BookOpen, label: 'Diário Operacional', path: '/operations' },
      { icon: Calendar, label: 'Calendário', path: '/calendar' },
    ]
  },
  {
    section: 'Financeiro',
    items: [
      { icon: ArrowUpCircle, label: 'Saques', path: '/withdrawals' },
      { icon: ArrowDownCircle, label: 'Depósitos', path: '/deposits' },
    ]
  },
  {
    section: 'Análise',
    items: [
      { icon: BarChart2, label: 'Estatísticas', path: '/statistics' },
      { icon: TrendingUp, label: 'Projeção', path: '/projection' },
      { icon: FileText, label: 'Relatórios', path: '/reports' },
    ]
  },
  {
    section: 'Configurações',
    items: [
      { icon: Settings, label: 'Minha Banca', path: '/bank-config' },
      { icon: Shield, label: 'Gestão de Risco', path: '/risk' },
    ]
  }
]

export default function Sidebar() {
  const { user, profile, logout, sidebarOpen, setSidebarOpen } = useStore()
  const location = useLocation()

  const initials = user?.email?.slice(0, 2).toUpperCase() || 'TR'
  const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Trader'

  return (
    <>
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} style={{ zIndex: 60 }}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Zap size={20} color="white" />
          </div>
          <div>
            <div className="sidebar-logo-text">Trader<span>Desk</span></div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Gestão de Banca</div>
          </div>
          <button
            className="btn btn-ghost btn-icon"
            style={{ marginLeft: 'auto' }}
            onClick={() => setSidebarOpen(false)}
          >
            <ChevronLeft size={18} />
          </button>
        </div>

        {/* Navegação */}
        <nav className="sidebar-nav">
          {navItems.map(({ section, items }) => (
            <div key={section}>
              <div className="sidebar-section-label">{section}</div>
              {items.map(({ icon: Icon, label, path }) => (
                <NavLink
                  key={path}
                  to={path}
                  end={path === '/'}
                  className={({ isActive }) =>
                    `sidebar-nav-item ${isActive ? 'active' : ''}`
                  }
                  onClick={() => { if (window.innerWidth < 1024) setSidebarOpen(false) }}
                >
                  <Icon size={18} className="nav-icon" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          ))}

          {/* Admin Section */}
          {profile?.role === 'admin' && (
            <div>
              <div className="sidebar-section-label">Administração</div>
              <NavLink
                to="/admin"
                className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => { if (window.innerWidth < 1024) setSidebarOpen(false) }}
              >
                <Users size={18} className="nav-icon" />
                <span>Painel Admin</span>
              </NavLink>
            </div>
          )}
        </nav>

        {/* User info */}
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Trader</div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={logout} title="Sair">
            <LogOut size={16} />
          </button>
        </div>
      </aside>
    </>
  )
}
