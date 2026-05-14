-- Policies de dev para o módulo de compras (fornecedor, produto, nota, etc).
-- Mesmo padrão já adotado em pizzaria/sync_job/integracao_credencial:
-- abre SELECT/INSERT/UPDATE para anon enquanto a auth real não está pronta.
-- RLS hardening por tenant/role fica como follow-up depois do Supabase Auth.

-- Fornecedor
CREATE POLICY "anon_read_fornecedor"   ON public.fornecedor   FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_fornecedor" ON public.fornecedor   FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_fornecedor" ON public.fornecedor   FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Produto de estoque
CREATE POLICY "anon_read_produto_estoque"   ON public.produto_estoque FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_produto_estoque" ON public.produto_estoque FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_produto_estoque" ON public.produto_estoque FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Depósito (read + write para futuras adições além do seed)
CREATE POLICY "anon_read_deposito"   ON public.deposito FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_deposito" ON public.deposito FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_deposito" ON public.deposito FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Categoria de despesa
CREATE POLICY "anon_read_categoria_despesa"   ON public.categoria_despesa FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_categoria_despesa" ON public.categoria_despesa FOR INSERT TO anon WITH CHECK (true);

-- Nota de compra (cabeçalho)
CREATE POLICY "anon_read_nota_compra"   ON public.nota_compra FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_nota_compra" ON public.nota_compra FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_nota_compra" ON public.nota_compra FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Itens da nota (a edição do rascunho substitui itens via delete+insert)
CREATE POLICY "anon_read_nota_compra_item"   ON public.nota_compra_item FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_nota_compra_item" ON public.nota_compra_item FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_delete_nota_compra_item" ON public.nota_compra_item FOR DELETE TO anon USING (true);

-- Conta a pagar (gerada pelo RPC; UI futura liquidará)
CREATE POLICY "anon_read_conta_pagar" ON public.conta_pagar FOR SELECT TO anon USING (true);

-- Movimento de estoque (gerado pelo trigger fn_processar_nota_lancada)
CREATE POLICY "anon_read_movimento_estoque" ON public.movimento_estoque FOR SELECT TO anon USING (true);

-- Lote (gerado pelo trigger)
CREATE POLICY "anon_read_lote" ON public.lote FOR SELECT TO anon USING (true);

-- Estoque saldo (gerado pelo trigger; UI futura vai consultar)
CREATE POLICY "anon_read_estoque_saldo" ON public.estoque_saldo FOR SELECT TO anon USING (true);
