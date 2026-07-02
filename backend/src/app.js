require('./utils/logger'); // Start logging immediately
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const bankRoutes = require('./routes/bank');
const riskRoutes = require('./routes/risk');
const operationsRoutes = require('./routes/operations');
const withdrawalsRoutes = require('./routes/withdrawals');
const depositsRoutes = require('./routes/deposits');
const statsRoutes = require('./routes/stats');
const reportsRoutes = require('./routes/reports');
const adminRoutes = require('./routes/admin');
const derivRoutes = require('./routes/deriv');
const telegramRoutes = require('./routes/telegram');
const aiRoutes = require('./routes/ai');

const app = express();

// ============================================================
// Middlewares
// ============================================================
app.use(cors({
  origin: true, // Allow all origins (Vercel, localhost, etc)
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ============================================================
// Routes
// ============================================================
app.use('/api/auth', authRoutes);
app.use('/api/bank', bankRoutes);
app.use('/api/risk', riskRoutes);
app.use('/api/operations', operationsRoutes);
app.use('/api/withdrawals', withdrawalsRoutes);
app.use('/api/deposits', depositsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/deriv', derivRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/ai', aiRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// Root route for Railway proxy
app.get('/', (req, res) => {
  res.send('Sistema Trader API is running');
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const supabase = require('./config/supabase');
const { startRealtimeSync } = require('./services/derivRealtime');
const aiService = require('./services/ai.service');

// Inicializa a IA
aiService.init();

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Sistema Trader API rodando na porta ${PORT}`);

  try {
    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('id, deriv_token, deriv_demo_token, deriv_app_id');
      
    if (!error && profiles) {
      console.log(`[Realtime] Iniciando monitoramento para ${profiles.length} usuários...`);
      for (const p of profiles) {
        if (p.deriv_token) {
          startRealtimeSync(p.id, p.deriv_token, 'REAL', p.deriv_app_id);
        }
        if (p.deriv_demo_token) {
          startRealtimeSync(p.id, p.deriv_demo_token, 'DEMO', p.deriv_app_id);
        }
      }
    }
  } catch (err) {
    console.error('Erro ao inicializar realtime:', err.message);
  }
});

module.exports = app;
