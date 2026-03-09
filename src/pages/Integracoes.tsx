import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTenant } from '@/contexts/TenantContext';
import { mockCredenciais, mockEventos } from '@/mocks/data';
import { Link2, RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const statusIcon: Record<string, React.ReactNode> = {
  processed: <CheckCircle className="w-4 h-4 text-success" />,
  failed: <XCircle className="w-4 h-4 text-destructive" />,
  received: <Clock className="w-4 h-4 text-warning" />,
  processing: <RefreshCw className="w-4 h-4 text-info animate-spin" />,
};

export default function Integracoes() {
  const { currentPizzaria, isConsolidated } = useTenant();
  const { toast } = useToast();
  const [syncing, setSyncing] = useState<string | null>(null);

  const credenciais = useMemo(() => {
    if (isConsolidated) return mockCredenciais;
    return mockCredenciais.filter(c => c.pizzaria_id === currentPizzaria?.id);
  }, [currentPizzaria, isConsolidated]);

  const eventos = useMemo(() => {
    if (isConsolidated) return mockEventos;
    return mockEventos.filter(e => e.pizzaria_id === currentPizzaria?.id);
  }, [currentPizzaria, isConsolidated]);

  const handleReconcile = (credId: string) => {
    setSyncing(credId);
    setTimeout(() => {
      setSyncing(null);
      toast({ title: 'Reconciliação concluída', description: 'Dados sincronizados com sucesso (mock).' });
    }, 2000);
  };

  const fmtDate = (d?: string) => d ? new Date(d).toLocaleString('pt-BR') : '—';

  const processedCount = eventos.filter(e => e.status === 'processed').length;
  const failedCount = eventos.filter(e => e.status === 'failed').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Integrações</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie credenciais e monitore webhooks</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <Link2 className="w-5 h-5 text-primary" />
            <div><p className="text-2xl font-display font-bold">{credenciais.length}</p><p className="text-xs text-muted-foreground">Credenciais ativas</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-success" />
            <div><p className="text-2xl font-display font-bold">{processedCount}</p><p className="text-xs text-muted-foreground">Eventos processados</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <div><p className="text-2xl font-display font-bold">{failedCount}</p><p className="text-xs text-muted-foreground">Eventos com falha</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Credenciais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Credenciais CardapioWeb</CardTitle>
          <CardDescription>Uma credencial por pizzaria/estabelecimento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {credenciais.map(cred => (
              <div key={cred.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={cred.ativo ? 'default' : 'secondary'}>{cred.ativo ? 'Ativa' : 'Inativa'}</Badge>
                    <span className="text-sm font-medium">{cred.origem}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Estabelecimento: <span className="font-mono">{cred.estabelecimento_externo_id}</span></p>
                  <p className="text-xs text-muted-foreground">Última sync: {fmtDate(cred.last_sync_at)}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={syncing === cred.id}
                  onClick={() => handleReconcile(cred.id)}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${syncing === cred.id ? 'animate-spin' : ''}`} />
                  {syncing === cred.id ? 'Sincronizando...' : 'Reconciliar'}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Eventos recentes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Eventos Recentes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
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
              {eventos.slice(0, 20).map(evt => (
                <TableRow key={evt.id}>
                  <TableCell>{statusIcon[evt.status]}</TableCell>
                  <TableCell className="font-mono text-xs">{evt.tipo_evento}</TableCell>
                  <TableCell className="font-mono text-xs">{evt.resource_external_id}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtDate(evt.received_at)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtDate(evt.processed_at)}</TableCell>
                  <TableCell className="text-xs text-destructive">{evt.error_message ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
