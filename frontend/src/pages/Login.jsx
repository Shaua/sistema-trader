import React, { useState } from 'react'
import { Zap, Mail, Globe, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'

export default function Login() {
  const [mode, setMode] = useState('login') // login | register
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleEmailAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setSuccess('Conta criada! Verifique seu e-mail para confirmar.')
      }
    } catch (err) {
      setError(err.message || 'Erro de autenticação')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
      })
      if (error) throw error
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      {/* Orbs de fundo */}
      <div className="login-bg-orbs">
        <div className="login-orb" style={{ width: 600, height: 600, background: 'radial-gradient(circle, #3B82F6, transparent)', top: -200, left: -200 }} />
        <div className="login-orb" style={{ width: 500, height: 500, background: 'radial-gradient(circle, #8B5CF6, transparent)', bottom: -100, right: -100 }} />
        <div className="login-orb" style={{ width: 300, height: 300, background: 'radial-gradient(circle, #10B981, transparent)', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
        className="login-card"
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 32px rgba(59, 130, 246, 0.4)'
          }}>
            <Zap size={28} color="white" />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: -1, marginBottom: 4 }}>
            Trader<span style={{ color: 'var(--color-accent-light)' }}>Desk</span>
          </h1>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>
            Gestão Profissional de Banca · Deriv
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: 'var(--color-bg-secondary)', borderRadius: 10, padding: 4, marginBottom: 24 }}>
          {[{ value: 'login', label: 'Entrar' }, { value: 'register', label: 'Criar Conta' }].map(t => (
            <button key={t.value} type="button"
              onClick={() => { setMode(t.value); setError(''); setSuccess('') }}
              style={{
                flex: 1, padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: 600, transition: 'all 0.2s',
                background: mode === t.value ? 'var(--color-bg-card)' : 'transparent',
                color: mode === t.value ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                boxShadow: mode === t.value ? 'var(--shadow-card)' : 'none'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Google */}
        <button className="btn btn-secondary w-full" style={{ justifyContent: 'center', marginBottom: 20, padding: '12px 20px' }} onClick={handleGoogleLogin} disabled={loading}>
          <Globe size={18} />
          Continuar com Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>ou com e-mail</span>
          <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
        </div>

        {/* Formulário */}
        <form onSubmit={handleEmailAuth}>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">E-mail</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" style={{ paddingLeft: 40 }} required />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label">Senha</label>
            <div style={{ position: 'relative' }}>
              <input type={showPass ? 'text' : 'password'} className="form-input" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={{ paddingRight: 44 }} required />
              <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="alert alert-critical" style={{ marginBottom: 16 }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 13 }}>{error}</span>
            </div>
          )}

          {success && (
            <div className="alert alert-success" style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 13 }}>{success}</span>
            </div>
          )}

          <button type="submit" className="btn btn-primary w-full" style={{ justifyContent: 'center', padding: '13px 20px', fontSize: 15 }} disabled={loading}>
            {loading ? 'Carregando...' : mode === 'login' ? 'Entrar' : 'Criar Conta'}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 12, color: 'var(--color-text-muted)' }}>
          Plataforma profissional de gestão de banca para opções binárias na Deriv.<br />
          Seus dados são protegidos com criptografia de nível bancário.
        </div>
      </motion.div>
    </div>
  )
}
