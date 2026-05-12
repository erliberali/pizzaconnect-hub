import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { EventoIntegracao } from '@/types';

export function useEventosIntegracao(pizzariaId?: string | null, limit = 50) {
  return useQuery({
    queryKey: ['eventos-integracao', pizzariaId ?? 'all', limit],
    queryFn: async (): Promise<EventoIntegracao[]> => {
      let q = supabase.from('evento_integracao').select('*').order('received_at', { ascending: false }).limit(limit);
      if (pizzariaId) q = (q as any).eq('pizzaria_id', pizzariaId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as EventoIntegracao[];
    },
    staleTime: 30 * 1000,
  });
}
