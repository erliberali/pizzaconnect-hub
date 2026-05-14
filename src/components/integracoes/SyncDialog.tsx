import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCredenciais, useEnqueueSyncJob } from '@/hooks/integracoes';

const MAX_RANGE_DIAS = 90;

const schema = z.object({
  credencial_id: z.string().min(1, 'Selecione uma credencial'),
  periodo_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  periodo_fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
}).refine((v) => v.periodo_fim >= v.periodo_inicio, {
  message: 'Data final deve ser >= inicial', path: ['periodo_fim'],
}).refine((v) => v.periodo_fim <= new Date().toISOString().slice(0, 10), {
  message: 'Data final não pode estar no futuro', path: ['periodo_fim'],
}).refine((v) => {
  const ms = new Date(v.periodo_fim).getTime() - new Date(v.periodo_inicio).getTime();
  return ms / (1000 * 60 * 60 * 24) <= MAX_RANGE_DIAS;
}, { message: `Range máximo: ${MAX_RANGE_DIAS} dias`, path: ['periodo_fim'] });

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pizzariaId?: string | null;
  defaultCredencialId?: string;
}

export function SyncDialog({ open, onOpenChange, pizzariaId, defaultCredencialId }: Props) {
  const { toast } = useToast();
  const { data: credenciais = [] } = useCredenciais(pizzariaId);
  const enqueue = useEnqueueSyncJob();

  const seteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const hoje = new Date().toISOString().slice(0, 10);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { credencial_id: defaultCredencialId ?? '', periodo_inicio: seteDiasAtras, periodo_fim: hoje },
  });

  useEffect(() => {
    if (open) {
      form.reset({ credencial_id: defaultCredencialId ?? '', periodo_inicio: seteDiasAtras, periodo_fim: hoje });
    }
  }, [open, defaultCredencialId]);

  const onSubmit = async (values: FormValues) => {
    const cred = credenciais.find((c) => c.id === values.credencial_id);
    if (!cred) return;
    try {
      await enqueue.mutateAsync({
        credencial_id: cred.id,
        pizzaria_id: cred.pizzaria_id,
        periodo_inicio: values.periodo_inicio,
        periodo_fim: values.periodo_fim,
      });
      toast({ title: 'Sincronização enfileirada', description: 'O worker vai processar em instantes.' });
      onOpenChange(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Não foi possível enfileirar', description: err?.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova sincronização</DialogTitle></DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label>Credencial</Label>
            <Select
              value={form.watch('credencial_id')}
              onValueChange={(v) => form.setValue('credencial_id', v)}
            >
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {credenciais.filter(c => c.ativo).map((c) => (
                  <SelectItem key={c.id} value={c.id}>CardapioWeb #{c.estabelecimento_externo_id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.credencial_id && (
              <p className="text-xs text-destructive">{form.formState.errors.credencial_id.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Início</Label>
              <Input type="date" {...form.register('periodo_inicio')} />
            </div>
            <div className="space-y-1">
              <Label>Fim</Label>
              <Input type="date" {...form.register('periodo_fim')} />
              {form.formState.errors.periodo_fim && (
                <p className="text-xs text-destructive">{form.formState.errors.periodo_fim.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={enqueue.isPending}>
              {enqueue.isPending ? 'Enfileirando...' : 'Enfileirar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
