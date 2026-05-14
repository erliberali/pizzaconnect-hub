import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useUpsertProdutoEstoque } from '@/hooks/gestao/useUpsertProdutoEstoque';
import { usePizzarias } from '@/hooks/usePizzarias';
import type { ProdutoEstoque } from '@/types';

// "ambas" mapeia para pizzaria_id = null no banco
const ESCOPO_AMBAS = '__ambas__';

const schema = z.object({
  pizzaria_id: z.string().min(1, 'Selecione o escopo'),
  nome: z.string().min(2, 'Informe o nome'),
  sku: z.string().optional(),
  unidade: z.string().min(1, 'Informe a unidade'),
  categoria: z.string().optional(),
  estoque_minimo: z.coerce.number().min(0, 'Não pode ser negativo'),
  controla_lote: z.boolean(),
  controla_validade: z.boolean(),
  ativo: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produto?: ProdutoEstoque | null;
  pizzariaIdFixo?: string | null;
}

const UNIDADES = ['un', 'kg', 'g', 'l', 'ml', 'cx', 'pct'];

export function ProdutoDialog({ open, onOpenChange, produto, pizzariaIdFixo }: Props) {
  const { toast } = useToast();
  const { data: pizzarias = [] } = usePizzarias();
  const upsert = useUpsertProdutoEstoque();
  const isEdit = !!produto;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      pizzaria_id: '',
      nome: '',
      sku: '',
      unidade: 'un',
      categoria: '',
      estoque_minimo: 0,
      controla_lote: false,
      controla_validade: false,
      ativo: true,
    },
  });

  useEffect(() => {
    if (open) {
      const escopoInicial = produto
        ? (produto.pizzaria_id ?? ESCOPO_AMBAS)
        : (pizzariaIdFixo ?? ESCOPO_AMBAS);
      form.reset({
        pizzaria_id: escopoInicial,
        nome: produto?.nome ?? '',
        sku: produto?.sku ?? '',
        unidade: produto?.unidade ?? 'un',
        categoria: produto?.categoria ?? '',
        estoque_minimo: produto?.estoque_minimo ?? 0,
        controla_lote: produto?.controla_lote ?? false,
        controla_validade: produto?.controla_validade ?? false,
        ativo: produto?.ativo ?? true,
      });
    }
  }, [open, produto, pizzariaIdFixo, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      await upsert.mutateAsync({
        id: produto?.id,
        pizzaria_id: values.pizzaria_id === ESCOPO_AMBAS ? null : values.pizzaria_id,
        nome: values.nome,
        sku: values.sku || null,
        unidade: values.unidade,
        categoria: values.categoria || null,
        estoque_minimo: values.estoque_minimo,
        controla_lote: values.controla_lote,
        controla_validade: values.controla_validade,
        ativo: values.ativo,
      });
      toast({ title: isEdit ? 'Produto atualizado' : 'Produto criado' });
      onOpenChange(false);
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: e?.message ?? 'Erro desconhecido' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar produto' : 'Novo produto'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label>Escopo</Label>
            <Select
              value={form.watch('pizzaria_id')}
              onValueChange={(v) => form.setValue('pizzaria_id', v)}
            >
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {pizzarias.map((p) => (<SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>))}
                <SelectItem value={ESCOPO_AMBAS}>Ambas (compartilhado)</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.pizzaria_id && (
              <p className="text-xs text-destructive">{form.formState.errors.pizzaria_id.message}</p>
            )}
            <p className="text-xs text-muted-foreground">Quando "Ambas", o produto aparece para as duas pizzarias.</p>
          </div>

          <div className="space-y-1">
            <Label>Nome</Label>
            <Input {...form.register('nome')} />
            {form.formState.errors.nome && (
              <p className="text-xs text-destructive">{form.formState.errors.nome.message}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>SKU</Label>
              <Input {...form.register('sku')} />
            </div>
            <div className="space-y-1">
              <Label>Unidade</Label>
              <Select value={form.watch('unidade')} onValueChange={(v) => form.setValue('unidade', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Estoque mínimo</Label>
              <Input type="number" step="0.01" {...form.register('estoque_minimo')} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Categoria</Label>
            <Input {...form.register('categoria')} placeholder="Ex: Insumos, Embalagens..." />
          </div>

          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={form.watch('controla_lote')} onCheckedChange={(v) => form.setValue('controla_lote', v)} />
              <Label>Controla lote</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.watch('controla_validade')} onCheckedChange={(v) => form.setValue('controla_validade', v)} />
              <Label>Controla validade</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.watch('ativo')} onCheckedChange={(v) => form.setValue('ativo', v)} />
              <Label>Ativo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={upsert.isPending}>
              {upsert.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
