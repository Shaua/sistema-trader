-- Migração para adicionar suporte a notificações do Telegram

ALTER TABLE user_profiles
ADD COLUMN telegram_bot_token TEXT,
ADD COLUMN telegram_chat_id TEXT;
