import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { IntegracaoCredencial } from '@/types';

export function useCredenciais(pizzariaId?: string | null) {
  return useQuery({
    queryKey: ['credenciais', pizzariaId ?? 'all'],
    queryFn: async (): Promise<IntegracaoCredencial[]> => {
      let q = supabase.from('integracao_credencial').select('*').order('created_at', { ascending: false });
      if (pizzariaId) q = (q as any).eq('pizzaria_id', pizzariaId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as IntegracaoCredencial[];
    },
    staleTime: 30 * 1000,
  });
}
