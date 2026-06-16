import React, { useState, useEffect } from 'react'
import { Shield, Save, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'
import Header from '../components/layout/Header'
import { useStore } from '../store/useStore'
import api from '../lib/api'
import { formatCurrency } from '../utils/formatters'
import toast from 'react-hot-toast'

export default function RiskManagement() {
  const { riskConfig, fetchRiskConfig, bankConfig } = useStore()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    risk_per_operation_pct: 2,
    daily_stop_loss_pct: 5,
    daily_stop_gain_pct: 10,
    weekly_stop_loss_pct: 10,
    weekly_stop_gain_pct: 20,
    monthly_stop_loss_pct: 20,
    monthly_stop_gain_pct: 60,
    max_daily_operations: 10,
    block_on_stop: true
  })

  useEffect(() => {
    if (riskConfig) setForm(riskConfig)
    else fetchRiskConfig()
  }, [riskConfig])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/risk', form)
      await fetchRiskConfig()
      toast.success('Configuração de risco salva!')
    } catch {
      toast.error('Erro ao salvar. Verifique conexão.')
    } finally {
      setLoading(false)
    }
  }

  const balance = parseFloat(bankConfig?.current_balance || bankConfig?.initial_balance || 1000)
  const currency = bankConfig?.currency || 'USD'

  const riskValue = (balance * parseFloat(form.risk_per_operation_pct || 0)) / 100

  const limits = [
    { label: 'Stop Loss Diário', pct: form.daily_stop_loss_pct, value: -(balance * parseFloat(form.daily_stop_loss_pct || 0) / 100), color: 'var(--color-loss)', type: 'loss' },
    { label: 'Stop Gain Diário', pct: form.daily_stop_gain_pct, value: (balance * parseFloat(form.daily_stop_gain_pct || 0) / 100), color: 'var(--color-profit)', type: 'profit' },
    { label: 'Stop Loss Semanal', pct: form.weekly_stop_loss_pct, value: -(balance * parseFloat(form.weekly_stop_loss_pct || 0) / 100), color: 'var(--color-loss)', type: 'loss' },
    { label: 'Stop Gain Semanal', pct: form.weekly_stop_gain_pct, value: (balance * parseFloat(form.weekly_stop_gain_pct || 0) / 100), color: 'var(--color-profit)', type: 'profit' },
    { label: 'Stop Loss Mensal', pct: form.monthly_stop_loss_pct, value: -(balance * parseFloat(form.monthly_stop_loss_pct || 0) / 100), color: 'var(--color-loss)', type: 'loss' },
    { label: 'Stop Gain Mensal', pct: form.monthly_stop_gain_pct, value: (balance * parseFloat(form.monthly_stop_gain_pct || 0) / 100), color: 'var(--color-profit)', type: 'profit' },
  ]

  return (
    <div style={{ background: 'var(--color-bg-primary)', minHeight: '100vh' }}>
      <Header title="Gestão de Risco" subtitle="Configure seus limites de proteção do capital" />
      
      <div className="page-container">
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Risco por Operação */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Shield size={18} style={{ color: 'var(--color-accent-light)' }} />
                  Risco por Operação
                </div>
                
                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Risco por Operação (%)</label>
                    <input type="number" step="0.1" min="0.1" max="20" className="form-input" name="risk_per_operation_pct" value={form.risk_per_operation_pct} onChange={handleChange} />
                    <div style={{ fontSize: 12, color: 'var(--color-profit)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                      = {formatCurrency(riskValue, currency)} por trade
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Máx. Operações/Dia</label>
                    <input type="number" min="1" max="100" className="form-input" name="max_daily_operations" value={form.max_daily_operations} onChange={handleChange} />
                  </div>
                </div>

                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input type="checkbox" id="block_on_stop" name="block_on_stop" checked={form.block_on_stop} onChange={handleChange} style={{ width: 16, height: 16, accentColor: 'var(--color-accent)' }} />
                  <label htmlFor="block_on_stop" style={{ fontSize: 14, cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                    Bloquear novos registros ao atingir stop (recomendado)
                  </label>
                </div>
              </motion.div>

              {/* Stops Diários */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card">
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Stops Diários</div>
                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Stop Loss Diário (%)</label>
                    <input type="number" step="0.1" min="0" max="100" className="form-input" name="daily_stop_loss_pct" value={form.daily_stop_loss_pct} onChange={handleChange} />
                    <div style={{ fontSize: 12, color: 'var(--color-loss)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                      = -{formatCurrency(balance * parseFloat(form.daily_stop_loss_pct || 0) / 100, currency)}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Stop Gain Diário (%)</label>
                    <input type="number" step="0.1" min="0" max="200" className="form-input" name="daily_stop_gain_pct" value={form.daily_stop_gain_pct} onChange={handleChange} />
                    <div style={{ fontSize: 12, color: 'var(--color-profit)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                      = +{formatCurrency(balance * parseFloat(form.daily_stop_gain_pct || 0) / 100, currency)}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Stops Semanais */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card">
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Stops Semanais</div>
                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Stop Loss Semanal (%)</label>
                    <input type="number" step="0.1" min="0" className="form-input" name="weekly_stop_loss_pct" value={form.weekly_stop_loss_pct} onChange={handleChange} />
                    <div style={{ fontSize: 12, color: 'var(--color-loss)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                      = -{formatCurrency(balance * parseFloat(form.weekly_stop_loss_pct || 0) / 100, currency)}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Stop Gain Semanal (%)</label>
                    <input type="number" step="0.1" min="0" className="form-input" name="weekly_stop_gain_pct" value={form.weekly_stop_gain_pct} onChange={handleChange} />
                    <div style={{ fontSize: 12, color: 'var(--color-profit)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                      = +{formatCurrency(balance * parseFloat(form.weekly_stop_gain_pct || 0) / 100, currency)}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Stops Mensais */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card">
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Stops Mensais</div>
                <div className="form-grid form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Stop Loss Mensal (%)</label>
                    <input type="number" step="0.1" min="0" className="form-input" name="monthly_stop_loss_pct" value={form.monthly_stop_loss_pct} onChange={handleChange} />
                    <div style={{ fontSize: 12, color: 'var(--color-loss)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                      = -{formatCurrency(balance * parseFloat(form.monthly_stop_loss_pct || 0) / 100, currency)}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Stop Gain Mensal (%)</label>
                    <input type="number" step="0.1" min="0" className="form-input" name="monthly_stop_gain_pct" value={form.monthly_stop_gain_pct} onChange={handleChange} />
                    <div style={{ fontSize: 12, color: 'var(--color-profit)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                      = +{formatCurrency(balance * parseFloat(form.monthly_stop_gain_pct || 0) / 100, currency)}
                    </div>
                  </div>
                </div>
              </motion.div>

              <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '14px 24px', fontSize: 15, justifyContent: 'center' }}>
                <Save size={18} />
                {loading ? 'Salvando...' : 'Salvar Gestão de Risco'}
              </button>
            </div>

            {/* Preview */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card" style={{ position: 'sticky', top: 80 }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Limites em Valor</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12 }}>
                Baseado no saldo de {formatCurrency(balance, currency)}
              </div>
              {limits.map((l, i) => (
                <div key={i} style={{
                  padding: '10px 12px', borderRadius: 8, marginBottom: 8,
                  background: l.type === 'loss' ? 'var(--color-loss-bg)' : 'var(--color-profit-bg)',
                  border: `1px solid ${l.type === 'loss' ? 'var(--color-loss-border)' : 'var(--color-profit-border)'}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{l.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: l.color }}>
                    {l.type === 'loss' ? '-' : '+'}{formatCurrency(Math.abs(l.value), currency)}
                  </span>
                </div>
              ))}

              <div className="alert alert-warning" style={{ marginTop: 16 }}>
                <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 12 }}>Ao atingir qualquer limite, um alerta visual será exibido imediatamente.</span>
              </div>
            </motion.div>
          </div>
        </form>
      </div>
    </div>
  )
}
