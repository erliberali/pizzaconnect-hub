import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Fornecedor } from '@/types';

export function useFornecedores(pizzariaId?: string | null) {
  return useQuery({
    queryKey: ['fornecedores', pizzariaId ?? 'all'],
    queryFn: async (): Promise<Fornecedor[]> => {
      // pizzariaId NULL (visão consolidada) retorna tudo.
      // pizzariaId específico retorna os daquela pizzaria + os compartilhados (NULL).
      let q = supabase.from('fornecedor').select('*').order('razao_social');
      if (pizzariaId) {
        q = q.or(`pizzaria_id.eq.${pizzariaId},pizzaria_id.is.null`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Fornecedor[];
    },
    staleTime: 30 * 1000,
  });
}
