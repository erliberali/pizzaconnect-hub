import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { NotaCompra } from '@/types';

export interface ItemRascunho {
  produto_id: string;
  deposito_id: string;
  quantidade: number;
  custo_unitario: number;
  lote_numero?: string | null;
  validade?: string | null;
}

export interface CriarNotaRascunhoInput {
  pizzaria_id: string;
  fornecedor_id: string;
  numero: string;
  serie?: string | null;
  data_emissao: string; // YYYY-MM-DD
  data_entrada?: string;
  valor_total: number;
  valor_frete?: number;
  valor_desconto?: number;
  observacao?: string | null;
  usuario_id?: string | null;
  itens: ItemRascunho[];
}

export function useCriarNotaRascunho() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CriarNotaRascunhoInput): Promise<NotaCompra> => {
      const { data: nota, error: e1 } = await supabase
        .from('nota_compra')
        .insert({
          pizzaria_id: input.pizzaria_id,
          fornecedor_id: input.fornecedor_id,
          numero: input.numero,
          serie: input.serie ?? null,
          data_emissao: input.data_emissao,
          data_entrada: input.data_entrada ?? new Date().toISOString().slice(0, 10),
          valor_total: input.valor_total,
          valor_frete: input.valor_frete ?? 0,
          valor_desconto: input.valor_desconto ?? 0,
          observacao: input.observacao ?? null,
          usuario_id: input.usuario_id ?? null,
          status: 'rascunho',
        })
        .select()
        .single();
      if (e1) throw e1;

      if (input.itens.length > 0) {
        const itens = input.itens.map((i) => ({
          nota_id: nota.id,
          produto_id: i.produto_id,
          deposito_id: i.deposito_id,
          quantidade: i.quantidade,
          custo_unitario: i.custo_unitario,
          lote_numero: i.lote_numero ?? null,
          validade: i.validade ?? null,
        }));
        const { error: e2 } = await supabase.from('nota_compra_item').insert(itens);
        if (e2) throw e2;
      }
      return nota as NotaCompra;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nota_compra'] });
    },
  });
}
