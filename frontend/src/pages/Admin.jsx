import React, { useState, useEffect } from 'react'
import { Users, Search, Edit2, Shield, Activity, DollarSign } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Header from '../components/layout/Header'
import Modal from '../components/ui/Modal'
import { useStore } from '../store/useStore'
import api from '../lib/api'
import { formatCurrency, formatPercent } from '../utils/formatters'
import toast from 'react-hot-toast'

export default function Admin() {
  const { user } = useStore()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  
  // Forms state for editing
  const [bankForm, setBankForm] = useState({})
  const [riskForm, setRiskForm] = useState({})
  const [showEditModal, setShowEditModal] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const res = await api.get('/admin/users')
      setUsers(res.data || [])
    } catch (err) {
      toast.error('Erro ao buscar usuários ou acesso negado.')
    } finally {
      setLoading(false)
    }
  }

  const openUserEdit = async (u) => {
    try {
      const res = await api.get(`/admin/user/${u.id}`)
      setSelectedUser(u)
      setBankForm(res.data.bank || { initial_balance: '', daily_goal_pct: 2, weekly_goal_pct: 10, monthly_goal_pct: 40 })
      setRiskForm(res.data.risk || { risk_per_operation_pct: 2, daily_stop_loss_pct: 5, daily_stop_gain_pct: 10 })
      setShowEditModal(true)
    } catch (err) {
      toast.error('Erro ao carregar detalhes do usuário.')
    }
  }

  const handleBankChange = (e) => setBankForm(f => ({ ...f, [e.target.name]: e.target.value }))
  const handleRiskChange = (e) => setRiskForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      // Save bank
      await api.put(`/admin/bank/${selectedUser.id}`, bankForm)
      // Save risk
      await api.put(`/admin/risk/${selectedUser.id}`, riskForm)
      
      toast.success('Configurações atualizadas!')
      setShowEditModal(false)
      fetchUsers() // refresh list
    } catch (err) {
      toast.error('Erro ao salvar as configurações.')
    } finally {
      setSaving(false)
    }
  }

  const filtered = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ background: 'var(--color-bg-primary)', minHeight: '100vh' }}>
      <Header title="Painel Admin" subtitle="Gerenciamento de Traders e Controle Operacional" onRefresh={fetchUsers} loading={loading} />
      
      <div className="page-container">
        
        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input className="form-input" placeholder="Buscar trader por nome ou email..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 38 }} />
          </div>
        </div>

        {/* Users Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container" style={{ margin: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Trader</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Banca Atual</th>
                  <th>Perfil</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => {
                  const bank = Array.isArray(u.bank_configs) ? u.bank_configs[0] : u.bank_configs
                  return (
                    <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}>
                      <td style={{ fontWeight: 600 }}>{u.name}</td>
                      <td style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{u.email}</td>
                      <td>
                        <span className={`badge ${u.role === 'admin' ? 'badge-call' : 'badge-put'}`} style={{ opacity: 0.8 }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-accent-light)' }}>
                        {bank ? formatCurrency(bank.current_balance, bank.currency) : 'Não conf.'}
                      </td>
                      <td>{bank?.operational_profile || '—'}</td>
                      <td>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openUserEdit(u)}>
                          <Edit2 size={14} style={{ color: 'var(--color-text-primary)' }} />
                        </button>
                      </td>
                    </motion.tr>
                  )
                })}
                {filtered.length === 0 && !loading && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>Nenhum trader encontrado</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={selectedUser ? `Gerenciar Trader: ${selectedUser.name}` : ''}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSave} style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: 8 }}>
          
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-accent-light)' }}>
            <DollarSign size={16} /> Configuração de Banca
          </div>
          <div className="form-grid form-grid-2" style={{ marginBottom: 24 }}>
            <div className="form-group">
              <label className="form-label">Saldo Inicial</label>
              <input type="number" step="0.01" className="form-input" name="initial_balance" value={bankForm.initial_balance || ''} onChange={handleBankChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Perfil Operacional</label>
              <select className="form-select" name="operational_profile" value={bankForm.operational_profile || 'moderado'} onChange={handleBankChange}>
                <option value="conservador">Conservador</option>
                <option value="moderado">Moderado</option>
                <option value="arrojado">Arrojado</option>
                <option value="agressivo">Agressivo</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Meta Diária (%)</label>
              <input type="number" step="0.1" className="form-input" name="daily_goal_pct" value={bankForm.daily_goal_pct || ''} onChange={handleBankChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Meta Mensal (%)</label>
              <input type="number" step="0.1" className="form-input" name="monthly_goal_pct" value={bankForm.monthly_goal_pct || ''} onChange={handleBankChange} />
            </div>
          </div>

          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-warning)' }}>
            <Shield size={16} /> Gestão de Risco
          </div>
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label">Risco por Operação (%)</label>
              <input type="number" step="0.1" className="form-input" name="risk_per_operation_pct" value={riskForm.risk_per_operation_pct || ''} onChange={handleRiskChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Máx Ops. / Dia</label>
              <input type="number" className="form-input" name="max_daily_operations" value={riskForm.max_daily_operations || ''} onChange={handleRiskChange} />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ color: 'var(--color-loss)' }}>Stop Loss Diário (%)</label>
              <input type="number" step="0.1" className="form-input" name="daily_stop_loss_pct" value={riskForm.daily_stop_loss_pct || ''} onChange={handleRiskChange} />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ color: 'var(--color-profit)' }}>Stop Gain Diário (%)</label>
              <input type="number" step="0.1" className="form-input" name="daily_stop_gain_pct" value={riskForm.daily_stop_gain_pct || ''} onChange={handleRiskChange} />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
