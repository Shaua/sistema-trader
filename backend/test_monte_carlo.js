/**
 * Monte Carlo Simulation for Deriv Bot
 * 
 * Este script roda N simulações baseadas nas configurações do robô
 * para estimar a probabilidade de sucesso (Target Profit) versus
 * a probabilidade de falência (Stop Loss).
 * 
 * Uso:
 * node test_monte_carlo.js --iterations 10000 --winRate 50 --payout 0.94 --targetProfit 5.0 --stopLoss 15.0 --initialStake 0.35 --maxMartingale 4
 */

const args = process.argv.slice(2);
const params = {
    iterations: 10000,
    winRate: 50.0,
    payout: 0.94,
    targetProfit: 5.0,
    stopLoss: 15.0,
    initialStake: 0.35,
    maxMartingale: 4
};

// Simple argument parser
for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
        const key = args[i].replace('--', '');
        if (params[key] !== undefined && args[i + 1]) {
            params[key] = parseFloat(args[i + 1]);
            i++;
        }
    }
}

console.log('=== Iniciando Simulação Monte Carlo ===');
console.log('Parâmetros Atuais:');
console.log(JSON.stringify(params, null, 2));
console.log('=======================================\n');

let successCount = 0;
let failCount = 0;
let totalProfit = 0;
let maxDrawdownOverall = 0;

for (let i = 0; i < params.iterations; i++) {
    let balance = 0;
    let currentStake = params.initialStake;
    let martingaleLevel = 0;
    let maxDrawdown = 0;
    
    let isSessionActive = true;
    
    while (isSessionActive) {
        // Simular Trade
        const isWin = (Math.random() * 100) <= params.winRate;
        
        if (isWin) {
            const profit = currentStake * params.payout;
            balance += profit;
            
            // Reset Martingale
            currentStake = params.initialStake;
            martingaleLevel = 0;
        } else {
            balance -= currentStake;
            
            // Increment Martingale
            martingaleLevel++;
            if (martingaleLevel > params.maxMartingale) {
                // Return to initial stake Se limite de martingale for atingido, assumimos perda pesada e reseta
                currentStake = params.initialStake;
                martingaleLevel = 0;
            } else {
                currentStake = currentStake * 2; // Multiplicador básico de Martingale (pode ser ajustado)
            }
        }
        
        // Check Drawdown
        if (balance < maxDrawdown) {
            maxDrawdown = balance;
        }
        
        // Verificações de parada
        if (balance >= params.targetProfit) {
            successCount++;
            isSessionActive = false;
        } else if (balance <= -params.stopLoss) {
            failCount++;
            isSessionActive = false;
        }
    }
    
    totalProfit += balance;
    if (Math.abs(maxDrawdown) > maxDrawdownOverall) {
        maxDrawdownOverall = Math.abs(maxDrawdown);
    }
}

const successRate = ((successCount / params.iterations) * 100).toFixed(2);
const failRate = ((failCount / params.iterations) * 100).toFixed(2);
const averageProfit = (totalProfit / params.iterations).toFixed(2);

console.log('=== Resultados da Simulação ===');
console.log(`Total de Iterações: ${params.iterations}`);
console.log(`Sessões com Sucesso (Bateu a Meta): ${successCount} (${successRate}%)`);
console.log(`Sessões com Falha (Stop Loss): ${failCount} (${failRate}%)`);
console.log(`Lucro Médio por Sessão: $${averageProfit}`);
console.log(`Drawdown Máximo Observado (Worst Case): -$${maxDrawdownOverall.toFixed(2)}`);
console.log('===============================');
