import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Pedido } from '@/types';

interface UsePedidosParams {
  pizzariaId?: string | null;
  filterStatus?: string;
  filterCanal?: string;
  search?: string;
  limit?: number;
}

export function usePedidos({
  pizzariaId,
  filterStatus = 'all',
  filterCanal = 'all',
  search = '',
  limit = 50,
}: UsePedidosParams = {}) {
  return useQuery({
    queryKey: ['pedidos', pizzariaId, filterStatus, filterCanal, search, limit],
    queryFn: async (): Promise<Pedido[]> => {
      let q = supabase
        .from('pedido')
        .select('*, itens:pedido_item(*)')
        .order('created_at_origem', { ascending: false })
        .limit(limit);

      if (pizzariaId) q = q.eq('pizzaria_id', pizzariaId);
      if (filterStatus !== 'all') q = q.eq('status', filterStatus);
      if (filterCanal !== 'all') q = q.eq('canal', filterCanal);
      if (search.trim()) {
        const s = search.trim();
        q = q.or(`pedido_externo_id.ilike.%${s}%,cliente_nome.ilike.%${s}%,external_key.ilike.%${s}%`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Pedido[];
    },
    staleTime: 30 * 1000,
  });
}

export function usePedidosHoje(pizzariaId?: string | null) {
  const hoje = new Date().toISOString().split('T')[0];
  return useQuery({
    queryKey: ['pedidos-hoje', pizzariaId, hoje],
    queryFn: async (): Promise<Pedido[]> => {
      let q = supabase
        .from('pedido')
        .select('*')
        .gte('created_at_origem', `${hoje}T00:00:00`)
        .lte('created_at_origem', `${hoje}T23:59:59`);

      if (pizzariaId) q = q.eq('pizzaria_id', pizzariaId);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Pedido[];
    },
    staleTime: 60 * 1000,
  });
}
