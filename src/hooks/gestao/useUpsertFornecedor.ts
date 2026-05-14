import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Fornecedor } from '@/types';

export interface UpsertFornecedorInput {
  id?: string;
  pizzaria_id: string | null; // null = compartilhado entre todas
  razao_social: string;
  nome_fantasia?: string | null;
  cnpj?: string | null;
  contato?: string | null;
  email?: string | null;
  telefone?: string | null;
  ativo?: boolean;
}

export function useUpsertFornecedor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpsertFornecedorInput): Promise<Fornecedor> => {
      const payload = {
        ...(input.id ? { id: input.id } : {}),
        pizzaria_id: input.pizzaria_id,
        razao_social: input.razao_social,
        nome_fantasia: input.nome_fantasia ?? null,
        cnpj: input.cnpj ?? null,
        contato: input.contato ?? null,
        email: input.email ?? null,
        telefone: input.telefone ?? null,
        ativo: input.ativo ?? true,
      };
      const { data, error } = await supabase
        .from('fornecedor')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();
      if (error) throw error;
      return data as Fornecedor;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fornecedores'] }),
  });
}
