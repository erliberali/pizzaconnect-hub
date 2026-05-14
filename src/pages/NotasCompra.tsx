import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotasCompra } from '@/hooks/gestao/useNotasCompra';
import { useNotaCompra } from '@/hooks/gestao/useNotaCompra';
import { useFornecedores } from '@/hooks/gestao/useFornecedores';
import { usePizzarias } from '@/hooks/usePizzarias';
import { NotaCompraDialog } from '@/components/compras/NotaCompraDialog';
import { StatusNotaBadge } from '@/components/compras/StatusNotaBadge';
import { Plus, Pencil, Eye } from 'lucide-react';
import type { NotaCompraStatus } from '@/types';

const fmtMoney = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d: string) => {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

function isoOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function NotasCompra() {
  const { currentPizzaria, isConsolidated } = useTenant();
  const { getUserRole, memberships } = useAuth();
  const { data: pizzarias = [] } = usePizzarias();

  const role = useMemo(() => {
    if (isConsolidated) {
      return memberships.some((m) => m.role === 'super_admin') ? 'super_admin' : 'leitura';
    }
    return currentPizzaria ? (getUserRole(currentPizzaria.id) ?? 'leitura') : 'leitura';
  }, [isConsolidated, currentPizzaria, getUserRole, memberships]);

  const verTodas = isConsolidated || role === 'super_admin';
  const pizzariaId = verTodas ? null : currentPizzaria?.id ?? null;
  const podeEditar = role === 'super_admin' || role === 'admin_pizzaria';

  const [filterStatus, setFilterStatus] = useState<NotaCompraStatus | 'all'>('all');
  const [filterFornecedor, setFilterFornecedor] = useState<string>('all');
  const [dateStart, setDateStart] = useState<string>(isoOffset(30));
  const [dateEnd, setDateEnd] = useState<string>(isoOffset(0));
  const [dialog, setDialog] = useState<{ open: boolean; notaId: string | null; nova: boolean }>({ open: false, notaId: null, nova: false });

  const { data: notas = [], isLoading } = useNotasCompra({
    pizzariaId,
    status: filterStatus,
    fornecedorId: filterFornecedor !== 'all' ? filterFornecedor : null,
    dateStart,
    dateEnd,
  });
  const { data: notaDetalhe } = useNotaCompra(dialog.notaId);
  const { data: fornecedores = [] } = useFornecedores(pizzariaId);

  const pizzariaNome = useMemo(() => {
    const m = new Map(pizzarias.map((p) => [p.id, p.nome]));
    return (id: string) => m.get(id) ?? id.slice(0, 8);
  }, [pizzarias]);

  const podeCriarAqui = podeEditar && !!pizzariaId; // precisa ter uma pizzaria ativa
  const totalNoFiltro = notas.reduce((s, n) => s + Number(n.valor_total ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Notas de compra</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? 'Carregando...' : `${notas.length} nota(s) · ${fmtMoney(totalNoFiltro)} no filtro`}
          </p>
        </div>
        {podeCriarAqui && (
          <Button onClick={() => setDialog({ open: true, notaId: null, nova: true })}>
            <Plus className="w-4 h-4 mr-1" /> Nova nota
          </Button>
        )}
      </div>

      {!pizzariaId && podeEditar && (
        <Card className="border-warning bg-warning/10">
          <CardContent className="py-3 text-sm">
            Para criar uma nota, selecione uma pizzaria específica no topo (visão consolidada não permite criar).
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as NotaCompraStatus | 'all')}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="rascunho">Rascunho</SelectItem>
            <SelectItem value="lancada">Lançada</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterFornecedor} onValueChange={setFilterFornecedor}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Fornecedor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos fornecedores</SelectItem>
            {fornecedores.map((f) => <SelectItem key={f.id} value={f.id}>{f.razao_social}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">De</span>
          <Input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className="w-[150px]" />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Até</span>
          <Input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className="w-[150px]" />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº</TableHead>
                <TableHead>Fornecedor</TableHead>
                {verTodas && <TableHead>Pizzaria</TableHead>}
                <TableHead>Emissão</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={verTodas ? 7 : 6} className="text-center text-sm text-muted-foreground py-6">
                    Nenhuma nota no filtro.
                  </TableCell>
                </TableRow>
              ) : (
                notas.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell className="font-mono text-xs">{n.numero}{n.serie ? `/${n.serie}` : ''}</TableCell>
                    <TableCell>{n.fornecedor?.razao_social ?? '—'}</TableCell>
                    {verTodas && <TableCell><Badge variant="outline">{pizzariaNome(n.pizzaria_id)}</Badge></TableCell>}
                    <TableCell className="text-sm">{fmtDate(n.data_emissao)}</TableCell>
                    <TableCell className="text-right font-medium">{fmtMoney(Number(n.valor_total ?? 0))}</TableCell>
                    <TableCell><StatusNotaBadge status={n.status} /></TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDialog({ open: true, notaId: n.id, nova: false })}
                        title={n.status === 'rascunho' ? 'Editar' : 'Visualizar'}
                      >
                        {n.status === 'rascunho' ? <Pencil className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <NotaCompraDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog({ open, notaId: open ? dialog.notaId : null, nova: open ? dialog.nova : false })}
        nota={dialog.nova ? null : notaDetalhe ?? null}
        pizzariaId={pizzariaId ?? currentPizzaria?.id ?? null}
      />
    </div>
  );
}
