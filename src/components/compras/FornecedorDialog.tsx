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
import { useUpsertFornecedor } from '@/hooks/gestao/useUpsertFornecedor';
import { usePizzarias } from '@/hooks/usePizzarias';
import type { Fornecedor } from '@/types';

// Valor especial no select; "ambas" mapeia para pizzaria_id = null.
const ESCOPO_AMBAS = '__ambas__';

const schema = z.object({
  pizzaria_id: z.string().min(1, 'Selecione o escopo'),
  razao_social: z.string().min(2, 'Informe a razão social'),
  nome_fantasia: z.string().optional(),
  cnpj: z.string().optional(),
  contato: z.string().optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  telefone: z.string().optional(),
  ativo: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fornecedor?: Fornecedor | null;
  pizzariaIdFixo?: string | null; // quando não consolidado, fixa a pizzaria
}

export function FornecedorDialog({ open, onOpenChange, fornecedor, pizzariaIdFixo }: Props) {
  const { toast } = useToast();
  const { data: pizzarias = [] } = usePizzarias();
  const upsert = useUpsertFornecedor();
  const isEdit = !!fornecedor;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      pizzaria_id: '',
      razao_social: '',
      nome_fantasia: '',
      cnpj: '',
      contato: '',
      email: '',
      telefone: '',
      ativo: true,
    },
  });

  useEffect(() => {
    if (open) {
      const escopoInicial = fornecedor
        ? (fornecedor.pizzaria_id ?? ESCOPO_AMBAS)
        : (pizzariaIdFixo ?? ESCOPO_AMBAS);
      form.reset({
        pizzaria_id: escopoInicial,
        razao_social: fornecedor?.razao_social ?? '',
        nome_fantasia: fornecedor?.nome_fantasia ?? '',
        cnpj: fornecedor?.cnpj ?? '',
        contato: fornecedor?.contato ?? '',
        email: fornecedor?.email ?? '',
        telefone: fornecedor?.telefone ?? '',
        ativo: fornecedor?.ativo ?? true,
      });
    }
  }, [open, fornecedor, pizzariaIdFixo, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      await upsert.mutateAsync({
        id: fornecedor?.id,
        pizzaria_id: values.pizzaria_id === ESCOPO_AMBAS ? null : values.pizzaria_id,
        razao_social: values.razao_social,
        nome_fantasia: values.nome_fantasia || null,
        cnpj: values.cnpj || null,
        contato: values.contato || null,
        email: values.email || null,
        telefone: values.telefone || null,
        ativo: values.ativo,
      });
      toast({ title: isEdit ? 'Fornecedor atualizado' : 'Fornecedor criado' });
      onOpenChange(false);
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e?.code === '23505') {
        toast({ variant: 'destructive', title: 'CNPJ já cadastrado', description: 'Já existe fornecedor com esse CNPJ nessa pizzaria.' });
      } else {
        toast({ variant: 'destructive', title: 'Erro ao salvar', description: e?.message ?? 'Erro desconhecido' });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar fornecedor' : 'Novo fornecedor'}</DialogTitle>
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
            <p className="text-xs text-muted-foreground">Quando "Ambas", o fornecedor aparece para as duas pizzarias.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2">
              <Label>Razão Social</Label>
              <Input {...form.register('razao_social')} />
              {form.formState.errors.razao_social && (
                <p className="text-xs text-destructive">{form.formState.errors.razao_social.message}</p>
              )}
            </div>

            <div className="space-y-1 col-span-2">
              <Label>Nome Fantasia</Label>
              <Input {...form.register('nome_fantasia')} />
            </div>

            <div className="space-y-1">
              <Label>CNPJ</Label>
              <Input {...form.register('cnpj')} placeholder="00.000.000/0000-00" />
            </div>

            <div className="space-y-1">
              <Label>Telefone</Label>
              <Input {...form.register('telefone')} />
            </div>

            <div className="space-y-1">
              <Label>Contato</Label>
              <Input {...form.register('contato')} />
            </div>

            <div className="space-y-1">
              <Label>E-mail</Label>
              <Input type="email" {...form.register('email')} />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={form.watch('ativo')} onCheckedChange={(v) => form.setValue('ativo', v)} />
            <Label>Ativo</Label>
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
