import React from 'react'
import { FileText, Download, Calendar, TrendingUp, BarChart2 } from 'lucide-react'
import { motion } from 'framer-motion'
import Header from '../components/layout/Header'
import { useStore } from '../store/useStore'
import api from '../lib/api'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { formatCurrency, formatDate, formatPercent, formatNumber } from '../utils/formatters'

export default function Reports() {
  const { kpis, bankConfig } = useStore()
  const currency = bankConfig?.currency || 'USD'

  const generatePDF = async (type = 'monthly') => {
    try {
      const now = new Date()
      let reportData
      try {
        const res = await api.get(`/reports/${type}`)
        reportData = res.data
      } catch {
        reportData = null
      }

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      
      // Header
      doc.setFillColor(8, 12, 24)
      doc.rect(0, 0, 210, 40, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(22)
      doc.setFont('helvetica', 'bold')
      doc.text('TraderDesk', 20, 20)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(156, 163, 175)
      doc.text(`Relatório ${type === 'monthly' ? 'Mensal' : 'Geral'} — ${now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`, 20, 30)

      // KPIs
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Resumo Executivo', 20, 55)

      const kpiData = kpis || {}
      const summaryData = [
        ['Saldo Atual', formatCurrency(kpiData.currentBalance || 0, currency)],
        ['Lucro Acumulado', formatCurrency(kpiData.accumulatedProfit || 0, currency)],
        ['ROI Total', formatPercent(kpiData.roi || 0)],
        ['Win Rate', `${formatNumber(kpiData.winRate || 0)}%`],
        ['Total Operações', kpiData.totalOperations || 0],
        ['Drawdown Máx.', formatPercent(kpiData.maxDrawdown || 0)],
      ]

      autoTable(doc, {
        head: [['Indicador', 'Valor']],
        body: summaryData,
        startY: 60,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        styles: { fontSize: 11 }
      })

      doc.save(`traderdesk-relatorio-${type}-${now.toISOString().split('T')[0]}.pdf`)
      toast.success('PDF gerado com sucesso!')
    } catch (err) {
      toast.error('Erro ao gerar PDF')
    }
  }

  const generateExcel = async () => {
    try {
      let operations = []
      try {
        const res = await api.get('/operations', { params: { limit: 1000 } })
        operations = res.data.data || []
      } catch { }

      const wb = XLSX.utils.book_new()

      // Aba de Operações
      const opsData = operations.map(op => ({
        'Data': formatDate(op.operation_date),
        'Hora': op.operation_time?.substring(0, 5) || '',
        'Ativo': op.asset,
        'Tipo': op.operation_type,
        'Entrada': op.entry_value,
        'Resultado': op.result,
        'Lucro/Prejuízo': op.profit_loss,
        'ROI (%)': op.roi_pct,
        'Observações': op.observations || ''
      }))

      const opsSheet = XLSX.utils.json_to_sheet(opsData)
      XLSX.utils.book_append_sheet(wb, opsSheet, 'Operações')

      // Aba de KPIs
      const kpiSheet = XLSX.utils.json_to_sheet([
        { 'KPI': 'Saldo Atual', 'Valor': kpis?.currentBalance || 0 },
        { 'KPI': 'Lucro Acumulado', 'Valor': kpis?.accumulatedProfit || 0 },
        { 'KPI': 'ROI (%)', 'Valor': kpis?.roi || 0 },
        { 'KPI': 'Win Rate (%)', 'Valor': kpis?.winRate || 0 },
        { 'KPI': 'Profit Factor', 'Valor': kpis?.profitFactor || 0 },
        { 'KPI': 'Drawdown Máx. (%)', 'Valor': kpis?.maxDrawdown || 0 },
      ])
      XLSX.utils.book_append_sheet(wb, kpiSheet, 'KPIs')

      XLSX.writeFile(wb, `traderdesk-${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success('Excel gerado com sucesso!')
    } catch (err) {
      toast.error('Erro ao gerar Excel')
    }
  }

  const reports = [
    { id: 'monthly-pdf', icon: Calendar, title: 'Relatório Mensal PDF', desc: 'Resumo completo do mês atual com KPIs e operações', format: 'PDF', color: '#EF4444', action: () => generatePDF('monthly') },
    { id: 'general-pdf', icon: TrendingUp, title: 'Relatório Geral PDF', desc: 'Análise completa de toda a sua história de trading', format: 'PDF', color: '#EF4444', action: () => generatePDF('general') },
    { id: 'excel', icon: BarChart2, title: 'Exportar para Excel', desc: 'Todas as operações e KPIs em planilha Excel', format: 'XLSX', color: '#10B981', action: generateExcel },
    { id: 'weekly-pdf', icon: FileText, title: 'Relatório Semanal PDF', desc: 'Performance da semana atual', format: 'PDF', color: '#EF4444', action: () => generatePDF('weekly') },
  ]

  return (
    <div style={{ background: 'var(--color-bg-primary)', minHeight: '100vh' }}>
      <Header title="Relatórios" subtitle="Gere relatórios PDF e Excel profissionais" />
      
      <div className="page-container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {reports.map((r, i) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="card"
              style={{ cursor: 'pointer', transition: 'all 0.2s' }}
              onClick={r.action}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 10, background: `${r.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <r.icon size={22} style={{ color: r.color }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>{r.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{r.desc}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                    background: r.format === 'PDF' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                    color: r.format === 'PDF' ? 'var(--color-loss-light)' : 'var(--color-profit)'
                  }}>{r.format}</span>
                  <Download size={18} style={{ color: 'var(--color-text-muted)' }} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="alert alert-info" style={{ marginTop: 24 }}>
          <FileText size={16} style={{ flexShrink: 0 }} />
          <span>Os relatórios são gerados automaticamente com base nos seus dados. Para dados completos, configure sua banca e registre operações.</span>
        </motion.div>
      </div>
    </div>
  )
}
