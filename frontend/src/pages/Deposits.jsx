import React, { useState, useEffect } from 'react'
import { Plus, Trash2, ArrowDownCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import Header from '../components/layout/Header'
import Modal from '../components/ui/Modal'
import { useStore } from '../store/useStore'
import api from '../lib/api'
import { formatCurrency, formatDate } from '../utils/formatters'
import toast from 'react-hot-toast'

const DEMO = [
  { id: '1', deposit_date: '2026-05-01', amount: 1000, method: 'PIX', observations: 'Banca inicial' },
]

export default function Deposits() {
  const { bankConfig, fetchDashboard } = useStore()
  const [deposits, setDeposits] = useState(DEMO)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    deposit_date: new Date().toISOString().split('T')[0],
    amount: '', method: 'PIX', observations: ''
  })
  const currency = bankConfig?.currency || 'USD'

  useEffect(() => {
    api.get('/deposits').then(r => { if (Array.isArray(r.data)) setDeposits(r.data) }).catch(() => {})
  }, [])

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/deposits', form)
      toast.success('Depósito registrado!')
      const res = await api.get('/deposits')
      setDeposits(res.data)
      fetchDashboard()
    } catch {
      setDeposits(prev => [{ ...form, id: Date.now().toString(), amount: parseFloat(form.amount) }, ...prev])
      toast.success('Depósito registrado!')
    }
    setShowModal(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Remover este depósito?')) return
    try { await api.delete(`/deposits/${id}`) } catch {}
    setDeposits(prev => prev.filter(d => d.id !== id))
    toast.success('Removido')
  }

  const totalMonth = deposits.filter(d => {
    const dt = new Date(d.deposit_date + 'T00:00:00')
    const now = new Date()
    return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear()
  }).reduce((s, d) => s + parseFloat(d.amount), 0)

  const totalYear = deposits.filter(d => new Date(d.deposit_date + 'T00:00:00').getFullYear() === new Date().getFullYear())
    .reduce((s, d) => s + parseFloat(d.amount), 0)

  const total = deposits.reduce((s, d) => s + parseFloat(d.amount), 0)

  return (
    <div style={{ background: 'var(--color-bg-primary)', minHeight: '100vh' }}>
      <Header title="Controle de Depósitos" subtitle="Histórico de aportes na sua banca" />
      <div className="page-container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Depositado (Mês)', value: formatCurrency(totalMonth, currency) },
            { label: 'Depositado (Ano)', value: formatCurrency(totalYear, currency) },
            { label: 'Total Depositado', value: formatCurrency(total, currency) },
          ].map((s, i) => (
            <div key={i} className="card" style={{ textAlign: 'center' }}>
              <ArrowDownCircle size={20} style={{ color: 'var(--color-accent-light)', margin: '0 auto 8px' }} />
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-accent-light)' }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={16} /> Registrar Depósito</button>
        </div>

        <div className="table-container">
          <table>
            <thead><tr><th>Data</th><th>Valor</th><th>Método</th><th>Observações</th><th></th></tr></thead>
            <tbody>
              {deposits.map((d, i) => (
                <motion.tr key={d.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{formatDate(d.deposit_date)}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-accent-light)' }}>{formatCurrency(d.amount, currency)}</td>
                  <td><span className="badge badge-call">{d.method}</span></td>
                  <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{d.observations || '—'}</td>
                  <td>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(d.id)} style={{ color: 'var(--color-loss)' }}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Registrar Depósito"
        footer={<><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={handleSubmit}>Registrar</button></>}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label">Data <span>*</span></label>
              <input type="date" className="form-input" name="deposit_date" value={form.deposit_date} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Método</label>
              <select className="form-select" name="method" value={form.method} onChange={handleChange}>
                <option>PIX</option><option>Cripto</option><option>Transferência</option>
              </select>
            </div>
          </div>
          <div className="form-group mt-4">
            <label className="form-label">Valor ({currency}) <span>*</span></label>
            <input type="number" step="0.01" min="0" className="form-input" name="amount" value={form.amount} onChange={handleChange} placeholder="500.00" required />
          </div>
          <div className="form-group mt-4">
            <label className="form-label">Observações</label>
            <textarea className="form-textarea" name="observations" value={form.observations} onChange={handleChange} placeholder="Ex: Aporte mensal" rows={2} />
          </div>
        </form>
      </Modal>
    </div>
  )
}
