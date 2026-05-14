import { useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useFornecedores } from '@/hooks/gestao/useFornecedores';
import { useProdutosEstoque } from '@/hooks/gestao/useProdutosEstoque';
import { useDepositos } from '@/hooks/gestao/useDepositos';
import { useCategoriasDespesa } from '@/hooks/gestao/useCategoriasDespesa';
import { useCriarNotaRascunho } from '@/hooks/gestao/useCriarNotaRascunho';
import { useEditarNotaRascunho } from '@/hooks/gestao/useEditarNotaRascunho';
import { useAprovarNota } from '@/hooks/gestao/useAprovarNota';
import { useCancelarNota } from '@/hooks/gestao/useCancelarNota';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Trash2 } from 'lucide-react';
import type { NotaCompra } from '@/types';

const itemSchema = z.object({
  produto_id: z.string().min(1, 'Produto'),
  deposito_id: z.string().min(1, 'Depósito'),
  quantidade: z.coerce.number().positive('Qtd > 0'),
  custo_unitario: z.coerce.number().nonnegative('Custo ≥ 0'),
  lote_numero: z.string().optional(),
  validade: z.string().optional(),
});

const schema = z
  .object({
    fornecedor_id: z.string().min(1, 'Selecione um fornecedor'),
    numero: z.string().min(1, 'Informe o número'),
    serie: z.string().optional(),
    data_emissao: z.string().min(1, 'Informe a data de emissão'),
    data_entrada: z.string().min(1, 'Informe a data de entrada'),
    valor_frete: z.coerce.number().nonnegative().default(0),
    valor_desconto: z.coerce.number().nonnegative().default(0),
    observacao: z.string().optional(),
    itens: z.array(itemSchema).min(1, 'Adicione ao menos 1 item'),
    parcelas_quantidade: z.coerce.number().int().min(1, 'Pelo menos 1 parcela').max(60),
    primeiro_vencimento: z.string().min(1, 'Informe o vencimento'),
    intervalo_dias: z.coerce.number().int().min(1, 'Intervalo ≥ 1').default(30),
    categoria_id: z.string().optional(),
    forma_pagamento: z.string().optional(),
  })
  .refine((v) => v.primeiro_vencimento >= v.data_emissao, {
    message: 'Primeiro vencimento deve ser >= data de emissão',
    path: ['primeiro_vencimento'],
  });

type FormValues = z.infer<typeof schema>;

const FORMAS = ['dinheiro', 'pix', 'credito', 'debito', 'boleto', 'transferencia', 'outro'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nota?: NotaCompra | null; // se vier, é edição/visualização
  pizzariaId: string | null;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export function NotaCompraDialog({ open, onOpenChange, nota, pizzariaId }: Props) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: fornecedores = [] } = useFornecedores(pizzariaId);
  const { data: produtos = [] } = useProdutosEstoque(pizzariaId);
  const { data: depositos = [] } = useDepositos(pizzariaId);
  const { data: categorias = [] } = useCategoriasDespesa(pizzariaId);

  const criar = useCriarNotaRascunho();
  const editar = useEditarNotaRascunho();
  const aprovar = useAprovarNota();
  const cancelar = useCancelarNota();

  const isEdit = !!nota;
  const isRascunho = nota?.status === 'rascunho';
  const readonly = isEdit && !isRascunho;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fornecedor_id: '',
      numero: '',
      serie: '',
      data_emissao: todayISO(),
      data_entrada: todayISO(),
      valor_frete: 0,
      valor_desconto: 0,
      observacao: '',
      itens: [],
      parcelas_quantidade: 1,
      primeiro_vencimento: todayISO(),
      intervalo_dias: 30,
      categoria_id: '',
      forma_pagamento: '',
    },
  });

  const itensField = useFieldArray({ control: form.control, name: 'itens' });

  useEffect(() => {
    if (!open) return;
    if (nota) {
      form.reset({
        fornecedor_id: nota.fornecedor_id,
        numero: nota.numero,
        serie: nota.serie ?? '',
        data_emissao: nota.data_emissao,
        data_entrada: nota.data_entrada,
        valor_frete: Number(nota.valor_frete ?? 0),
        valor_desconto: Number(nota.valor_desconto ?? 0),
        observacao: nota.observacao ?? '',
        itens: (nota.itens ?? []).map((i) => ({
          produto_id: i.produto_id,
          deposito_id: i.deposito_id,
          quantidade: Number(i.quantidade),
          custo_unitario: Number(i.custo_unitario),
          lote_numero: i.lote_numero ?? '',
          validade: i.validade ?? '',
        })),
        parcelas_quantidade: 1,
        primeiro_vencimento: todayISO(),
        intervalo_dias: 30,
        categoria_id: '',
        forma_pagamento: '',
      });
    } else {
      form.reset({
        fornecedor_id: '',
        numero: '',
        serie: '',
        data_emissao: todayISO(),
        data_entrada: todayISO(),
        valor_frete: 0,
        valor_desconto: 0,
        observacao: '',
        itens: [{ produto_id: '', deposito_id: depositos[0]?.id ?? '', quantidade: 1, custo_unitario: 0, lote_numero: '', validade: '' }],
        parcelas_quantidade: 1,
        primeiro_vencimento: todayISO(),
        intervalo_dias: 30,
        categoria_id: '',
        forma_pagamento: '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, nota?.id, depositos.length]);

  const watchItens = form.watch('itens');
  const watchFrete = form.watch('valor_frete');
  const watchDesconto = form.watch('valor_desconto');

  const subtotalItens = useMemo(
    () => (watchItens ?? []).reduce((sum, it) => sum + Number(it?.quantidade ?? 0) * Number(it?.custo_unitario ?? 0), 0),
    [watchItens],
  );
  const totalBruto = subtotalItens + Number(watchFrete ?? 0) - Number(watchDesconto ?? 0);

  const buildItens = (values: FormValues) => values.itens.map((i) => ({
    produto_id: i.produto_id,
    deposito_id: i.deposito_id,
    quantidade: Number(i.quantidade),
    custo_unitario: Number(i.custo_unitario),
    lote_numero: i.lote_numero || null,
    validade: i.validade || null,
  }));

  const salvarRascunho = async (): Promise<string | null> => {
    if (!pizzariaId) {
      toast({ variant: 'destructive', title: 'Selecione uma pizzaria antes' });
      return null;
    }
    const ok = await form.trigger();
    if (!ok) return null;
    const values = form.getValues();
    try {
      if (isEdit && nota) {
        await editar.mutateAsync({
          id: nota.id,
          fornecedor_id: values.fornecedor_id,
          numero: values.numero,
          serie: values.serie || null,
          data_emissao: values.data_emissao,
          data_entrada: values.data_entrada,
          valor_total: totalBruto,
          valor_frete: values.valor_frete,
          valor_desconto: values.valor_desconto,
          observacao: values.observacao || null,
          itens: buildItens(values),
        });
        toast({ title: 'Rascunho atualizado' });
        return nota.id;
      } else {
        const novo = await criar.mutateAsync({
          pizzaria_id: pizzariaId,
          fornecedor_id: values.fornecedor_id,
          numero: values.numero,
          serie: values.serie || null,
          data_emissao: values.data_emissao,
          data_entrada: values.data_entrada,
          valor_total: totalBruto,
          valor_frete: values.valor_frete,
          valor_desconto: values.valor_desconto,
          observacao: values.observacao || null,
          usuario_id: user?.id ?? null,
          itens: buildItens(values),
        });
        toast({ title: 'Rascunho criado' });
        return novo.id;
      }
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e?.code === '23505') {
        toast({ variant: 'destructive', title: 'Número de nota duplicado', description: 'Já existe nota com esse número e série para este fornecedor.' });
      } else {
        toast({ variant: 'destructive', title: 'Erro ao salvar', description: e?.message ?? 'Erro desconhecido' });
      }
      return null;
    }
  };

  const aprovarNota = async (id: string) => {
    const v = form.getValues();
    try {
      await aprovar.mutateAsync({
        id,
        parcelas: {
          quantidade: v.parcelas_quantidade,
          primeiro_vencimento: v.primeiro_vencimento,
          intervalo_dias: v.intervalo_dias,
          categoria_id: v.categoria_id || null,
          forma: v.forma_pagamento || null,
        },
      });
      toast({ title: 'Nota aprovada e lançada' });
      onOpenChange(false);
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast({ variant: 'destructive', title: 'Erro ao aprovar', description: e?.message ?? 'Erro desconhecido' });
    }
  };

  const onSalvarRascunho = async () => {
    const id = await salvarRascunho();
    if (id) onOpenChange(false);
  };

  const onSalvarEAprovar = async () => {
    const id = await salvarRascunho();
    if (id) await aprovarNota(id);
  };

  const onCancelarNota = async () => {
    if (!nota) return;
    if (!confirm('Cancelar este rascunho? Não há reversão de estoque (nota está em rascunho, sem efeitos).')) return;
    try {
      await cancelar.mutateAsync(nota.id);
      toast({ title: 'Rascunho cancelado' });
      onOpenChange(false);
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast({ variant: 'destructive', title: 'Erro ao cancelar', description: e?.message ?? 'Erro desconhecido' });
    }
  };

  const podeFornecedores = fornecedores.filter((f) => f.ativo);
  const podeProdutos = produtos.filter((p) => p.ativo);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Nota ${nota?.numero}${nota?.serie ? '/' + nota?.serie : ''}` : 'Nova nota de compra'}
            {readonly && <span className="ml-2 text-sm text-muted-foreground">(somente leitura)</span>}
          </DialogTitle>
        </DialogHeader>

        <fieldset disabled={readonly} className="space-y-6">
          {/* Cabeçalho */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1 md:col-span-2">
              <Label>Fornecedor</Label>
              <Select value={form.watch('fornecedor_id')} onValueChange={(v) => form.setValue('fornecedor_id', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {podeFornecedores.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum fornecedor ativo. Cadastre primeiro.</div>
                  ) : (
                    podeFornecedores.map((f) => <SelectItem key={f.id} value={f.id}>{f.razao_social}</SelectItem>)
                  )}
                </SelectContent>
              </Select>
              {form.formState.errors.fornecedor_id && <p className="text-xs text-destructive">{form.formState.errors.fornecedor_id.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Número</Label>
                <Input {...form.register('numero')} />
                {form.formState.errors.numero && <p className="text-xs text-destructive">{form.formState.errors.numero.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Série</Label>
                <Input {...form.register('serie')} />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Data emissão</Label>
              <Input type="date" {...form.register('data_emissao')} />
            </div>
            <div className="space-y-1">
              <Label>Data entrada</Label>
              <Input type="date" {...form.register('data_entrada')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Frete</Label>
                <Input type="number" step="0.01" {...form.register('valor_frete')} />
              </div>
              <div className="space-y-1">
                <Label>Desconto</Label>
                <Input type="number" step="0.01" {...form.register('valor_desconto')} />
              </div>
            </div>
          </div>

          {/* Itens */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Itens</h3>
              {!readonly && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => itensField.append({ produto_id: '', deposito_id: depositos[0]?.id ?? '', quantidade: 1, custo_unitario: 0, lote_numero: '', validade: '' })}
                >
                  <Plus className="w-4 h-4 mr-1" /> Adicionar item
                </Button>
              )}
            </div>
            {form.formState.errors.itens?.message && (
              <p className="text-xs text-destructive">{form.formState.errors.itens.message}</p>
            )}

            <div className="space-y-2">
              {itensField.fields.map((field, idx) => {
                const item = watchItens?.[idx];
                const subtotal = Number(item?.quantidade ?? 0) * Number(item?.custo_unitario ?? 0);
                return (
                  <div key={field.id} className="grid grid-cols-12 gap-2 items-start p-2 border rounded-md">
                    <div className="col-span-4">
                      <Label className="text-xs">Produto</Label>
                      <Select value={form.watch(`itens.${idx}.produto_id`)} onValueChange={(v) => form.setValue(`itens.${idx}.produto_id`, v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {podeProdutos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome} ({p.unidade})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Depósito</Label>
                      <Select value={form.watch(`itens.${idx}.deposito_id`)} onValueChange={(v) => form.setValue(`itens.${idx}.deposito_id`, v)}>
                        <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          {depositos.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs">Qtd</Label>
                      <Input type="number" step="0.001" {...form.register(`itens.${idx}.quantidade`)} />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Custo unit.</Label>
                      <Input type="number" step="0.01" {...form.register(`itens.${idx}.custo_unitario`)} />
                    </div>
                    <div className="col-span-2 text-right pt-5 text-sm">
                      {subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                    <div className="col-span-1 text-right pt-5">
                      {!readonly && (
                        <Button type="button" size="icon" variant="ghost" onClick={() => itensField.remove(idx)} title="Remover">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <div className="col-span-3 col-start-1">
                      <Label className="text-xs text-muted-foreground">Lote (opcional)</Label>
                      <Input {...form.register(`itens.${idx}.lote_numero`)} />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs text-muted-foreground">Validade (opcional)</Label>
                      <Input type="date" {...form.register(`itens.${idx}.validade`)} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Totais */}
          <div className="flex justify-end gap-6 text-sm border-t pt-3">
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Subtotal itens</div>
              <div className="font-medium">{subtotalItens.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Total bruto</div>
              <div className="font-bold text-base">{totalBruto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            </div>
          </div>

          {/* Parcelas — só pra notas que ainda não foram aprovadas */}
          {!readonly && (
            <div className="space-y-3 border-t pt-4">
              <h3 className="font-medium">Parcelas a pagar</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="space-y-1">
                  <Label>Qtde</Label>
                  <Input type="number" min={1} {...form.register('parcelas_quantidade')} />
                </div>
                <div className="space-y-1">
                  <Label>1º vencimento</Label>
                  <Input type="date" {...form.register('primeiro_vencimento')} />
                  {form.formState.errors.primeiro_vencimento && <p className="text-xs text-destructive">{form.formState.errors.primeiro_vencimento.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label>Intervalo (dias)</Label>
                  <Input type="number" min={1} {...form.register('intervalo_dias')} />
                </div>
                <div className="space-y-1">
                  <Label>Categoria</Label>
                  <Select value={form.watch('categoria_id') ?? ''} onValueChange={(v) => form.setValue('categoria_id', v)}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {categorias.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">Sem categorias.</div>
                      ) : (
                        categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Forma</Label>
                  <Select value={form.watch('forma_pagamento') ?? ''} onValueChange={(v) => form.setValue('forma_pagamento', v)}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {FORMAS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </fieldset>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          {!readonly && (
            <>
              {isEdit && isRascunho && (
                <Button type="button" variant="destructive" onClick={onCancelarNota} disabled={cancelar.isPending}>
                  Cancelar rascunho
                </Button>
              )}
              <Button type="button" variant="secondary" onClick={onSalvarRascunho} disabled={criar.isPending || editar.isPending}>
                {(criar.isPending || editar.isPending) ? 'Salvando...' : 'Salvar rascunho'}
              </Button>
              <Button type="button" onClick={onSalvarEAprovar} disabled={criar.isPending || editar.isPending || aprovar.isPending}>
                {aprovar.isPending ? 'Aprovando...' : (isEdit ? 'Aprovar' : 'Salvar e aprovar')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
