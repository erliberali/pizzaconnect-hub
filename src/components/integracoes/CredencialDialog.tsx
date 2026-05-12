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
import { useUpsertCredencial } from '@/hooks/integracoes';
import { usePizzarias } from '@/hooks/usePizzarias';
import type { IntegracaoCredencial } from '@/types';

const schema = z.object({
  pizzaria_id: z.string().min(1, 'Selecione uma pizzaria'),
  estabelecimento_externo_id: z.string().regex(/^\d+$/, 'Apenas dígitos'),
  api_key: z.string().optional(),
  ativo: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credencial?: IntegracaoCredencial | null;
}

export function CredencialDialog({ open, onOpenChange, credencial }: Props) {
  const { toast } = useToast();
  const { data: pizzarias = [] } = usePizzarias();
  const upsert = useUpsertCredencial();
  const isEdit = !!credencial;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      pizzaria_id: '',
      estabelecimento_externo_id: '',
      api_key: '',
      ativo: true,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        pizzaria_id: credencial?.pizzaria_id ?? '',
        estabelecimento_externo_id: credencial?.estabelecimento_externo_id ?? '',
        api_key: '',
        ativo: credencial?.ativo ?? true,
      });
    }
  }, [open, credencial, form]);

  const onSubmit = async (values: FormValues) => {
    if (!isEdit && (!values.api_key || values.api_key.trim().length === 0)) {
      form.setError('api_key', { message: 'API key obrigatória na criação' });
      return;
    }
    try {
      await upsert.mutateAsync({
        id: credencial?.id,
        pizzaria_id: values.pizzaria_id,
        estabelecimento_externo_id: values.estabelecimento_externo_id,
        api_key: values.api_key,
        ativo: values.ativo,
      });
      toast({ title: isEdit ? 'Credencial atualizada' : 'Credencial criada' });
      onOpenChange(false);
    } catch (err: any) {
      if (err?.code === '23505') {
        toast({ variant: 'destructive', title: 'CardapioWeb ID já cadastrado', description: 'Já existe credencial para esse estabelecimento.' });
      } else {
        toast({ variant: 'destructive', title: 'Erro ao salvar', description: err?.message ?? 'Erro desconhecido' });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar credencial' : 'Nova credencial'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label>Pizzaria</Label>
            <Select
              value={form.watch('pizzaria_id')}
              onValueChange={(v) => form.setValue('pizzaria_id', v)}
              disabled={isEdit}
            >
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {pizzarias.map((p) => (<SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>))}
              </SelectContent>
            </Select>
            {form.formState.errors.pizzaria_id && (
              <p className="text-xs text-destructive">{form.formState.errors.pizzaria_id.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label>CardapioWeb ID</Label>
            <Input {...form.register('estabelecimento_externo_id')} placeholder="18583" />
            {form.formState.errors.estabelecimento_externo_id && (
              <p className="text-xs text-destructive">{form.formState.errors.estabelecimento_externo_id.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label>API Key {isEdit && <span className="text-xs text-muted-foreground">(deixe vazio para manter)</span>}</Label>
            <Input type="password" {...form.register('api_key')} placeholder={isEdit ? '••••••••' : ''} />
            {form.formState.errors.api_key && (
              <p className="text-xs text-destructive">{form.formState.errors.api_key.message}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={form.watch('ativo')}
              onCheckedChange={(v) => form.setValue('ativo', v)}
            />
            <Label>Ativa</Label>
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
