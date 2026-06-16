import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AnimatePresence } from 'framer-motion'

import { supabase } from './lib/supabase'
import { useStore } from './store/useStore'

import Sidebar from './components/layout/Sidebar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import OperationsLog from './pages/OperationsLog'
import Calendar from './pages/Calendar'
import Withdrawals from './pages/Withdrawals'
import Deposits from './pages/Deposits'
import BankConfig from './pages/BankConfig'
import RiskManagement from './pages/RiskManagement'
import Statistics from './pages/Statistics'
import Projection from './pages/Projection'
import Reports from './pages/Reports'
import Insights from './pages/Insights'
import Admin from './pages/Admin'

// Loading screen
function LoadingScreen() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--color-bg-primary)', flexDirection: 'column', gap: 16
    }}>
      <div className="loading-spinner" />
      <div style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Carregando TraderDesk...</div>
    </div>
  )
}

// Layout protegido
function ProtectedLayout({ children }) {
  const { sidebarOpen } = useStore()
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  )
}

export default function App() {
  const { setSession, user } = useStore()
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    // Verificar sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setInitializing(false)
    })

    // Escutar mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (initializing) return <LoadingScreen />

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--color-bg-card)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border)',
            fontSize: '14px',
            borderRadius: '10px',
          },
          success: { iconTheme: { primary: '#10B981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
        }}
      />

      <Routes>
        {/* Auth */}
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />

        {user ? (
          <>
            <Route path="/" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
            <Route path="/operations" element={<ProtectedLayout><OperationsLog /></ProtectedLayout>} />
            <Route path="/calendar" element={<ProtectedLayout><Calendar /></ProtectedLayout>} />
            <Route path="/withdrawals" element={<ProtectedLayout><Withdrawals /></ProtectedLayout>} />
            <Route path="/deposits" element={<ProtectedLayout><Deposits /></ProtectedLayout>} />
            <Route path="/bank-config" element={<ProtectedLayout><BankConfig /></ProtectedLayout>} />
            <Route path="/risk" element={<ProtectedLayout><RiskManagement /></ProtectedLayout>} />
            <Route path="/statistics" element={<ProtectedLayout><Statistics /></ProtectedLayout>} />
            <Route path="/projection" element={<ProtectedLayout><Projection /></ProtectedLayout>} />
            <Route path="/reports" element={<ProtectedLayout><Reports /></ProtectedLayout>} />
            <Route path="/insights" element={<ProtectedLayout><Insights /></ProtectedLayout>} />
            <Route path="/admin" element={<ProtectedLayout><Admin /></ProtectedLayout>} />
          </>
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </BrowserRouter>
  )
}
