import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCredenciais, useSyncJobs, useEventosIntegracao } from '@/hooks/integracoes';
import { usePizzarias } from '@/hooks/usePizzarias';
import { CredencialDialog } from '@/components/integracoes/CredencialDialog';
import { SyncDialog } from '@/components/integracoes/SyncDialog';
import { IntegracoesStats } from '@/components/integracoes/IntegracoesStats';
import { SyncJobRow } from '@/components/integracoes/SyncJobRow';
import { Plus, RefreshCw, Pencil, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { IntegracaoCredencial, SyncJob } from '@/types';

const fmt = (d?: string | null) => d ? new Date(d).toLocaleString('pt-BR') : '—';
const mascarar = (s?: string | null) => s && s.length > 4 ? `••••••${s.slice(-4)}` : '••••••';

const eventoIcon: Record<string, JSX.Element> = {
  processed: <CheckCircle className="w-4 h-4 text-success" />,
  failed: <XCircle className="w-4 h-4 text-destructive" />,
  received: <Clock className="w-4 h-4 text-warning" />,
  processing: <RefreshCw className="w-4 h-4 text-info animate-spin" />,
};

export default function Integracoes() {
  const { currentPizzaria, isConsolidated } = useTenant();

  // AuthContext não expõe role diretamente no User; role fica em memberships.
  // Quando consolidado, verifica se alguma membership é super_admin.
  // Quando em pizzaria específica, usa getUserRole para aquela pizzaria.
  const { getUserRole, memberships } = useAuth();

  const role = useMemo(() => {
    if (isConsolidated) {
      return memberships.some((m) => m.role === 'super_admin') ? 'super_admin' : 'leitura';
    }
    return currentPizzaria ? (getUserRole(currentPizzaria.id) ?? 'leitura') : 'leitura';
  }, [isConsolidated, currentPizzaria, getUserRole, memberships]);

  const pizzariaId = isConsolidated ? null : currentPizzaria?.id ?? null;

  const podeEditar = role === 'super_admin' || role === 'admin_pizzaria';
  const podeCriar = role === 'super_admin';
  const podeSync = role === 'super_admin' || role === 'admin_pizzaria';

  const { data: credenciais = [] } = useCredenciais(pizzariaId);
  const { data: jobs = [] } = useSyncJobs({ pizzariaId });
  const { data: eventos = [] } = useEventosIntegracao(pizzariaId);
  const { data: pizzarias = [] } = usePizzarias();

  const [credDialog, setCredDialog] = useState<{ open: boolean; credencial: IntegracaoCredencial | null }>({ open: false, credencial: null });
  const [syncDialog, setSyncDialog] = useState<{ open: boolean; credencialId?: string }>({ open: false });

  const pizzariaNome = useMemo(() => {
    const m = new Map(pizzarias.map((p) => [p.id, p.nome]));
    return (id: string) => m.get(id) ?? id.slice(0, 8);
  }, [pizzarias]);

  const workerOffline = useMemo(() => {
    const cutoff = Date.now() - 5 * 60_000;
    return jobs.some((j) => j.status === 'queued' && new Date(j.created_at).getTime() < cutoff);
  }, [jobs]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Integrações</h1>
        <p className="text-sm text-muted-foreground mt-1">Credenciais, sincronizações e eventos</p>
      </div>

      <IntegracoesStats pizzariaId={pizzariaId} />

      <Tabs defaultValue="credenciais">
        <TabsList>
          <TabsTrigger value="credenciais">Credenciais</TabsTrigger>
          <TabsTrigger value="sincronizacoes">Sincronizações</TabsTrigger>
          <TabsTrigger value="eventos">Eventos</TabsTrigger>
        </TabsList>

        {/* ---------- Credenciais ---------- */}
        <TabsContent value="credenciais" className="space-y-4">
          <div className="flex justify-end">
            {podeCriar && (
              <Button onClick={() => setCredDialog({ open: true, credencial: null })}>
                <Plus className="w-4 h-4 mr-1" /> Nova credencial
              </Button>
            )}
          </div>

          {credenciais.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
              Nenhuma credencial cadastrada{podeCriar ? '. Clique em "Nova credencial".' : '.'}
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {credenciais.map((cred) => (
                <Card key={cred.id}>
                  <CardContent className="pt-4 pb-3 flex items-center justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={cred.ativo ? 'default' : 'secondary'}>{cred.ativo ? 'Ativa' : 'Inativa'}</Badge>
                        {isConsolidated && <Badge variant="outline">{pizzariaNome(cred.pizzaria_id)}</Badge>}
                        <span className="text-sm font-medium">CardapioWeb #{cred.estabelecimento_externo_id}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">API key: <span className="font-mono">{mascarar(cred.api_key_encrypted)}</span></p>
                      <p className="text-xs text-muted-foreground">Última sync: {fmt(cred.last_sync_at)}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {podeEditar && (
                        <Button size="sm" variant="outline" onClick={() => setCredDialog({ open: true, credencial: cred })}>
                          <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
                        </Button>
                      )}
                      {podeSync && cred.ativo && (
                        <Button size="sm" onClick={() => setSyncDialog({ open: true, credencialId: cred.id })}>
                          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Sincronizar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ---------- Sincronizações ---------- */}
        <TabsContent value="sincronizacoes" className="space-y-4">
          <div className="flex justify-end">
            {podeSync && (
              <Button onClick={() => setSyncDialog({ open: true })}>
                <Plus className="w-4 h-4 mr-1" /> Nova sincronização
              </Button>
            )}
          </div>

          {workerOffline && (
            <Card className="border-warning bg-warning/10">
              <CardContent className="pt-3 pb-3 flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-warning" />
                Há jobs aguardando há mais de 5 min — o worker pode estar offline.
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Progresso</TableHead>
                    <TableHead>Imp/Upd/Err</TableHead>
                    <TableHead>Iniciado</TableHead>
                    <TableHead>Duração</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">
                      Nenhuma sincronização ainda.
                    </TableCell></TableRow>
                  ) : jobs.map((j: SyncJob) => <SyncJobRow key={j.id} job={j} />)}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------- Eventos ---------- */}
        <TabsContent value="eventos">
          <Card>
            <CardHeader><CardTitle className="text-base">Eventos de webhook</CardTitle></CardHeader>
            <CardContent className="p-0">
              {eventos.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground px-6">
                  Nenhum evento ainda. Eventos chegarão quando o webhook do CardapioWeb estiver configurado (sub-projeto separado).
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Recurso</TableHead>
                      <TableHead>Recebido</TableHead>
                      <TableHead>Processado</TableHead>
                      <TableHead>Erro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eventos.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell>{eventoIcon[e.status]}</TableCell>
                        <TableCell className="font-mono text-xs">{e.tipo_evento}</TableCell>
                        <TableCell className="font-mono text-xs">{e.resource_external_id}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{fmt(e.received_at)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{fmt(e.processed_at)}</TableCell>
                        <TableCell className="text-xs text-destructive">{e.error_message ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CredencialDialog
        open={credDialog.open}
        onOpenChange={(open) => setCredDialog((s) => ({ ...s, open }))}
        credencial={credDialog.credencial}
      />
      <SyncDialog
        open={syncDialog.open}
        onOpenChange={(open) => setSyncDialog({ open })}
        pizzariaId={pizzariaId}
        defaultCredencialId={syncDialog.credencialId}
      />
    </div>
  );
}
