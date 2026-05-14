import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface IntegracoesStats {
  credenciaisAtivas: number;
  syncRodando: number;
  pedidos7d: number;
  falhas7d: number;
}

export function useIntegracoesStats(pizzariaId?: string | null) {
  return useQuery({
    queryKey: ['integracoes-stats', pizzariaId ?? 'all'],
    queryFn: async (): Promise<IntegracoesStats> => {
      const sete = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const filtroPiz = (q: any) => (pizzariaId ? q.eq('pizzaria_id', pizzariaId) : q);

      const [credR, runR, pedR, falhaR] = await Promise.all([
        filtroPiz(supabase.from('integracao_credencial').select('id', { count: 'exact', head: true }).eq('ativo', true)),
        filtroPiz(supabase.from('sync_job').select('id', { count: 'exact', head: true }).eq('status', 'running')),
        filtroPiz(supabase.from('pedido').select('id', { count: 'exact', head: true }).eq('origem', 'cardapioweb').gte('created_at', sete)),
        filtroPiz(supabase.from('sync_job').select('id', { count: 'exact', head: true }).eq('status', 'failed').gte('finished_at', sete)),
      ]);

      return {
        credenciaisAtivas: credR.count ?? 0,
        syncRodando: runR.count ?? 0,
        pedidos7d: pedR.count ?? 0,
        falhas7d: falhaR.count ?? 0,
      };
    },
    staleTime: 30 * 1000,
  });
}
