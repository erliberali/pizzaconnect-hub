// src/hooks/integracoes/useUpsertCredencial.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UpsertCredencialInput {
  id?: string;
  pizzaria_id: string;
  estabelecimento_externo_id: string;
  api_key?: string;
  ativo: boolean;
}

export function useUpsertCredencial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpsertCredencialInput) => {
      const payload: any = {
        ...(input.id ? { id: input.id } : {}),
        pizzaria_id: input.pizzaria_id,
        estabelecimento_externo_id: input.estabelecimento_externo_id,
        origem: 'cardapioweb',
        ativo: input.ativo,
      };
      if (input.api_key && input.api_key.trim().length > 0) {
        payload.api_key_encrypted = input.api_key;
      }
      const { data, error } = await supabase
        .from('integracao_credencial')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['credenciais'] }),
  });
}
