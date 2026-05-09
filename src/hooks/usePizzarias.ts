import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Pizzaria } from '@/types';

export function usePizzarias() {
  return useQuery({
    queryKey: ['pizzarias'],
    queryFn: async (): Promise<Pizzaria[]> => {
      const { data, error } = await supabase
        .from('pizzaria')
        .select('*')
        .eq('status', 'ativo')
        .order('nome');
      if (error) throw error;
      return (data ?? []) as Pizzaria[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
