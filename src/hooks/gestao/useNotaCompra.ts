import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { NotaCompra } from '@/types';

export function useNotaCompra(id?: string | null) {
  return useQuery({
    queryKey: ['nota_compra', 'single', id],
    enabled: !!id,
    queryFn: async (): Promise<NotaCompra | null> => {
      const { data, error } = await supabase
        .from('nota_compra')
        .select('*, fornecedor:fornecedor(id,razao_social), itens:nota_compra_item(*, produto:produto_estoque(id,nome,unidade))')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as NotaCompra) ?? null;
    },
    staleTime: 10 * 1000,
  });
}
