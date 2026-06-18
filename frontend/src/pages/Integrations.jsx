import React, { useState, useEffect } from 'react'
import { Link2, RefreshCw, AlertCircle, CheckCircle, Key } from 'lucide-react'
import { motion } from 'framer-motion'
import { useStore } from '../store/useStore'
import api from '../lib/api'

export default function Integrations() {
  const { profile, updateProfile, loadUserProfile } = useStore()
  const [tokens, setTokens] = useState({
    deriv_token: '',
    deriv_demo_token: ''
  })
  const [status, setStatus] = useState('disconnected') // 'disconnected', 'validating', 'connected'
  const [syncing, setSyncing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  
  useEffect(() => {
    if (profile) {
      setTokens({
        deriv_token: profile.deriv_token || '',
        deriv_demo_token: profile.deriv_demo_token || ''
      })
      if (profile.deriv_token) setStatus('connected')
    }
  }, [profile])

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccessMsg('')
    
    try {
      await api.post('/deriv/token', tokens)
      updateProfile({ 
        deriv_token: tokens.deriv_token, 
        deriv_demo_token: tokens.deriv_demo_token 
      })
      setStatus('connected')
      setSuccessMsg('Tokens salvos com sucesso!')
    } catch (err) {
      setStatus('disconnected')
      setError(err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setError('')
    setSuccessMsg('')
    
    try {
      const response = await api.post('/deriv/sync')
      setSuccessMsg(`Sincronização completa! Foram importadas ${response.data.synced_count} operações.`)
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Integração Deriv</h1>
          <p className="page-subtitle">Conecte sua conta para importar operações automaticamente</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, borderBottom: '1px solid var(--color-border)', paddingBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(255, 68, 79, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="https://deriv.com/static/1b57ea3474323c93bf99547d2f939eb5/21d60/deriv-logo.png" alt="Deriv" style={{ width: 24, height: 24, objectFit: 'contain' }} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Integração Deriv</h2>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>Conecte suas contas (Real e Virtual) via Token API</p>
            </div>
          </div>

          <form onSubmit={handleSave}>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Key size={14} /> Token API - Conta Real
              </label>
              <input 
                type="password" 
                className="form-input" 
                placeholder="Ex: aB1cD2eF3gH4iJ5"
                value={tokens.deriv_token}
                onChange={(e) => setTokens({...tokens, deriv_token: e.target.value})}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Key size={14} /> Token API - Conta Virtual (Demo)
              </label>
              <input 
                type="password" 
                className="form-input" 
                placeholder="Ex: aB1cD2eF3gH4iJ5"
                value={tokens.deriv_demo_token}
                onChange={(e) => setTokens({...tokens, deriv_demo_token: e.target.value})}
              />
              <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
                Você pode gerar seus tokens no painel da Deriv em "Manage Account Settings" {'>'} "API Token". Marque as permissões de Read e Trade.
              </p>
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ justifyContent: 'center' }}>
              {loading ? 'Validando e Salvando...' : 'Salvar Tokens'}
            </button>
            
            {successMsg && (
              <div className="alert alert-success" style={{ marginTop: 16 }}>
                {successMsg}
              </div>
            )}
            {error && (
              <div className="alert alert-critical" style={{ marginTop: 16 }}>
                {error}
              </div>
            )}
          </form>

          {status === 'connected' && (
            <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h4 style={{ fontSize: 14, fontWeight: 500 }}>Sincronização em Tempo Real</h4>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 100, background: 'var(--color-success)20', color: 'var(--color-success)' }}>
                  ATIVADA
                </span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>
                O sistema está monitorando sua conta Deriv 24/7. Suas operações aparecerão no Dashboard automaticamente no instante em que forem fechadas na corretora.
              </p>
              
              <div style={{ margin: '24px 0', borderTop: '1px dashed var(--color-border)' }} />
              
              <h4 style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Sincronização Manual</h4>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>
                Forçar a sincronização para puxar o histórico antigo ou em caso de falha de conexão.
              </p>
              <button 
                type="button"
                className="btn btn-secondary w-full" 
                onClick={handleSync}
                disabled={syncing}
                style={{ justifyContent: 'center' }}
              >
                <RefreshCw size={18} className={syncing ? 'spin' : ''} />
                {syncing ? 'Sincronizando...' : 'Sincronizar Operações Manualmente'}
              </button>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card"
        >
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Como funciona?</h3>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 16, color: 'var(--color-text-secondary)', fontSize: 14 }}>
            <li style={{ display: 'flex', gap: 12 }}>
              <div style={{ color: 'var(--color-accent)' }}>1.</div>
              <div>O sistema fará uma conexão direta com os servidores da Deriv através do seu Token.</div>
            </li>
            <li style={{ display: 'flex', gap: 12 }}>
              <div style={{ color: 'var(--color-accent)' }}>2.</div>
              <div>Por segurança, seu Token não permite fazer operações nem saques. Ele serve exclusivamente para leitura de dados.</div>
            </li>
            <li style={{ display: 'flex', gap: 12 }}>
              <div style={{ color: 'var(--color-accent)' }}>3.</div>
              <div>Ao sincronizar, buscaremos os últimos trades fechados na sua conta e preencheremos seu Diário Operacional automaticamente.</div>
            </li>
            <li style={{ display: 'flex', gap: 12 }}>
              <div style={{ color: 'var(--color-accent)' }}>4.</div>
              <div>Operações com o mesmo ID da Deriv não serão duplicadas se você apertar Sincronizar várias vezes.</div>
            </li>
          </ul>
        </motion.div>
      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
