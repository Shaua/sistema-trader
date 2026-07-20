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
    winRate: 80.0, // DIGITUNDER 8 tem 80% de win rate
    payout: 0.1714, // Payout médio estimado da estratégia LOW
    targetProfit: 0.33,
    stopLoss: 15.0,
    initialStake: 0.35,
    maxMartingale: 3,
    martingaleMultiplier: 2.7 // Hit and Run
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

console.log('=== Iniciando Simulação Monte Carlo (Super Sniper / Hit and Run) ===');
console.log('Parâmetros Atuais:');
console.log(JSON.stringify(params, null, 2));
console.log('====================================================================\n');

let successCount = 0;
let failCount = 0;
let totalProfit = 0;
let maxDrawdownOverall = 0;

for (let i = 0; i < params.iterations; i++) {
    let balance = 0;
    let currentStake = params.initialStake;
    let martingaleLevel = 0;
    let maxDrawdown = 0;
    let guaranteedFloor = 0; // Trailing Stop
    
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
                // Return to initial stake Se limite de martingale for atingido
                currentStake = params.initialStake;
                martingaleLevel = 0;
            } else {
                currentStake = currentStake * params.martingaleMultiplier;
            }
        }
        
        // Check Drawdown
        if (balance < maxDrawdown) {
            maxDrawdown = balance;
        }

        // Lógica de Trailing Stop / Piso Garantido (do useDerivBot.js)
        if (params.targetProfit > 0) {
            if (balance >= params.targetProfit * 0.9 && guaranteedFloor < params.targetProfit * 0.6) {
                guaranteedFloor = params.targetProfit * 0.6;
            } else if (balance >= params.targetProfit * 0.7 && guaranteedFloor < params.targetProfit * 0.3) {
                guaranteedFloor = params.targetProfit * 0.3;
            }
        }
        
        // Verificações de parada
        if (balance >= params.targetProfit) {
            successCount++;
            isSessionActive = false;
        } else if (balance <= -params.stopLoss) {
            failCount++;
            isSessionActive = false;
        } else if (guaranteedFloor > 0 && balance < guaranteedFloor && balance > 0) {
            // Saiu pelo Trailing Stop (garantiu o piso)
            successCount++; // Conta como sucesso, pois saiu no lucro garantido
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
