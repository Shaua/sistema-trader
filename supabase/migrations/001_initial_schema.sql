-- ============================================================
-- SISTEMA DE GESTÃO DE BANCA DERIV
-- Schema Inicial v1.0
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABELA: user_profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'trader' CHECK (role IN ('admin', 'trader')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: bank_configs
-- ============================================================
CREATE TABLE IF NOT EXISTS bank_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  trader_name TEXT NOT NULL,
  broker TEXT NOT NULL DEFAULT 'Deriv',
  account_type TEXT NOT NULL DEFAULT 'real' CHECK (account_type IN ('demo', 'real')),
  initial_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  current_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'BRL', 'EUR')),
  operational_profile TEXT NOT NULL DEFAULT 'moderado' CHECK (operational_profile IN ('conservador', 'moderado', 'arrojado', 'agressivo')),
  daily_goal_pct NUMERIC(5,2) NOT NULL DEFAULT 2.0,
  weekly_goal_pct NUMERIC(5,2) NOT NULL DEFAULT 10.0,
  monthly_goal_pct NUMERIC(5,2) NOT NULL DEFAULT 40.0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: risk_configs
-- ============================================================
CREATE TABLE IF NOT EXISTS risk_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  risk_per_operation_pct NUMERIC(5,2) NOT NULL DEFAULT 2.0,
  daily_stop_loss_pct NUMERIC(5,2) NOT NULL DEFAULT 5.0,
  daily_stop_gain_pct NUMERIC(5,2) NOT NULL DEFAULT 10.0,
  weekly_stop_loss_pct NUMERIC(5,2) NOT NULL DEFAULT 10.0,
  weekly_stop_gain_pct NUMERIC(5,2) NOT NULL DEFAULT 20.0,
  monthly_stop_loss_pct NUMERIC(5,2) NOT NULL DEFAULT 20.0,
  monthly_stop_gain_pct NUMERIC(5,2) NOT NULL DEFAULT 60.0,
  max_daily_operations INTEGER NOT NULL DEFAULT 10,
  block_on_stop BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: operations (Diário Operacional)
-- ============================================================
CREATE TABLE IF NOT EXISTS operations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  operation_date DATE NOT NULL,
  operation_time TIME NOT NULL,
  asset TEXT NOT NULL,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('CALL', 'PUT')),
  entry_value NUMERIC(15,2) NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('WIN', 'LOSS')),
  profit_loss NUMERIC(15,2) NOT NULL,
  roi_pct NUMERIC(10,4),
  observations TEXT,
  print_url TEXT,
  balance_after NUMERIC(15,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: withdrawals (Saques)
-- ============================================================
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  withdrawal_date DATE NOT NULL,
  gross_amount NUMERIC(15,2) NOT NULL,
  dollar_rate NUMERIC(10,4),
  fee_pct NUMERIC(5,2) DEFAULT 0,
  fee_amount NUMERIC(15,2) DEFAULT 0,
  net_amount NUMERIC(15,2) NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('PIX', 'Cripto', 'Transferência')),
  observations TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: deposits (Depósitos)
-- ============================================================
CREATE TABLE IF NOT EXISTS deposits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  deposit_date DATE NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('PIX', 'Cripto', 'Transferência')),
  observations TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: risk_events (Histórico de Eventos de Risco)
-- ============================================================
CREATE TABLE IF NOT EXISTS risk_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'daily_stop_loss', 'daily_stop_gain',
    'weekly_stop_loss', 'weekly_stop_gain',
    'monthly_stop_loss', 'monthly_stop_gain',
    'max_operations', 'overtrading',
    'consecutive_losses', 'risk_alert'
  )),
  description TEXT NOT NULL,
  trigger_value NUMERIC(15,2),
  limit_value NUMERIC(15,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: daily_summaries (Cache de Estatísticas Diárias)
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  summary_date DATE NOT NULL,
  total_operations INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  total_invested NUMERIC(15,2) DEFAULT 0,
  gross_profit NUMERIC(15,2) DEFAULT 0,
  gross_loss NUMERIC(15,2) DEFAULT 0,
  net_result NUMERIC(15,2) DEFAULT 0,
  win_rate NUMERIC(5,2) DEFAULT 0,
  opening_balance NUMERIC(15,2) DEFAULT 0,
  closing_balance NUMERIC(15,2) DEFAULT 0,
  day_roi_pct NUMERIC(10,4) DEFAULT 0,
  is_positive BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, summary_date)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_operations_user_date ON operations(user_id, operation_date);
CREATE INDEX IF NOT EXISTS idx_operations_user_result ON operations(user_id, result);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_date ON withdrawals(user_id, withdrawal_date);
CREATE INDEX IF NOT EXISTS idx_deposits_user_date ON deposits(user_id, deposit_date);
CREATE INDEX IF NOT EXISTS idx_daily_summaries_user_date ON daily_summaries(user_id, summary_date);
CREATE INDEX IF NOT EXISTS idx_risk_events_user_date ON risk_events(user_id, event_date);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;

-- Políticas: usuário vê apenas seus próprios dados
CREATE POLICY "Users can view own profile" ON user_profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can manage own bank config" ON bank_configs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own risk config" ON risk_configs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own operations" ON operations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own withdrawals" ON withdrawals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own deposits" ON deposits FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own risk events" ON risk_events FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own daily summaries" ON daily_summaries FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- FUNÇÕES AUXILIARES
-- ============================================================

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bank_configs_updated_at BEFORE UPDATE ON bank_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_risk_configs_updated_at BEFORE UPDATE ON risk_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_operations_updated_at BEFORE UPDATE ON operations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_daily_summaries_updated_at BEFORE UPDATE ON daily_summaries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- FUNÇÃO: Recalcular saldo após operação
-- ============================================================
CREATE OR REPLACE FUNCTION recalculate_balance(p_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_initial NUMERIC;
  v_total_profit NUMERIC;
  v_total_deposits NUMERIC;
  v_total_withdrawals NUMERIC;
  v_current_balance NUMERIC;
BEGIN
  SELECT initial_balance INTO v_initial FROM bank_configs WHERE user_id = p_user_id AND is_active = TRUE LIMIT 1;
  SELECT COALESCE(SUM(profit_loss), 0) INTO v_total_profit FROM operations WHERE user_id = p_user_id;
  SELECT COALESCE(SUM(amount), 0) INTO v_total_deposits FROM deposits WHERE user_id = p_user_id;
  SELECT COALESCE(SUM(gross_amount), 0) INTO v_total_withdrawals FROM withdrawals WHERE user_id = p_user_id;
  
  v_current_balance := v_initial + v_total_profit + v_total_deposits - v_total_withdrawals;
  
  UPDATE bank_configs SET current_balance = v_current_balance WHERE user_id = p_user_id AND is_active = TRUE;
  
  RETURN v_current_balance;
END;
$$ LANGUAGE plpgsql;
