// src/hooks/integracoes/useEnqueueSyncJob.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EnqueueSyncJobInput {
  credencial_id: string;
  pizzaria_id: string;
  periodo_inicio: string; // YYYY-MM-DD
  periodo_fim: string;
}

export function useEnqueueSyncJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: EnqueueSyncJobInput) => {
      const { data: existing } = await supabase
        .from('sync_job')
        .select('id')
        .eq('credencial_id', input.credencial_id)
        .in('status', ['queued', 'running'])
        .limit(1);
      if (existing && existing.length > 0) {
        throw new Error('Já existe sync em andamento pra essa credencial');
      }
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('sync_job')
        .insert({
          credencial_id: input.credencial_id,
          pizzaria_id: input.pizzaria_id,
          periodo_inicio: input.periodo_inicio,
          periodo_fim: input.periodo_fim,
          status: 'queued',
          created_by: userData?.user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sync-jobs'] }),
  });
}
