import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ProdutoEstoque } from '@/types';

export interface UpsertProdutoInput {
  id?: string;
  pizzaria_id: string | null; // null = compartilhado entre todas
  sku?: string | null;
  nome: string;
  unidade?: string;
  categoria?: string | null;
  estoque_minimo?: number;
  controla_lote?: boolean;
  controla_validade?: boolean;
  ativo?: boolean;
}

export function useUpsertProdutoEstoque() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpsertProdutoInput): Promise<ProdutoEstoque> => {
      const payload = {
        ...(input.id ? { id: input.id } : {}),
        pizzaria_id: input.pizzaria_id,
        sku: input.sku ?? null,
        nome: input.nome,
        unidade: input.unidade ?? 'un',
        categoria: input.categoria ?? null,
        estoque_minimo: input.estoque_minimo ?? 0,
        controla_lote: input.controla_lote ?? false,
        controla_validade: input.controla_validade ?? false,
        ativo: input.ativo ?? true,
      };
      const { data, error } = await supabase
        .from('produto_estoque')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();
      if (error) throw error;
      return data as ProdutoEstoque;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['produtos-estoque'] }),
  });
}
