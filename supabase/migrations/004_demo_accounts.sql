-- 004_demo_accounts.sql
-- Adiciona suporte a múltiplas contas (REAL e DEMO)

-- Atualiza tabela de perfis de usuário
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS deriv_demo_token TEXT,
ADD COLUMN IF NOT EXISTS active_account_type TEXT DEFAULT 'REAL';

-- Atualiza tabelas de operações e configurações para suportar chave de conta
ALTER TABLE public.operations 
ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'REAL';

ALTER TABLE public.bank_configs 
ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'REAL';

ALTER TABLE public.risk_configs 
ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'REAL';

-- Ajustar a RLS para permitir atualização dessas novas colunas
-- (Normalmente já cobertas pelas políticas existentes que permitem update no próprio registro)
