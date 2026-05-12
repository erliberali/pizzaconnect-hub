import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SyncJob } from '@/types';

export function useSyncJobs(params: { pizzariaId?: string | null; credencialId?: string | null; limit?: number } = {}) {
  const qc = useQueryClient();
  const { pizzariaId, credencialId, limit = 50 } = params;
  const queryKey = ['sync-jobs', pizzariaId ?? 'all', credencialId ?? 'all', limit];

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<SyncJob[]> => {
      let q = supabase.from('sync_job').select('*').order('created_at', { ascending: false }).limit(limit);
      if (pizzariaId) q = (q as any).eq('pizzaria_id', pizzariaId);
      if (credencialId) q = (q as any).eq('credencial_id', credencialId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as SyncJob[];
    },
    staleTime: 5000,
  });

  useEffect(() => {
    const channel = supabase
      .channel(`sync-jobs-${pizzariaId ?? 'all'}-${credencialId ?? 'all'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sync_job' }, () => {
        qc.invalidateQueries({ queryKey });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [pizzariaId, credencialId, qc, queryKey.join(',')]);

  return query;
}
