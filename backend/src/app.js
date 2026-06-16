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

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Sistema Trader API rodando na porta ${PORT}`);
});

module.exports = app;
