-- Fornecedor passa a poder ser compartilhado entre pizzarias.
-- Convenção: pizzaria_id IS NULL → "Ambas" (visível para todas as pizzarias).
-- A unique (pizzaria_id, cnpj) continua válida (PG considera NULL distinto, então
-- não impede múltiplas linhas com pizzaria_id NULL ainda que com mesmo CNPJ —
-- mas isso é aceitável neste estágio; o cadastro de "Ambas" com mesmo CNPJ
-- duplicado é responsabilidade da UI).
ALTER TABLE public.fornecedor ALTER COLUMN pizzaria_id DROP NOT NULL;
