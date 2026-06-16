import React, { useState, useEffect, useMemo } from 'react'
import { Plus, Edit2, Trash2, Filter, Download, Search, Upload } from 'lucide-react'
import { motion } from 'framer-motion'
import Header from '../components/layout/Header'
import Modal from '../components/ui/Modal'
import { useStore } from '../store/useStore'
import api from '../lib/api'
import { formatCurrency, formatDate, formatNumber, valueColor } from '../utils/formatters'
import toast from 'react-hot-toast'

const ASSETS = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'EUR/GBP', 'USD/CAD',
  'NZD/USD', 'EUR/JPY', 'GBP/JPY', 'USD/CHF',
  'Volatility 10', 'Volatility 25', 'Volatility 50', 'Volatility 75', 'Volatility 100',
  'Boom 300', 'Boom 500', 'Boom 1000', 'Crash 300', 'Crash 500', 'Crash 1000',
  'Step Index', 'Jump 10', 'Jump 25', 'Jump 50', 'Jump 75', 'Jump 100'
]

const DEMO_OPERATIONS = [
  { id: '1', operation_date: '2026-06-16', operation_time: '09:15:00', asset: 'EUR/USD', operation_type: 'CALL', entry_value: 20, result: 'WIN', profit_loss: 17, roi_pct: 85, observations: '' },
  { id: '2', operation_date: '2026-06-16', operation_time: '10:30:00', asset: 'Volatility 75', operation_type: 'PUT', entry_value: 20, result: 'LOSS', profit_loss: -20, roi_pct: -100, observations: '' },
  { id: '3', operation_date: '2026-06-16', operation_time: '11:00:00', asset: 'GBP/USD', operation_type: 'CALL', entry_value: 20, result: 'WIN', profit_loss: 17, roi_pct: 85, observations: '' },
  { id: '4', operation_date: '2026-06-15', operation_time: '09:45:00', asset: 'Boom 1000', operation_type: 'CALL', entry_value: 25, result: 'WIN', profit_loss: 21.25, roi_pct: 85, observations: 'Boa entrada no rompimento' },
  { id: '5', operation_date: '2026-06-15', operation_time: '14:20:00', asset: 'USD/JPY', operation_type: 'PUT', entry_value: 25, result: 'WIN', profit_loss: 21.25, roi_pct: 85, observations: '' },
  { id: '6', operation_date: '2026-06-14', operation_time: '10:10:00', asset: 'EUR/USD', operation_type: 'PUT', entry_value: 20, result: 'LOSS', profit_loss: -20, roi_pct: -100, observations: 'Fakeout' },
]

export default function OperationsLog() {
  const { kpis, fetchDashboard, bankConfig } = useStore()
  const [operations, setOperations] = useState(DEMO_OPERATIONS)
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingOp, setEditingOp] = useState(null)
  const [filter, setFilter] = useState({ result: '', date: '', asset: '' })
  const [search, setSearch] = useState('')

  const currency = bankConfig?.currency || 'USD'

  const [form, setForm] = useState({
    operation_date: new Date().toISOString().split('T')[0],
    operation_time: new Date().toTimeString().split(' ')[0].substring(0, 5),
    asset: 'EUR/USD',
    operation_type: 'CALL',
    entry_value: '',
    result: 'WIN',
    profit_loss: '',
    observations: ''
  })

  useEffect(() => {
    fetchOperations()
  }, [])

  const fetchOperations = async () => {
    try {
      setLoading(true)
      const res = await api.get('/operations', { params: filter })
      setOperations(res.data.data || DEMO_OPERATIONS)
    } catch {
      setOperations(DEMO_OPERATIONS)
    } finally {
      setLoading(false)
    }
  }

  // Auto-calcular profit/loss
  const handleFormChange = (e) => {
    const { name, value } = e.target
    setForm(prev => {
      const next = { ...prev, [name]: value }
      if (name === 'entry_value' || name === 'result') {
        const entry = parseFloat(name === 'entry_value' ? value : prev.entry_value) || 0
        const res = name === 'result' ? value : prev.result
        if (res === 'WIN') {
          next.profit_loss = (entry * 0.85).toFixed(2)
        } else {
          next.profit_loss = (-entry).toFixed(2)
        }
      }
      return next
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingOp) {
        await api.put(`/operations/${editingOp.id}`, form)
        toast.success('Operação atualizada!')
      } else {
        await api.post('/operations', form)
        toast.success('Operação registrada!')
      }
      setShowModal(false)
      fetchOperations()
      fetchDashboard()
    } catch (err) {
      toast.error('Erro ao salvar operação')
      // Demo: adiciona localmente
      const newOp = { ...form, id: Date.now().toString(), entry_value: parseFloat(form.entry_value), profit_loss: parseFloat(form.profit_loss) }
      setOperations(prev => [newOp, ...prev])
      setShowModal(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Deletar esta operação?')) return
    try {
      await api.delete(`/operations/${id}`)
      toast.success('Operação removida')
      fetchOperations()
      fetchDashboard()
    } catch {
      setOperations(prev => prev.filter(op => op.id !== id))
      toast.success('Operação removida')
    }
  }

  const openEdit = (op) => {
    setEditingOp(op)
    setForm({
      operation_date: op.operation_date,
      operation_time: op.operation_time?.substring(0, 5) || '',
      asset: op.asset,
      operation_type: op.operation_type,
      entry_value: op.entry_value,
      result: op.result,
      profit_loss: op.profit_loss,
      observations: op.observations || ''
    })
    setShowModal(true)
  }

  const openNew = () => {
    setEditingOp(null)
    setForm({
      operation_date: new Date().toISOString().split('T')[0],
      operation_time: new Date().toTimeString().split(' ')[0].substring(0, 5),
      asset: 'EUR/USD', operation_type: 'CALL', entry_value: '', result: 'WIN', profit_loss: '', observations: ''
    })
    setShowModal(true)
  }

  const filtered = useMemo(() => {
    return operations.filter(op => {
      if (filter.result && op.result !== filter.result) return false
      if (filter.date && op.operation_date !== filter.date) return false
      if (search && !op.asset.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [operations, filter, search])

  // Totais
  const totalProfit = filtered.reduce((s, op) => s + parseFloat(op.profit_loss || 0), 0)
  const wins = filtered.filter(op => op.result === 'WIN').length
  const losses = filtered.filter(op => op.result === 'LOSS').length
  const winRate = filtered.length > 0 ? ((wins / filtered.length) * 100).toFixed(1) : 0

  return (
    <div style={{ background: 'var(--color-bg-primary)', minHeight: '100vh' }}>
      <Header
        title="Diário Operacional"
        subtitle="Registro e análise de todas as suas operações"
        onRefresh={fetchOperations}
        loading={loading}
      />
      
      <div className="page-container">
        {/* Sumário */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total', value: filtered.length, color: 'var(--color-text-primary)' },
            { label: 'WIN', value: wins, color: 'var(--color-profit)' },
            { label: 'LOSS', value: losses, color: 'var(--color-loss)' },
            { label: 'Resultado', value: formatCurrency(totalProfit, currency), color: totalProfit >= 0 ? 'var(--color-profit)' : 'var(--color-loss)' },
          ].map((s, i) => (
            <div key={i} className="card" style={{ textAlign: 'center', padding: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-mono)', color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input className="form-input" placeholder="Buscar ativo..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 38 }} />
          </div>
          <select className="form-select" value={filter.result} onChange={e => setFilter(f => ({ ...f, result: e.target.value }))} style={{ width: 'auto' }}>
            <option value="">Todos</option>
            <option value="WIN">WIN</option>
            <option value="LOSS">LOSS</option>
          </select>
          <input type="date" className="form-input" value={filter.date} onChange={e => setFilter(f => ({ ...f, date: e.target.value }))} style={{ width: 'auto' }} />
          <button className="btn btn-secondary btn-sm" onClick={() => setFilter({ result: '', date: '', asset: '' })}>
            <Filter size={14} /> Limpar
          </button>
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={16} /> Nova Operação
          </button>
        </div>

        {/* Tabela */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Hora</th>
                <th>Ativo</th>
                <th>Tipo</th>
                <th>Entrada</th>
                <th>Resultado</th>
                <th>Lucro/Prejuízo</th>
                <th>ROI</th>
                <th>Obs.</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((op, i) => (
                <motion.tr key={op.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{formatDate(op.operation_date)}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--color-text-muted)' }}>{op.operation_time?.substring(0,5)}</td>
                  <td style={{ fontWeight: 600 }}>{op.asset}</td>
                  <td><span className={`badge badge-${op.operation_type.toLowerCase()}`}>{op.operation_type}</span></td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(op.entry_value, currency)}</td>
                  <td><span className={`badge badge-${op.result.toLowerCase()}`}>{op.result}</span></td>
                  <td className={valueColor(op.profit_loss)} style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    {op.profit_loss >= 0 ? '+' : ''}{formatCurrency(op.profit_loss, currency)}
                  </td>
                  <td className={valueColor(op.roi_pct)} style={{ fontFamily: 'var(--font-mono)' }}>
                    {op.roi_pct >= 0 ? '+' : ''}{formatNumber(op.roi_pct)}%
                  </td>
                  <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text-muted)', fontSize: 12 }}>
                    {op.observations || '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(op)}><Edit2 size={14} /></button>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(op.id)} style={{ color: 'var(--color-loss)' }}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>Nenhuma operação encontrada</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal nova/editar operação */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingOp ? 'Editar Operação' : 'Nova Operação'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSubmit}>
              {editingOp ? 'Salvar' : 'Registrar'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label">Data <span>*</span></label>
              <input type="date" className="form-input" name="operation_date" value={form.operation_date} onChange={handleFormChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Hora <span>*</span></label>
              <input type="time" className="form-input" name="operation_time" value={form.operation_time} onChange={handleFormChange} required />
            </div>
          </div>

          <div className="form-group mt-4">
            <label className="form-label">Ativo <span>*</span></label>
            <select className="form-select" name="asset" value={form.asset} onChange={handleFormChange} required>
              {ASSETS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div className="form-grid form-grid-2 mt-4">
            <div className="form-group">
              <label className="form-label">Tipo</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['CALL', 'PUT'].map(t => (
                  <button
                    key={t} type="button"
                    className={`btn ${form.operation_type === t ? (t === 'CALL' ? 'btn-primary' : 'btn-danger') : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                    onClick={() => setForm(f => ({ ...f, operation_type: t }))}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Resultado</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['WIN', 'LOSS'].map(r => (
                  <button
                    key={r} type="button"
                    className={`btn ${form.result === r ? (r === 'WIN' ? 'btn-success' : 'btn-danger') : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                    onClick={() => handleFormChange({ target: { name: 'result', value: r } })}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="form-grid form-grid-2 mt-4">
            <div className="form-group">
              <label className="form-label">Valor da Entrada ({currency}) <span>*</span></label>
              <input type="number" step="0.01" min="0" className="form-input" name="entry_value" value={form.entry_value} onChange={handleFormChange} placeholder="20.00" required />
            </div>
            <div className="form-group">
              <label className="form-label">Lucro/Prejuízo ({currency})</label>
              <input type="number" step="0.01" className="form-input" name="profit_loss" value={form.profit_loss} onChange={handleFormChange} placeholder="Auto-calculado" />
            </div>
          </div>

          <div className="form-group mt-4">
            <label className="form-label">Observações</label>
            <textarea className="form-textarea" name="observations" value={form.observations} onChange={handleFormChange} placeholder="Anotações sobre a operação..." rows={3} />
          </div>
        </form>
      </Modal>
    </div>
  )
}
