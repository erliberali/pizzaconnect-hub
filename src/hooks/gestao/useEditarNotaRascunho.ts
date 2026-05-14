import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ItemRascunho } from './useCriarNotaRascunho';

export interface EditarNotaRascunhoInput {
  id: string;
  fornecedor_id: string;
  numero: string;
  serie?: string | null;
  data_emissao: string;
  data_entrada?: string;
  valor_total: number;
  valor_frete?: number;
  valor_desconto?: number;
  observacao?: string | null;
  itens: ItemRascunho[];
}

export function useEditarNotaRascunho() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: EditarNotaRascunhoInput) => {
      // Confere status atual — só rascunho pode ser editado.
      const { data: atual, error: eGet } = await supabase
        .from('nota_compra')
        .select('status')
        .eq('id', input.id)
        .single();
      if (eGet) throw eGet;
      if (atual.status !== 'rascunho') {
        throw new Error('Apenas notas em rascunho podem ser editadas.');
      }

      const { error: eUpd } = await supabase
        .from('nota_compra')
        .update({
          fornecedor_id: input.fornecedor_id,
          numero: input.numero,
          serie: input.serie ?? null,
          data_emissao: input.data_emissao,
          data_entrada: input.data_entrada ?? new Date().toISOString().slice(0, 10),
          valor_total: input.valor_total,
          valor_frete: input.valor_frete ?? 0,
          valor_desconto: input.valor_desconto ?? 0,
          observacao: input.observacao ?? null,
        })
        .eq('id', input.id);
      if (eUpd) throw eUpd;

      const { error: eDel } = await supabase.from('nota_compra_item').delete().eq('nota_id', input.id);
      if (eDel) throw eDel;

      if (input.itens.length > 0) {
        const itens = input.itens.map((i) => ({
          nota_id: input.id,
          produto_id: i.produto_id,
          deposito_id: i.deposito_id,
          quantidade: i.quantidade,
          custo_unitario: i.custo_unitario,
          lote_numero: i.lote_numero ?? null,
          validade: i.validade ?? null,
        }));
        const { error: eIns } = await supabase.from('nota_compra_item').insert(itens);
        if (eIns) throw eIns;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nota_compra'] });
    },
  });
}
