import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AprovarNotaInput {
  id: string;
  parcelas: {
    quantidade: number;
    primeiro_vencimento: string; // YYYY-MM-DD
    intervalo_dias: number;
    categoria_id?: string | null;
    forma?: string | null; // forma_pagamento enum
  };
}

export function useAprovarNota() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AprovarNotaInput) => {
      // Trigger fn_processar_nota_lancada faz lotes + movimento de estoque +
      // custo medio quando status passa para 'lancada'.
      const { error: eUpd } = await supabase
        .from('nota_compra')
        .update({ status: 'lancada' })
        .eq('id', input.id);
      if (eUpd) throw eUpd;

      const { error: eRpc } = await supabase.rpc('fn_gerar_parcelas_nota', {
        _nota_id: input.id,
        _parcelas: input.parcelas.quantidade,
        _primeiro_vencimento: input.parcelas.primeiro_vencimento,
        _intervalo_dias: input.parcelas.intervalo_dias,
        _categoria_id: input.parcelas.categoria_id ?? null,
        _forma: input.parcelas.forma ?? null,
      });
      if (eRpc) throw eRpc;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nota_compra'] });
      qc.invalidateQueries({ queryKey: ['conta_pagar'] });
      qc.invalidateQueries({ queryKey: ['produtos-estoque'] });
    },
  });
}
