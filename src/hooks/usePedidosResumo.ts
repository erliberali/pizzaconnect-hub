import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UsePedidosResumoParams {
  pizzariaId?: string | null;
  filterStatus?: string;
  filterCanal?: string;
  search?: string;
  dateStart?: string;
  dateEnd?: string;
}

export interface PedidosResumo {
  count: number;
  totalLiquido: number;
}

export function usePedidosResumo({
  pizzariaId,
  filterStatus = 'all',
  filterCanal = 'all',
  search = '',
  dateStart,
  dateEnd,
}: UsePedidosResumoParams = {}) {
  return useQuery({
    queryKey: ['pedidos-resumo', pizzariaId, filterStatus, filterCanal, search, dateStart, dateEnd],
    queryFn: async (): Promise<PedidosResumo> => {
      let q = supabase
        .from('pedido')
        .select('total_liquido', { count: 'exact' });

      if (pizzariaId) q = q.eq('pizzaria_id', pizzariaId);
      if (filterStatus !== 'all') q = q.eq('status', filterStatus);
      if (filterCanal !== 'all') q = q.eq('canal', filterCanal);
      if (dateStart) q = q.gte('created_at_origem', `${dateStart}T00:00:00-03:00`);
      if (dateEnd) q = q.lte('created_at_origem', `${dateEnd}T23:59:59-03:00`);
      if (search.trim()) {
        const s = search.trim();
        q = q.or(`pedido_externo_id.ilike.%${s}%,cliente_nome.ilike.%${s}%,external_key.ilike.%${s}%`);
      }

      const { data, count, error } = await q;
      if (error) throw error;

      const totalLiquido = (data ?? []).reduce(
        (acc, row) => acc + Number((row as { total_liquido: number | string }).total_liquido ?? 0),
        0,
      );

      return { count: count ?? 0, totalLiquido };
    },
    staleTime: 30 * 1000,
  });
}
