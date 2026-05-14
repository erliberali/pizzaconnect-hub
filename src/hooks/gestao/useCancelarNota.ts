import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useCancelarNota() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Sem reversão de estoque nesta versão: só permite cancelar rascunhos.
      const { data: atual, error: eGet } = await supabase
        .from('nota_compra')
        .select('status')
        .eq('id', id)
        .single();
      if (eGet) throw eGet;
      if (atual.status !== 'rascunho') {
        throw new Error('Apenas notas em rascunho podem ser canceladas.');
      }
      const { error } = await supabase
        .from('nota_compra')
        .update({ status: 'cancelada' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nota_compra'] }),
  });
}
