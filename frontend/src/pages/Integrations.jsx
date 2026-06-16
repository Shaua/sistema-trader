import React, { useState, useEffect } from 'react'
import { Link2, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { useStore } from '../store/useStore'
import { api } from '../lib/api'

export default function Integrations() {
  const { profile } = useStore()
  const [token, setToken] = useState('')
  const [status, setStatus] = useState('disconnected') // 'disconnected', 'validating', 'connected'
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  
  // No mundo real, você poderia buscar o status atual da conexão no backend
  // Por enquanto, assumimos que está conectado se já testou nesta sessão

  const handleConnect = async (e) => {
    e.preventDefault()
    if (!token) return
    
    setStatus('validating')
    setError('')
    setSuccessMsg('')
    
    try {
      const response = await api.post('/deriv/validate', { token })
      setStatus('connected')
      setSuccessMsg(`Conectado com sucesso! Conta Deriv: ${response.data.account}`)
    } catch (err) {
      setStatus('disconnected')
      setError(err.response?.data?.error || err.message)
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
          style={{ background: 'var(--color-bg-secondary)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--color-bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="https://deriv.com/static/favicons/favicon-32x32.png" alt="Deriv" style={{ width: 24, height: 24 }} onError={(e) => e.target.style.display = 'none'} />
              {!document.querySelector('img[alt="Deriv"]') && <Link2 size={24} color="var(--color-text-primary)" />}
            </div>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 600 }}>API da Deriv</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: status === 'connected' ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                {status === 'connected' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                {status === 'connected' ? 'Conectado' : 'Desconectado'}
              </div>
            </div>
          </div>

          <form onSubmit={handleConnect}>
            <div className="form-group">
              <label className="form-label">API Token (Permissão: Read)</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Ex: u9m1x2y3z4..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
              />
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 8 }}>
                Gere o token no painel da Deriv em: Configurações &gt; API Token. Marque apenas a permissão "Read".
              </p>
            </div>

            {error && (
              <div className="alert alert-critical" style={{ marginTop: 16 }}>
                {error}
              </div>
            )}
            
            {successMsg && (
              <div className="alert alert-success" style={{ marginTop: 16 }}>
                {successMsg}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={status === 'validating'}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                {status === 'validating' ? 'Validando...' : 'Salvar e Conectar'}
              </button>
            </div>
          </form>

          {status === 'connected' && (
            <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--color-border)' }}>
              <h4 style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Sincronização Manual</h4>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>
                Puxe as últimas operações da sua conta agora mesmo.
              </p>
              <button 
                type="button"
                className="btn btn-secondary w-full" 
                onClick={handleSync}
                disabled={syncing}
                style={{ justifyContent: 'center' }}
              >
                <RefreshCw size={18} className={syncing ? 'spin' : ''} />
                {syncing ? 'Sincronizando...' : 'Sincronizar Operações'}
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
