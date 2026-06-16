-- Fase 3: Integração Deriv
-- Adicionar coluna para armazenar o Token da Deriv (criptografado seria ideal, mas usaremos texto claro em ambiente de desenvolvimento)
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS deriv_token text;

-- Adicionar coluna para identificar de forma única a operação vinda da corretora
-- Isso evita duplicação de dados caso a sincronização rode duas vezes
ALTER TABLE public.operations
ADD COLUMN IF NOT EXISTS transaction_id text UNIQUE;

-- Atualizar o RLS para que o usuário possa editar o seu próprio deriv_token
-- A política "Users can view own profile" e "Users can update own profile" (se existir) 
-- já cobrem essa nova coluna, pois ela faz parte da tabela user_profiles.
