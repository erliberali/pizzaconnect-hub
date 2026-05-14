-- Policies de dev para integracao_credencial e evento_integracao, seguindo o
-- padrão já usado em pizzaria/sync_job/pedido (anon com USING/WITH CHECK true).
-- RLS hardening (escopo por tenant/role) fica documentado como follow-up.

CREATE POLICY "anon_read_integracao_credencial"
  ON public.integracao_credencial
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "anon_insert_integracao_credencial"
  ON public.integracao_credencial
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "anon_update_integracao_credencial"
  ON public.integracao_credencial
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "anon_read_evento_integracao"
  ON public.evento_integracao
  FOR SELECT
  TO anon
  USING (true);
