-- Fase 4: Atualização Deriv (App ID Customizado)
-- Adicionar coluna para armazenar o App ID da Deriv para uso com tokens PAT
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS deriv_app_id text;
