/**
 * Utilitários de formatação para o TraderDesk
 */

/**
 * Formata um valor monetário
 */
export function formatCurrency(value, currency = 'USD', compact = false) {
  if (value === null || value === undefined) return '—'
  const num = parseFloat(value)
  if (isNaN(num)) return '—'
  
  if (compact && Math.abs(num) >= 1000) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(num)
  }
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num)
}

/**
 * Formata percentual
 */
export function formatPercent(value, decimals = 2) {
  if (value === null || value === undefined) return '—'
  const num = parseFloat(value)
  if (isNaN(num)) return '—'
  const sign = num > 0 ? '+' : ''
  return `${sign}${num.toFixed(decimals)}%`
}

/**
 * Formata número com sinal
 */
export function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined) return '—'
  const num = parseFloat(value)
  if (isNaN(num)) return '—'
  return num.toFixed(decimals)
}

/**
 * Retorna classe CSS de cor baseada no valor
 */
export function valueColor(value) {
  const num = parseFloat(value)
  if (isNaN(num) || num === 0) return 'number-neutral'
  return num > 0 ? 'number-positive' : 'number-negative'
}

/**
 * Formata data brasileira
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('pt-BR')
}

/**
 * Formata data e hora
 */
export function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('pt-BR')
}

/**
 * Formata data como "Seg, 16 Jun"
 */
export function formatDateShort(dateStr) {
  if (!dateStr) return '—'
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
}

/**
 * Abreviações de meses
 */
export const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

/**
 * Retorna nome do mês
 */
export function getMonthName(monthNum) {
  return MONTHS[monthNum - 1] || ''
}

/**
 * Calcula meta em valor a partir de percentual e saldo
 */
export function calculateGoalValue(balance, goalPct) {
  return (parseFloat(balance) * parseFloat(goalPct)) / 100
}

/**
 * Dados de demonstração para popular o sistema
 */
export function generateDemoData(initialBalance = 1000, days = 30) {
  const operations = []
  const assets = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'EUR/GBP', 'Volatility 75', 'Volatility 100', 'Boom 1000']
  
  let balance = initialBalance
  const today = new Date()
  
  for (let d = days; d >= 0; d--) {
    const date = new Date(today)
    date.setDate(today.getDate() - d)
    const dateStr = date.toISOString().split('T')[0]
    
    // Pular fins de semana (opcional)
    if (date.getDay() === 0 || date.getDay() === 6) continue
    
    // 2-8 operações por dia
    const numOps = Math.floor(Math.random() * 7) + 2
    
    for (let i = 0; i < numOps; i++) {
      const entry = parseFloat((balance * 0.02).toFixed(2)) // 2% da banca
      const isWin = Math.random() < 0.65 // 65% win rate simulado
      const profit = isWin ? parseFloat((entry * 0.85).toFixed(2)) : -entry
      
      const hour = Math.floor(Math.random() * 8) + 9 // 9h-17h
      const min = Math.floor(Math.random() * 60)
      
      operations.push({
        operation_date: dateStr,
        operation_time: `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`,
        asset: assets[Math.floor(Math.random() * assets.length)],
        operation_type: Math.random() > 0.5 ? 'CALL' : 'PUT',
        entry_value: entry,
        result: isWin ? 'WIN' : 'LOSS',
        profit_loss: profit,
        roi_pct: isWin ? 85 : -100,
        observations: ''
      })
      
      balance += profit
    }
  }
  
  return { operations, finalBalance: balance }
}
