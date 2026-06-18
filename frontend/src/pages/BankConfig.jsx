import React, { useState, useEffect } from 'react'
import { Save, Settings, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import Header from '../components/layout/Header'
import { useStore } from '../store/useStore'
import api from '../lib/api'
import { formatCurrency } from '../utils/formatters'
import toast from 'react-hot-toast'

const PROFILES = [
  { value: 'conservador', label: 'Conservador', desc: 'Metas baixas, máxima preservação de capital', risk: '1%', color: '#10B981' },
  { value: 'moderado', label: 'Moderado', desc: 'Equilíbrio entre crescimento e segurança', risk: '2%', color: '#3B82F6' },
  { value: 'arrojado', label: 'Arrojado', desc: 'Metas agressivas com risco controlado', risk: '3%', color: '#F59E0B' },
  { value: 'agressivo', label: 'Agressivo', desc: 'Máximo crescimento, alto risco', risk: '5%', color: '#EF4444' },
]

export default function BankConfig() {
  const { bankConfig, fetchBankConfig, fetchDashboard } = useStore()
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  
  const [form, setForm] = useState({
    trader_name: '', broker: 'Deriv', account_type: 'real',
    initial_balance: '', currency: 'USD', operational_profile: 'moderado',
    daily_goal_pct: 2, weekly_goal_pct: 10, monthly_goal_pct: 40
  })

  useEffect(() => {
    if (bankConfig) {
      setForm({
        trader_name: bankConfig.trader_name || '',
        broker: bankConfig.broker || 'Deriv',
        account_type: bankConfig.account_type || 'real',
        initial_balance: bankConfig.initial_balance || '',
        currency: bankConfig.currency || 'USD',
        operational_profile: bankConfig.operational_profile || 'moderado',
        daily_goal_pct: bankConfig.daily_goal_pct || 2,
        weekly_goal_pct: bankConfig.weekly_goal_pct || 10,
        monthly_goal_pct: bankConfig.monthly_goal_pct || 40,
      })
    } else {
      fetchBankConfig()
    }
  }, [bankConfig])

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  
  const handleProfileSelect = (profile) => {
    const presets = {
      conservador: { daily_goal_pct: 1, weekly_goal_pct: 5, monthly_goal_pct: 20 },
      moderado: { daily_goal_pct: 2, weekly_goal_pct: 10, monthly_goal_pct: 40 },
      arrojado: { daily_goal_pct: 3, weekly_goal_pct: 15, monthly_goal_pct: 60 },
      agressivo: { daily_goal_pct: 5, weekly_goal_pct: 25, monthly_goal_pct: 100 },
    }
    setForm(f => ({ ...f, operational_profile: profile, ...presets[profile] }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (bankConfig?.id) {
        await api.put(`/bank/${bankConfig.id}`, form)
      } else {
        await api.post('/bank', form)
      }
      await fetchBankConfig()
      await fetchDashboard()
      setSaved(true)
      toast.success('Configuração salva com sucesso!')
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      toast.error('Erro ao salvar. Verifique a conexão.')
    } finally {
      setLoading(false)
    }
  }

  const balance = parseFloat(form.initial_balance) || 0
  const dailyValue = (balance * parseFloat(form.daily_goal_pct || 0)) / 100
  const weeklyValue = (balance * parseFloat(form.weekly_goal_pct || 0)) / 100
  const monthlyValue = (balance * parseFloat(form.monthly_goal_pct || 0)) / 100

  return (
    <div style={{ background: 'var(--color-bg-primary)', minHeight: '100vh' }}>
      <Header title="Configuração da Banca" subtitle="Configure os parâmetros fundamentais da sua operação" />

      <div className="page-container">
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, alignItems: 'start' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Dados do Trader */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Settings size={18} style={{ color: 'var(--color-accent-light)' }} />
                  Dados do Trader
                </div>
                
                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Nome do Trader <span>*</span></label>
                    <input className="form-input" name="trader_name" value={form.trader_name} onChange={handleChange} placeholder="Seu nome" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Corretora</label>
                    <select className="form-select" name="broker" value={form.broker} onChange={handleChange}>
                      <option value="Deriv">Deriv</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tipo de Conta</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div className="form-input" style={{ background: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, textTransform: 'uppercase' }}>
                        {useStore.getState().activeAccountType || 'REAL'}
                      </div>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Moeda</label>
                    <select className="form-select" name="currency" value={form.currency} onChange={handleChange}>
                      <option value="USD">USD — Dólar</option>
                      <option value="BRL">BRL — Real</option>
                      <option value="EUR">EUR — Euro</option>
                    </select>
                  </div>
                </div>

                <div className="form-group mt-4">
                  <label className="form-label">Valor Inicial da Banca ({form.currency}) <span>*</span></label>
                  <input type="number" step="0.01" min="0" className="form-input" name="initial_balance" value={form.initial_balance} onChange={handleChange} placeholder="1000.00" required />
                </div>
              </motion.div>

              {/* Perfil Operacional */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card">
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Perfil Operacional</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  {PROFILES.map(p => (
                    <button key={p.value} type="button"
                      onClick={() => handleProfileSelect(p.value)}
                      style={{
                        padding: 14, borderRadius: 10, textAlign: 'left', cursor: 'pointer',
                        border: `1px solid ${form.operational_profile === p.value ? p.color : 'var(--color-border)'}`,
                        background: form.operational_profile === p.value ? `${p.color}15` : 'var(--color-bg-secondary)',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 14, color: form.operational_profile === p.value ? p.color : 'var(--color-text-primary)' }}>
                        {p.label}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{p.desc}</div>
                      <div style={{ fontSize: 11, marginTop: 4, color: p.color, fontWeight: 600 }}>Risk/Op: {p.risk}</div>
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Metas */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card">
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Metas Operacionais</div>
                <div className="form-grid form-grid-3">
                  <div className="form-group">
                    <label className="form-label">Meta Diária (%)</label>
                    <input type="number" step="0.1" min="0" max="100" className="form-input" name="daily_goal_pct" value={form.daily_goal_pct} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Meta Semanal (%)</label>
                    <input type="number" step="0.1" min="0" max="100" className="form-input" name="weekly_goal_pct" value={form.weekly_goal_pct} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Meta Mensal (%)</label>
                    <input type="number" step="0.1" min="0" max="200" className="form-input" name="monthly_goal_pct" value={form.monthly_goal_pct} onChange={handleChange} />
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Painel lateral — Preview */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card card-gradient-accent">
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Preview das Metas</div>
                
                {balance > 0 ? (
                  <>
                    <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-accent-light)', marginBottom: 4 }}>
                      {formatCurrency(balance, form.currency)}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 16 }}>Saldo inicial</div>
                    
                    {[
                      { label: 'Meta Diária', value: dailyValue, pct: form.daily_goal_pct },
                      { label: 'Meta Semanal', value: weeklyValue, pct: form.weekly_goal_pct },
                      { label: 'Meta Mensal', value: monthlyValue, pct: form.monthly_goal_pct },
                    ].map(m => (
                      <div key={m.label} style={{ padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                          <span style={{ color: 'var(--color-text-secondary)' }}>{m.label} ({m.pct}%)</span>
                          <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-profit)' }}>
                            +{formatCurrency(m.value, form.currency)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: 20, color: 'var(--color-text-muted)', fontSize: 13 }}>
                    <AlertCircle size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                    Insira o saldo inicial para ver as metas em valor
                  </div>
                )}
              </motion.div>

              <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ padding: '14px 20px', fontSize: 15, justifyContent: 'center' }}>
                <Save size={18} />
                {loading ? 'Salvando...' : saved ? '✓ Salvo!' : 'Salvar Configuração'}
              </button>

              {form.account_type === 'demo' && (
                <div className="alert alert-warning">
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>Conta demo: os dados não afetam banca real.</span>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
