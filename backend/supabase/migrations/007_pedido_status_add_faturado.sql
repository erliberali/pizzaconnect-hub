-- Adiciona 'faturado' ao enum pedido_status. O trigger trg_pedido_faturado
-- (módulo gestão, em supabase/migrations/004_gestao_triggers_views.sql) compara
-- new.status = 'faturado' e quebrava todo UPDATE em pedido porque o valor não
-- existia no enum.
ALTER TYPE public.pedido_status ADD VALUE IF NOT EXISTS 'faturado';
