require('dotenv').config();
const supabase = require('./src/config/supabase');

async function analyze() {
  console.log('Fetching operations...');
  const { data: operations, error } = await supabase.from('operations').select('*');
  if (error) {
    console.error('Error fetching operations:', error);
    return;
  }
  
  if (!operations || operations.length === 0) {
    console.log('No operations found in database.');
    return;
  }

  let weekdaysBusiness = { total: 0, wins: 0, profit: 0, loss_094: 0, total_094: 0 };
  let weekdaysOffPeak = { total: 0, wins: 0, profit: 0, loss_094: 0, total_094: 0 };
  let weekends = { total: 0, wins: 0, profit: 0, loss_094: 0, total_094: 0 };

  operations.forEach(op => {
    // Determine day and hour
    const date = new Date(op.operation_date + 'T' + (op.operation_time || '12:00:00') + 'Z');
    const day = date.getUTCDay(); // 0 = Sunday, 6 = Saturday
    const hour = parseInt(op.operation_time ? op.operation_time.split(':')[0] : 12);
    
    const isWeekend = (day === 0 || day === 6);
    const isBusinessHour = (hour >= 8 && hour < 18);
    
    const profit = parseFloat(op.profit_loss || 0);
    const isWin = op.result === 'WIN';
    const is094 = parseFloat(op.entry_value) >= 0.90;
    
    if (isWeekend) {
      weekends.total++;
      if (isWin) weekends.wins++;
      weekends.profit += profit;
      if (is094) {
          weekends.total_094++;
          if (!isWin) weekends.loss_094++;
      }
    } else if (isBusinessHour) {
      weekdaysBusiness.total++;
      if (isWin) weekdaysBusiness.wins++;
      weekdaysBusiness.profit += profit;
      if (is094) {
          weekdaysBusiness.total_094++;
          if (!isWin) weekdaysBusiness.loss_094++;
      }
    } else {
      weekdaysOffPeak.total++;
      if (isWin) weekdaysOffPeak.wins++;
      weekdaysOffPeak.profit += profit;
      if (is094) {
          weekdaysOffPeak.total_094++;
          if (!isWin) weekdaysOffPeak.loss_094++;
      }
    }
  });

  const printStats = (name, stats) => {
    const winRate = stats.total > 0 ? (stats.wins / stats.total * 100).toFixed(2) : 0;
    const lossRate094 = stats.total_094 > 0 ? (stats.loss_094 / stats.total_094 * 100).toFixed(2) : 0;
    console.log(`--- ${name} ---`);
    console.log(`Total Operations: ${stats.total}`);
    console.log(`Wins: ${stats.wins}`);
    console.log(`Win Rate: ${winRate}%`);
    console.log(`Martingale ($0.94) Loss Rate: ${stats.loss_094}/${stats.total_094} (${lossRate094}%)`);
    console.log(`Net Profit: $${stats.profit.toFixed(2)}`);
    console.log();
  };

  printStats('Weekdays (08:00 - 17:59)', weekdaysBusiness);
  printStats('Weekdays (18:00 - 07:59)', weekdaysOffPeak);
  printStats('Weekends (All Day)', weekends);
}

analyze();
