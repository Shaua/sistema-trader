/**
 * Simulador Monte Carlo Baseado em Ticks
 * Com Escudos Ativos (Super Sniper, Radares, Ghost Mode, Cooldowns)
 */

const params = {
    iterations: 1000, 
    maxTicksPerSession: 20000,
    payout: 0.1714,
    targetProfit: 0.33,
    stopLoss: 15.0,
    initialStake: 0.35,
    maxMartingale: 3,
    martingaleMultiplier: 2.7,
    targetLosses: 4 // Super Sniper
};

console.log('=== Iniciando Simulação Monte Carlo por Ticks (Com Escudos) ===');
console.log('Parâmetros: ', JSON.stringify(params, null, 2));
console.log('=================================================================\n');

let successCount = 0;
let failCount = 0;
let totalProfit = 0;
let maxDrawdownOverall = 0;

let totalTradesTaken = 0;

// Função para gerar ticks simulando o mercado real (0 a 9)
function generateNextTick() {
    return Math.floor(Math.random() * 10);
}

for (let iter = 0; iter < params.iterations; iter++) {
    let balance = 0;
    let currentStake = params.initialStake;
    let martingaleLevel = 0;
    let maxDrawdown = 0;
    let guaranteedFloor = 0;
    
    // Estado do Robô
    let recentDigits = [];
    let cooldownTicks = 0;
    let virtualLossCount = 0;
    let ghostMode = false;
    let ghostEntryWait = false;
    let ghostConsecutiveWins = 0;
    let consecutiveWins = 0;
    
    // Estado de Trade
    let isTrading = false;
    
    let isSessionActive = true;
    let tickCount = 0;
    
    while (isSessionActive && tickCount < params.maxTicksPerSession) {
        tickCount++;
        
        const currentTick = generateNextTick();
        
        recentDigits.push(currentTick);
        if (recentDigits.length > 100) {
            recentDigits.shift();
        }
        
        // --- Resolução de Trade Pendente (Duração = 1 tick) ---
        if (isTrading) {
            totalTradesTaken++;
            isTrading = false; // Fecha a operação
            const won = currentTick < 8; // DIGITUNDER 8 ganha com 0-7
            
            if (won) {
                const profit = currentStake * params.payout;
                balance += profit;
                
                // Reset após vitória
                currentStake = params.initialStake;
                martingaleLevel = 0;
                consecutiveWins++;
                
                // Win-streak Breaker
                if (consecutiveWins >= 12) {
                    cooldownTicks = 30;
                    consecutiveWins = 0;
                }
            } else {
                balance -= currentStake;
                consecutiveWins = 0;
                
                // Aplicar Escudos após o Loss
                cooldownTicks = 25; // Cooldown padrão do Super Sniper após loss
                ghostMode = true;
                ghostEntryWait = false;
                
                martingaleLevel++;
                if (martingaleLevel > params.maxMartingale) {
                    currentStake = params.initialStake;
                    martingaleLevel = 0;
                    cooldownTicks = 60; // Pausa pesada se bater o limite
                } else {
                    currentStake = currentStake * params.martingaleMultiplier;
                }
            }
            
            // Check Drawdown
            if (balance < maxDrawdown) {
                maxDrawdown = balance;
            }
            
            // Trailing Stop
            if (params.targetProfit > 0) {
                if (balance >= params.targetProfit * 0.9 && guaranteedFloor < params.targetProfit * 0.6) {
                    guaranteedFloor = params.targetProfit * 0.6;
                } else if (balance >= params.targetProfit * 0.7 && guaranteedFloor < params.targetProfit * 0.3) {
                    guaranteedFloor = params.targetProfit * 0.3;
                }
            }
            
            // Verificações de parada de sessão
            if (balance >= params.targetProfit) {
                successCount++;
                isSessionActive = false;
                break;
            } else if (balance <= -params.stopLoss) {
                failCount++;
                isSessionActive = false;
                break;
            } else if (guaranteedFloor > 0 && balance < guaranteedFloor && balance > 0) {
                successCount++;
                isSessionActive = false;
                break;
            }
            
            continue; // Pula a análise do tick atual pois ele serviu apenas para fechar o trade
        }
        
        // --- Aplicação dos Escudos do Robô (Fase de Leitura) ---
        
        if (cooldownTicks > 0) {
            cooldownTicks--;
            continue; // Ignora o mercado
        }
        
        // 1. Radar de Ondas (50/100)
        let blockedByRadar = false;
        if (recentDigits.length >= 50) {
            const last50 = recentDigits.slice(-50);
            const high50 = last50.filter(d => d === 8 || d === 9).length;
            const high100 = recentDigits.length === 100 ? recentDigits.filter(d => d === 8 || d === 9).length : 0;
            
            if (high50 >= 15 || high100 >= 26) {
                virtualLossCount = 0;
                blockedByRadar = true;
            }
        }
        
        // 2. Radar de Micro-Ondas (10)
        if (!blockedByRadar && recentDigits.length >= 10) {
            const last10 = recentDigits.slice(-10);
            const high10 = last10.filter(d => d === 8 || d === 9).length;
            const allowedMicroLosses = Math.max(2, params.targetLosses + 1); // No Super Sniper = 5
            
            if (high10 > allowedMicroLosses) {
                virtualLossCount = 0;
                blockedByRadar = true;
            }
        }
        
        if (blockedByRadar) {
            continue;
        }
        
        // 3. Ghost Mode
        if (ghostEntryWait) {
            ghostEntryWait = false; // Consome a tentativa do Ghost Trade
            const isGhostLoss = currentTick === 8 || currentTick === 9;
            
            if (!isGhostLoss) {
                ghostConsecutiveWins++;
                if (ghostConsecutiveWins >= 2) {
                    // Confirmação de mercado bom
                    ghostMode = false;
                    virtualLossCount = 0;
                    ghostConsecutiveWins = 0;
                }
            } else {
                // Mercado continua ruim
                ghostConsecutiveWins = 0;
                virtualLossCount = 0;
            }
            continue;
        }
        
        // 4. Lógica Base de Entrada (Super Sniper)
        const isVirtualLoss = currentTick === 8 || currentTick === 9;
        
        if (isVirtualLoss) {
            virtualLossCount++;
            if (virtualLossCount >= params.targetLosses) {
                virtualLossCount = 0; // Reset
                
                if (ghostMode) {
                    ghostEntryWait = true;
                } else {
                    isTrading = true; // Entra na operação no próximo tick
                }
            }
        } else {
            // Modo Consecutivo: se vier dígito bom, zera a contagem
            if (virtualLossCount > 0) {
                virtualLossCount = 0;
            }
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
const avgTradesPerSession = (totalTradesTaken / params.iterations).toFixed(1);

console.log('=== Resultados da Simulação (Mercado Natural + Escudos) ===');
console.log(`Total de Sessões Simuladas: ${params.iterations}`);
console.log(`Sucesso (Bateu a Meta): ${successCount} (${successRate}%)`);
console.log(`Falha (Bateu Stop Loss): ${failCount} (${failRate}%)`);
console.log(`Lucro Médio por Sessão: $${averageProfit}`);
console.log(`Drawdown Máximo Observado: -$${maxDrawdownOverall.toFixed(2)}`);
console.log(`Média de Trades Reais por Sessão: ${avgTradesPerSession}`);
console.log('===========================================================');
