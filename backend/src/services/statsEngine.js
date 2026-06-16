/**
 * StatsEngine — Motor de cálculo de KPIs e estatísticas
 * Recalcula todas as métricas a partir dos dados brutos
 */

const supabase = require('../config/supabase');

class StatsEngine {
  
  /**
   * Calcula todos os KPIs do dashboard para um usuário
   */
  async calculateDashboardKPIs(userId) {
    const [
      bankConfig,
      operations,
      withdrawals,
      deposits,
      riskConfig
    ] = await Promise.all([
      this._getBankConfig(userId),
      this._getOperations(userId),
      this._getWithdrawals(userId),
      this._getDeposits(userId),
      this._getRiskConfig(userId)
    ]);

    if (!bankConfig) {
      return null;
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const startOfWeek = this._getStartOfWeek(now);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    // Filtros temporais
    const todayOps = operations.filter(op => op.operation_date === today);
    const weekOps = operations.filter(op => op.operation_date >= startOfWeek);
    const monthOps = operations.filter(op => op.operation_date >= startOfMonth);

    // KPIs base
    const totalDeposited = deposits.reduce((sum, d) => sum + parseFloat(d.amount), 0);
    const totalWithdrawn = withdrawals.reduce((sum, w) => sum + parseFloat(w.gross_amount), 0);
    const totalProfitLoss = operations.reduce((sum, op) => sum + parseFloat(op.profit_loss), 0);
    const currentBalance = parseFloat(bankConfig.initial_balance) + totalProfitLoss + totalDeposited - totalWithdrawn;
    const accumulatedProfit = totalProfitLoss;
    const roi = bankConfig.initial_balance > 0
      ? (accumulatedProfit / parseFloat(bankConfig.initial_balance)) * 100
      : 0;

    // Win rate
    const wins = operations.filter(op => op.result === 'WIN').length;
    const losses = operations.filter(op => op.result === 'LOSS').length;
    const winRate = operations.length > 0 ? (wins / operations.length) * 100 : 0;

    // Dias positivos/negativos
    const dailySummaries = this._buildDailySummaries(operations);
    const positiveDays = Object.values(dailySummaries).filter(d => d.net_result > 0).length;
    const negativeDays = Object.values(dailySummaries).filter(d => d.net_result < 0).length;

    // Drawdown
    const { currentDrawdown, maxDrawdown } = this._calculateDrawdown(operations, parseFloat(bankConfig.initial_balance));

    // Metas
    const dailyGoalValue = (currentBalance * parseFloat(bankConfig.daily_goal_pct)) / 100;
    const weeklyGoalValue = (currentBalance * parseFloat(bankConfig.weekly_goal_pct)) / 100;
    const monthlyGoalValue = (currentBalance * parseFloat(bankConfig.monthly_goal_pct)) / 100;

    // Progresso meta mensal
    const monthlyProfit = monthOps.reduce((sum, op) => sum + parseFloat(op.profit_loss), 0);
    const monthlyGoalProgress = monthlyGoalValue > 0 ? (monthlyProfit / monthlyGoalValue) * 100 : 0;

    // KPIs diários
    const todayProfit = todayOps.reduce((sum, op) => sum + parseFloat(op.profit_loss), 0);
    const dailyGoalProgress = dailyGoalValue > 0 ? (todayProfit / dailyGoalValue) * 100 : 0;

    // Sequências
    const { maxWinStreak, maxLossStreak, currentStreak } = this._calculateStreaks(operations);

    // Payoff e expectativa
    const avgWin = wins > 0 ? operations.filter(op => op.result === 'WIN').reduce((sum, op) => sum + parseFloat(op.profit_loss), 0) / wins : 0;
    const avgLoss = losses > 0 ? Math.abs(operations.filter(op => op.result === 'LOSS').reduce((sum, op) => sum + parseFloat(op.profit_loss), 0)) / losses : 0;
    const payoff = avgLoss > 0 ? avgWin / avgLoss : 0;
    const mathExpectancy = (winRate / 100 * avgWin) - ((1 - winRate / 100) * avgLoss);
    const profitFactor = avgLoss * losses > 0 ? (avgWin * wins) / (avgLoss * losses) : 0;

    return {
      // Saldo
      initialBalance: parseFloat(bankConfig.initial_balance),
      currentBalance,
      accumulatedProfit,
      roi,
      
      // Transações
      totalWithdrawn,
      totalDeposited,
      
      // Performance dias
      positiveDays,
      negativeDays,
      
      // Win rate
      winRate,
      totalOperations: operations.length,
      wins,
      losses,
      
      // Metas
      dailyGoalPct: parseFloat(bankConfig.daily_goal_pct),
      dailyGoalValue,
      weeklyGoalValue,
      monthlyGoalValue,
      monthlyGoalProgress,
      dailyGoalProgress,
      
      // Hoje
      todayProfit,
      todayOperations: todayOps.length,
      
      // Drawdown
      currentDrawdown,
      maxDrawdown,
      
      // Estatísticas avançadas
      maxWinStreak,
      maxLossStreak,
      currentStreak,
      avgWin,
      avgLoss,
      payoff,
      mathExpectancy,
      profitFactor,
      
      // Risk config
      riskConfig,
      bankConfig,
      
      // Dados para gráficos
      dailySummaries: Object.values(dailySummaries).sort((a, b) => a.date.localeCompare(b.date))
    };
  }

  /**
   * Retorna dados para gráficos
   */
  async getChartData(userId, period = '30d') {
    const operations = await this._getOperations(userId);
    const bankConfig = await this._getBankConfig(userId);
    
    if (!bankConfig) return null;

    const dailySummaries = this._buildDailySummaries(operations);
    const sortedDays = Object.values(dailySummaries).sort((a, b) => a.date.localeCompare(b.date));

    // Curva de patrimônio
    let balance = parseFloat(bankConfig.initial_balance);
    const equityCurve = sortedDays.map(day => {
      balance += day.net_result;
      return { date: day.date, balance: parseFloat(balance.toFixed(2)) };
    });

    // Lucro diário
    const dailyProfit = sortedDays.map(day => ({
      date: day.date,
      profit: parseFloat(day.net_result.toFixed(2)),
      positive: day.net_result >= 0
    }));

    // Lucro semanal
    const weeklyProfit = this._aggregateByWeek(sortedDays);

    // Lucro mensal
    const monthlyProfit = this._aggregateByMonth(sortedDays);

    // Ganhos vs Perdas
    const wins = operations.filter(op => op.result === 'WIN');
    const losses = operations.filter(op => op.result === 'LOSS');
    const gainsVsLosses = [
      { name: 'Ganhos', value: wins.reduce((sum, op) => sum + parseFloat(op.profit_loss), 0), count: wins.length },
      { name: 'Perdas', value: Math.abs(losses.reduce((sum, op) => sum + parseFloat(op.profit_loss), 0)), count: losses.length }
    ];

    // Heatmap (operações por hora e dia da semana)
    const heatmap = this._buildHeatmap(operations);

    return {
      equityCurve,
      dailyProfit,
      weeklyProfit,
      monthlyProfit,
      gainsVsLosses,
      heatmap
    };
  }

  /**
   * Verifica alertas de risco
   */
  async checkRiskAlerts(userId) {
    const [riskConfig, bankConfig, todayOps, weekOps, monthOps] = await Promise.all([
      this._getRiskConfig(userId),
      this._getBankConfig(userId),
      this._getTodayOperations(userId),
      this._getWeekOperations(userId),
      this._getMonthOperations(userId)
    ]);

    if (!riskConfig || !bankConfig) return [];

    const alerts = [];
    const balance = parseFloat(bankConfig.current_balance) || parseFloat(bankConfig.initial_balance);

    // Calcular P&L de hoje
    const todayPnL = todayOps.reduce((sum, op) => sum + parseFloat(op.profit_loss), 0);
    const weekPnL = weekOps.reduce((sum, op) => sum + parseFloat(op.profit_loss), 0);
    const monthPnL = monthOps.reduce((sum, op) => sum + parseFloat(op.profit_loss), 0);

    const dailyStopLossValue = -(balance * parseFloat(riskConfig.daily_stop_loss_pct)) / 100;
    const dailyStopGainValue = (balance * parseFloat(riskConfig.daily_stop_gain_pct)) / 100;
    const weeklyStopLossValue = -(balance * parseFloat(riskConfig.weekly_stop_loss_pct)) / 100;
    const weeklyStopGainValue = (balance * parseFloat(riskConfig.weekly_stop_gain_pct)) / 100;
    const monthlyStopLossValue = -(balance * parseFloat(riskConfig.monthly_stop_loss_pct)) / 100;
    const monthlyStopGainValue = (balance * parseFloat(riskConfig.monthly_stop_gain_pct)) / 100;

    if (todayPnL <= dailyStopLossValue) {
      alerts.push({ type: 'daily_stop_loss', severity: 'critical', message: `Stop Loss Diário atingido! Perda de ${Math.abs(todayPnL).toFixed(2)}` });
    }
    if (todayPnL >= dailyStopGainValue) {
      alerts.push({ type: 'daily_stop_gain', severity: 'success', message: `Stop Gain Diário atingido! Lucro de ${todayPnL.toFixed(2)}` });
    }
    if (todayOps.length >= parseInt(riskConfig.max_daily_operations)) {
      alerts.push({ type: 'max_operations', severity: 'warning', message: `Limite de ${riskConfig.max_daily_operations} operações diárias atingido!` });
    }
    if (weekPnL <= weeklyStopLossValue) {
      alerts.push({ type: 'weekly_stop_loss', severity: 'critical', message: `Stop Loss Semanal atingido!` });
    }
    if (weekPnL >= weeklyStopGainValue) {
      alerts.push({ type: 'weekly_stop_gain', severity: 'success', message: `Stop Gain Semanal atingido!` });
    }
    if (monthPnL <= monthlyStopLossValue) {
      alerts.push({ type: 'monthly_stop_loss', severity: 'critical', message: `Stop Loss Mensal atingido!` });
    }
    if (monthPnL >= monthlyStopGainValue) {
      alerts.push({ type: 'monthly_stop_gain', severity: 'success', message: `Stop Gain Mensal atingido!` });
    }

    return alerts;
  }

  /**
   * Gera insights de inteligência operacional
   */
  async generateInsights(userId) {
    const operations = await this._getOperations(userId);
    const insights = [];

    if (operations.length < 5) {
      insights.push({ type: 'info', message: 'Registre mais operações para obter insights personalizados.' });
      return insights;
    }

    // Últimos 7 dias
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const recentOps = operations.filter(op => op.operation_date >= sevenDaysAgo);
    const allWinRate = operations.length > 0 ? operations.filter(op => op.result === 'WIN').length / operations.length * 100 : 0;
    const recentWinRate = recentOps.length > 0 ? recentOps.filter(op => op.result === 'WIN').length / recentOps.length * 100 : 0;

    if (recentWinRate < allWinRate - 10 && recentOps.length >= 5) {
      insights.push({ type: 'warning', message: `📉 Seu win rate caiu nos últimos 7 dias (${recentWinRate.toFixed(0)}% vs média ${allWinRate.toFixed(0)}%). Considere revisar sua estratégia.` });
    }

    // Overtrading: mais de 15 operações em um dia
    const daily = this._buildDailySummaries(operations);
    const overtradingDays = Object.values(daily).filter(d => d.total_operations > 15);
    if (overtradingDays.length > 2) {
      insights.push({ type: 'danger', message: '⚠️ Você está fazendo overtrading! Muitas operações por dia podem prejudicar sua consistência.' });
    }

    // Sequência de losses
    const { currentStreak } = this._calculateStreaks(operations);
    if (currentStreak.type === 'LOSS' && currentStreak.count >= 3) {
      insights.push({ type: 'danger', message: `🔴 Você está em uma sequência de ${currentStreak.count} perdas consecutivas. Considere parar por hoje.` });
    }

    // Lucro acima da média
    const today = new Date().toISOString().split('T')[0];
    const todayData = daily[today];
    const avgDailyProfit = Object.values(daily).reduce((sum, d) => sum + d.net_result, 0) / Object.values(daily).length;
    if (todayData && todayData.net_result > avgDailyProfit * 1.5 && avgDailyProfit > 0) {
      insights.push({ type: 'success', message: `🌟 Seu lucro hoje está acima da sua média diária! Considere encerrar as operações e preservar o ganho.` });
    }

    // Win rate geral positivo
    if (allWinRate >= 70) {
      insights.push({ type: 'success', message: `🏆 Excelente! Seu win rate de ${allWinRate.toFixed(0)}% está acima do nível profissional!` });
    } else if (allWinRate < 50) {
      insights.push({ type: 'warning', message: `⚡ Seu win rate de ${allWinRate.toFixed(0)}% está abaixo de 50%. Revise seu gerenciamento de risco.` });
    }

    return insights;
  }

  // ============================================================
  // Métodos privados
  // ============================================================

  async _getBankConfig(userId) {
    const { data } = await supabase.from('bank_configs').select('*').eq('user_id', userId).eq('is_active', true).single();
    return data;
  }

  async _getRiskConfig(userId) {
    const { data } = await supabase.from('risk_configs').select('*').eq('user_id', userId).single();
    return data;
  }

  async _getOperations(userId) {
    const { data } = await supabase.from('operations').select('*').eq('user_id', userId).order('operation_date', { ascending: true });
    return data || [];
  }

  async _getWithdrawals(userId) {
    const { data } = await supabase.from('withdrawals').select('*').eq('user_id', userId);
    return data || [];
  }

  async _getDeposits(userId) {
    const { data } = await supabase.from('deposits').select('*').eq('user_id', userId);
    return data || [];
  }

  async _getTodayOperations(userId) {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from('operations').select('*').eq('user_id', userId).eq('operation_date', today);
    return data || [];
  }

  async _getWeekOperations(userId) {
    const startOfWeek = this._getStartOfWeek(new Date());
    const { data } = await supabase.from('operations').select('*').eq('user_id', userId).gte('operation_date', startOfWeek);
    return data || [];
  }

  async _getMonthOperations(userId) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const { data } = await supabase.from('operations').select('*').eq('user_id', userId).gte('operation_date', startOfMonth);
    return data || [];
  }

  _getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  }

  _buildDailySummaries(operations) {
    const summary = {};
    operations.forEach(op => {
      const date = op.operation_date;
      if (!summary[date]) {
        summary[date] = { date, total_operations: 0, wins: 0, losses: 0, net_result: 0, total_invested: 0 };
      }
      summary[date].total_operations++;
      summary[date].net_result += parseFloat(op.profit_loss);
      summary[date].total_invested += parseFloat(op.entry_value);
      if (op.result === 'WIN') summary[date].wins++;
      else summary[date].losses++;
    });
    return summary;
  }

  _calculateDrawdown(operations, initialBalance) {
    let peak = initialBalance;
    let balance = initialBalance;
    let maxDrawdown = 0;

    for (const op of operations) {
      balance += parseFloat(op.profit_loss);
      if (balance > peak) peak = balance;
      const drawdown = ((peak - balance) / peak) * 100;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    const currentDrawdown = ((peak - balance) / peak) * 100;
    return { currentDrawdown: parseFloat(currentDrawdown.toFixed(2)), maxDrawdown: parseFloat(maxDrawdown.toFixed(2)) };
  }

  _calculateStreaks(operations) {
    if (operations.length === 0) return { maxWinStreak: 0, maxLossStreak: 0, currentStreak: { type: null, count: 0 } };

    let maxWinStreak = 0, maxLossStreak = 0, currentWin = 0, currentLoss = 0;

    for (const op of operations) {
      if (op.result === 'WIN') {
        currentWin++;
        currentLoss = 0;
        maxWinStreak = Math.max(maxWinStreak, currentWin);
      } else {
        currentLoss++;
        currentWin = 0;
        maxLossStreak = Math.max(maxLossStreak, currentLoss);
      }
    }

    const lastOp = operations[operations.length - 1];
    const currentStreak = {
      type: lastOp.result,
      count: lastOp.result === 'WIN' ? currentWin : currentLoss
    };

    return { maxWinStreak, maxLossStreak, currentStreak };
  }

  _aggregateByWeek(dailySummaries) {
    const weeks = {};
    dailySummaries.forEach(day => {
      const date = new Date(day.date);
      const weekStart = this._getStartOfWeek(date);
      if (!weeks[weekStart]) weeks[weekStart] = { week: weekStart, profit: 0, operations: 0 };
      weeks[weekStart].profit += day.net_result;
      weeks[weekStart].operations += day.total_operations;
    });
    return Object.values(weeks).sort((a, b) => a.week.localeCompare(b.week));
  }

  _aggregateByMonth(dailySummaries) {
    const months = {};
    dailySummaries.forEach(day => {
      const month = day.date.substring(0, 7);
      if (!months[month]) months[month] = { month, profit: 0, operations: 0 };
      months[month].profit += day.net_result;
      months[month].operations += day.total_operations;
    });
    return Object.values(months).sort((a, b) => a.month.localeCompare(b.month));
  }

  _buildHeatmap(operations) {
    const heatmap = {};
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    days.forEach(day => {
      heatmap[day] = {};
      for (let h = 0; h < 24; h++) {
        heatmap[day][h] = { wins: 0, losses: 0, total: 0 };
      }
    });

    operations.forEach(op => {
      const date = new Date(op.operation_date + 'T' + (op.operation_time || '12:00:00'));
      const day = days[date.getDay()];
      const hour = op.operation_time ? parseInt(op.operation_time.split(':')[0]) : 12;
      if (heatmap[day] && heatmap[day][hour] !== undefined) {
        heatmap[day][hour].total++;
        if (op.result === 'WIN') heatmap[day][hour].wins++;
        else heatmap[day][hour].losses++;
      }
    });

    return heatmap;
  }
}

module.exports = new StatsEngine();
