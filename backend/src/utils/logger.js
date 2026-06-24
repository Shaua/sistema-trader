const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
const logFile = path.join(logDir, 'app.log');

// Keep references to original console methods
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

function formatArgs(args) {
  return args.map(a => {
    if (typeof a === 'object') {
      try {
        return JSON.stringify(a);
      } catch (e) {
        return String(a);
      }
    }
    return String(a);
  }).join(' ');
}

function writeLog(level, args) {
  const message = formatArgs(args);
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [${level}] ${message}\n`;
  
  fs.appendFile(logFile, logLine, (err) => {
    if (err) originalError('Erro ao escrever no log', err);
  });
}

// Override console methods
console.log = function(...args) {
  writeLog('INFO', args);
  originalLog.apply(console, args);
};

console.error = function(...args) {
  writeLog('ERROR', args);
  originalError.apply(console, args);
};

console.warn = function(...args) {
  writeLog('WARN', args);
  originalWarn.apply(console, args);
};

module.exports = {
  getLogs: () => {
    if (!fs.existsSync(logFile)) return [];
    try {
      const content = fs.readFileSync(logFile, 'utf8');
      return content.split('\n').filter(line => line.trim() !== '');
    } catch (e) {
      return [`[ERROR] Falha ao ler arquivo de logs: ${e.message}`];
    }
  }
};
