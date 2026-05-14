import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { NotaCompra, NotaCompraStatus } from '@/types';

interface Params {
  pizzariaId?: string | null;
  status?: NotaCompraStatus | 'all';
  fornecedorId?: string | null;
  dateStart?: string;
  dateEnd?: string;
  limit?: number;
}

export function useNotasCompra({
  pizzariaId,
  status = 'all',
  fornecedorId,
  dateStart,
  dateEnd,
  limit = 100,
}: Params = {}) {
  return useQuery({
    queryKey: ['nota_compra', pizzariaId, status, fornecedorId, dateStart, dateEnd, limit],
    queryFn: async (): Promise<NotaCompra[]> => {
      let q = supabase
        .from('nota_compra')
        .select('*, fornecedor:fornecedor(id,razao_social)')
        .order('data_emissao', { ascending: false })
        .limit(limit);
      if (pizzariaId) q = q.eq('pizzaria_id', pizzariaId);
      if (status !== 'all') q = q.eq('status', status);
      if (fornecedorId) q = q.eq('fornecedor_id', fornecedorId);
      if (dateStart) q = q.gte('data_emissao', dateStart);
      if (dateEnd) q = q.lte('data_emissao', dateEnd);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as NotaCompra[];
    },
    staleTime: 30 * 1000,
  });
}
