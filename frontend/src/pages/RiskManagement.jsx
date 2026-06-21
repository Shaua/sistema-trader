import React, { useState, useEffect } from 'react'
import { Shield, Save } from 'lucide-react'
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

  const limits = []

  return (
    <div style={{ background: 'var(--color-bg-primary)', minHeight: '100vh' }}>
      <Header title="Gestão de Risco" subtitle="Configure seus limites de proteção do capital" />
      
      <div className="page-container">
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20, maxWidth: 600 }}>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Risco por Operação */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Shield size={18} style={{ color: 'var(--color-accent-light)' }} />
                  Risco por Operação
                </div>
                
                <div className="form-grid form-grid-1">
                  <div className="form-group">
                    <label className="form-label">Risco por Operação (%)</label>
                    <input type="number" step="0.1" min="0.1" max="20" className="form-input" name="risk_per_operation_pct" value={form.risk_per_operation_pct} onChange={handleChange} />
                    <div style={{ fontSize: 12, color: 'var(--color-profit)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                      = {formatCurrency(riskValue, currency)} por trade
                    </div>
                  </div>
                </div>
              </motion.div>

              <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '14px 24px', fontSize: 15, justifyContent: 'center' }}>
                <Save size={18} />
                {loading ? 'Salvando...' : 'Salvar Gestão de Risco'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
