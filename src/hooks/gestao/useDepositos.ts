import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Deposito } from '@/types';

export function useDepositos(pizzariaId?: string | null) {
  return useQuery({
    queryKey: ['depositos', pizzariaId ?? 'all'],
    enabled: !!pizzariaId,
    queryFn: async (): Promise<Deposito[]> => {
      const { data, error } = await supabase
        .from('deposito')
        .select('*')
        .eq('pizzaria_id', pizzariaId!)
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return (data ?? []) as Deposito[];
    },
    staleTime: 60 * 1000,
  });
}
