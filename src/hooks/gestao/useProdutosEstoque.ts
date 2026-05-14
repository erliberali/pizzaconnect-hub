import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ProdutoEstoque } from '@/types';

export function useProdutosEstoque(pizzariaId?: string | null) {
  return useQuery({
    queryKey: ['produtos-estoque', pizzariaId ?? 'all'],
    queryFn: async (): Promise<ProdutoEstoque[]> => {
      // pizzariaId NULL (consolidado) retorna tudo.
      // pizzariaId específico retorna os daquela pizzaria + os compartilhados (NULL).
      let q = supabase.from('produto_estoque').select('*').order('nome');
      if (pizzariaId) {
        q = q.or(`pizzaria_id.eq.${pizzariaId},pizzaria_id.is.null`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ProdutoEstoque[];
    },
    staleTime: 30 * 1000,
  });
}
