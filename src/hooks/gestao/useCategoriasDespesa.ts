import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CategoriaDespesa } from '@/types';

export function useCategoriasDespesa(pizzariaId?: string | null) {
  return useQuery({
    queryKey: ['categorias-despesa', pizzariaId ?? 'all'],
    enabled: !!pizzariaId,
    queryFn: async (): Promise<CategoriaDespesa[]> => {
      const { data, error } = await supabase
        .from('categoria_despesa')
        .select('*')
        .eq('pizzaria_id', pizzariaId!)
        .order('nome');
      if (error) throw error;
      return (data ?? []) as CategoriaDespesa[];
    },
    staleTime: 60 * 1000,
  });
}
