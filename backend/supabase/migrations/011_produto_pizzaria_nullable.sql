-- Produto de estoque passa a poder ser compartilhado entre pizzarias.
-- Convenção: pizzaria_id IS NULL → "Ambas" (visível para todas).
-- O custo médio (produto_estoque.custo_medio) é global ao produto, então um
-- produto "Ambas" terá custo médio agregado das compras das duas pizzarias.
-- Se isso virar problema, separar custo por pizzaria fica como follow-up.
ALTER TABLE public.produto_estoque ALTER COLUMN pizzaria_id DROP NOT NULL;
