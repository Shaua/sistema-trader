import React, { useState, useEffect } from 'react'
import { Plus, Trash2, DollarSign } from 'lucide-react'
import { motion } from 'framer-motion'
import Header from '../components/layout/Header'
import Modal from '../components/ui/Modal'
import { useStore } from '../store/useStore'
import api from '../lib/api'
import { formatCurrency, formatDate } from '../utils/formatters'
import toast from 'react-hot-toast'

const DEMO_WITHDRAWALS = [
  { id: '1', withdrawal_date: '2026-06-10', gross_amount: 200, dollar_rate: 5.15, fee_pct: 2, fee_amount: 4, net_amount: 196, method: 'PIX' },
  { id: '2', withdrawal_date: '2026-05-28', gross_amount: 150, dollar_rate: 5.10, fee_pct: 2, fee_amount: 3, net_amount: 147, method: 'Cripto' },
]

export default function Withdrawals() {
  const { bankConfig, fetchDashboard } = useStore()
  const [withdrawals, setWithdrawals] = useState(DEMO_WITHDRAWALS)
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    withdrawal_date: new Date().toISOString().split('T')[0],
    gross_amount: '', dollar_rate: '', fee_pct: '2', method: 'PIX', observations: ''
  })

  const currency = bankConfig?.currency || 'USD'

  useEffect(() => { fetchWithdrawals() }, [])

  const fetchWithdrawals = async () => {
    try {
      const res = await api.get('/withdrawals')
      if (Array.isArray(res.data)) setWithdrawals(res.data)
    } catch { /* usar demo */ }
  }

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const feeAmount = (parseFloat(form.gross_amount) * parseFloat(form.fee_pct || 0)) / 100 || 0
  const netAmount = (parseFloat(form.gross_amount) || 0) - feeAmount
  const netBRL = form.dollar_rate ? netAmount * parseFloat(form.dollar_rate) : null

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/withdrawals', form)
      toast.success('Saque registrado!')
      fetchWithdrawals()
      fetchDashboard()
    } catch {
      const newW = { ...form, id: Date.now().toString(), gross_amount: parseFloat(form.gross_amount), fee_amount: feeAmount, net_amount: netAmount }
      setWithdrawals(prev => [newW, ...prev])
      toast.success('Saque registrado!')
    }
    setShowModal(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Remover este saque?')) return
    try { await api.delete(`/withdrawals/${id}`) } catch {}
    setWithdrawals(prev => prev.filter(w => w.id !== id))
    toast.success('Removido')
  }

  const totalMonth = withdrawals.filter(w => {
    const d = new Date(w.withdrawal_date + 'T00:00:00')
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).reduce((s, w) => s + parseFloat(w.gross_amount), 0)

  const totalYear = withdrawals.filter(w => {
    return new Date(w.withdrawal_date + 'T00:00:00').getFullYear() === new Date().getFullYear()
  }).reduce((s, w) => s + parseFloat(w.gross_amount), 0)

  const totalAll = withdrawals.reduce((s, w) => s + parseFloat(w.gross_amount), 0)

  return (
    <div style={{ background: 'var(--color-bg-primary)', minHeight: '100vh' }}>
      <Header title="Controle de Saques" subtitle="Histórico e análise dos seus saques" />
      <div className="page-container">
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total Sacado (Mês)', value: formatCurrency(totalMonth, currency), color: 'var(--color-profit)' },
            { label: 'Total Sacado (Ano)', value: formatCurrency(totalYear, currency), color: 'var(--color-accent-light)' },
            { label: 'Total Sacado (Histórico)', value: formatCurrency(totalAll, currency), color: 'var(--color-text-primary)' },
          ].map((s, i) => (
            <div key={i} className="card" style={{ textAlign: 'center' }}>
              <DollarSign size={20} style={{ color: s.color, margin: '0 auto 8px' }} />
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-mono)', color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Registrar Saque
          </button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Valor Bruto</th>
                <th>Cotação USD</th>
                <th>Taxa (%)</th>
                <th>Taxa (Valor)</th>
                <th>Valor Líquido</th>
                <th>Método</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.map((w, i) => (
                <motion.tr key={w.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{formatDate(w.withdrawal_date)}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-profit)' }}>{formatCurrency(w.gross_amount, currency)}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>{w.dollar_rate ? `R$ ${parseFloat(w.dollar_rate).toFixed(2)}` : '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{w.fee_pct}%</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-loss)' }}>{formatCurrency(w.fee_amount, currency)}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-profit)' }}>{formatCurrency(w.net_amount, currency)}</td>
                  <td><span className="badge badge-call">{w.method}</span></td>
                  <td>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(w.id)} style={{ color: 'var(--color-loss)' }}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </motion.tr>
              ))}
              {withdrawals.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>Nenhum saque registrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Registrar Saque"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit}>Registrar</button>
        </>}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label">Data <span>*</span></label>
              <input type="date" className="form-input" name="withdrawal_date" value={form.withdrawal_date} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Método</label>
              <select className="form-select" name="method" value={form.method} onChange={handleChange}>
                <option>PIX</option><option>Cripto</option><option>Transferência</option>
              </select>
            </div>
          </div>
          <div className="form-grid form-grid-2 mt-4">
            <div className="form-group">
              <label className="form-label">Valor Bruto ({currency}) <span>*</span></label>
              <input type="number" step="0.01" min="0" className="form-input" name="gross_amount" value={form.gross_amount} onChange={handleChange} placeholder="200.00" required />
            </div>
            <div className="form-group">
              <label className="form-label">Cotação USD (R$)</label>
              <input type="number" step="0.01" min="0" className="form-input" name="dollar_rate" value={form.dollar_rate} onChange={handleChange} placeholder="5.15" />
            </div>
          </div>
          <div className="form-group mt-4">
            <label className="form-label">Taxa (%)</label>
            <input type="number" step="0.1" min="0" max="100" className="form-input" name="fee_pct" value={form.fee_pct} onChange={handleChange} placeholder="2" />
          </div>
          
          {form.gross_amount && (
            <div style={{ marginTop: 16, padding: 14, background: 'var(--color-profit-bg)', borderRadius: 8, border: '1px solid var(--color-profit-border)' }}>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 8 }}>Resumo:</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span>Taxa: <strong style={{ color: 'var(--color-loss)' }}>{formatCurrency(feeAmount, currency)}</strong></span>
                <span>Líquido: <strong style={{ color: 'var(--color-profit)', fontFamily: 'var(--font-mono)' }}>{formatCurrency(netAmount, currency)}</strong></span>
                {netBRL && <span>≈ <strong style={{ color: 'var(--color-profit)' }}>R$ {netBRL.toFixed(2)}</strong></span>}
              </div>
            </div>
          )}
        </form>
      </Modal>
    </div>
  )
}
