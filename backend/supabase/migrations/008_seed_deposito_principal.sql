-- Garante 1 Depósito Principal ativo para cada pizzaria que ainda não tem
-- depósito cadastrado. Pré-requisito para a digitação de nota de compra:
-- o item da nota exige deposito_id (FK NOT NULL), e o select da UI precisa
-- de pelo menos uma opção por pizzaria.
INSERT INTO public.deposito (pizzaria_id, nome, tipo, ativo)
SELECT p.id, 'Depósito Principal', 'principal'::deposito_tipo, true
FROM public.pizzaria p
WHERE NOT EXISTS (
  SELECT 1 FROM public.deposito d WHERE d.pizzaria_id = p.id
);
