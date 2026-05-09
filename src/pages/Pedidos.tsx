import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useTenant } from '@/contexts/TenantContext';
import { usePedidos } from '@/hooks/usePedidos';
import type { Pedido, PedidoStatus, PedidoCanal } from '@/types';
import { Search, Eye } from 'lucide-react';

const statusVariant: Record<PedidoStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  novo: 'outline',
  confirmado: 'secondary',
  em_preparo: 'secondary',
  pronto: 'default',
  saiu_entrega: 'default',
  entregue: 'default',
  cancelado: 'destructive',
};

const statusLabel: Record<PedidoStatus, string> = {
  novo: 'Novo',
  confirmado: 'Confirmado',
  em_preparo: 'Em Preparo',
  pronto: 'Pronto',
  saiu_entrega: 'Saiu p/ Entrega',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

const canalLabel: Record<PedidoCanal, string> = {
  delivery: 'Delivery',
  mesa: 'Mesa',
  balcao: 'Balcão',
  retirada: 'Retirada',
};

export default function Pedidos() {
  const { currentPizzaria, isConsolidated } = useTenant();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCanal, setFilterCanal] = useState<string>('all');
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);

  const { data: pedidos = [], isLoading, error } = usePedidos({
    pizzariaId: isConsolidated ? null : currentPizzaria?.id,
    filterStatus,
    filterCanal,
    search,
  });

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtDate = (d: string) => new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Pedidos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isLoading ? 'Carregando...' : `${pedidos.length} pedidos encontrados`}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por ID, cliente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Status</SelectItem>
            {Object.entries(statusLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCanal} onValueChange={setFilterCanal}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Canal" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Canais</SelectItem>
            {Object.entries(canalLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <p className="text-sm text-destructive">Erro ao carregar pedidos: {(error as Error).message}</p>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Data</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : pedidos.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.pedido_externo_id}</TableCell>
                      <TableCell>{p.cliente_nome ?? '-'}</TableCell>
                      <TableCell><Badge variant="outline">{canalLabel[p.canal]}</Badge></TableCell>
                      <TableCell><Badge variant={statusVariant[p.status]}>{statusLabel[p.status]}</Badge></TableCell>
                      <TableCell className="text-right font-medium">{fmt(p.total_liquido)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmtDate(p.created_at_origem)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setSelectedPedido(p)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedPedido} onOpenChange={open => !open && setSelectedPedido(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Pedido {selectedPedido?.pedido_externo_id}</DialogTitle>
          </DialogHeader>
          {selectedPedido && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Status:</span> <Badge variant={statusVariant[selectedPedido.status]}>{statusLabel[selectedPedido.status]}</Badge></div>
                <div><span className="text-muted-foreground">Canal:</span> {canalLabel[selectedPedido.canal]}</div>
                <div><span className="text-muted-foreground">Cliente:</span> {selectedPedido.cliente_nome}</div>
                <div><span className="text-muted-foreground">Telefone:</span> {selectedPedido.cliente_telefone}</div>
                <div><span className="text-muted-foreground">External Key:</span> <span className="font-mono text-xs">{selectedPedido.external_key}</span></div>
                <div><span className="text-muted-foreground">Data Origem:</span> {fmtDate(selectedPedido.created_at_origem)}</div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Itens</h4>
                <div className="space-y-2">
                  {selectedPedido.itens?.map((item, i) => (
                    <div key={item.id ?? i} className="flex justify-between items-center text-sm p-2 rounded-md bg-muted">
                      <div>
                        <p className="font-medium">{item.descricao}</p>
                        <p className="text-xs text-muted-foreground">{item.qtd}x {fmt(item.preco_unit)}</p>
                      </div>
                      <span className="font-medium">{fmt(item.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t pt-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{fmt(selectedPedido.total_bruto)}</span></div>
                {selectedPedido.descontos > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Descontos</span><span className="text-green-600">-{fmt(selectedPedido.descontos)}</span></div>}
                {selectedPedido.taxas > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Taxas</span><span>{fmt(selectedPedido.taxas)}</span></div>}
                <div className="flex justify-between font-bold text-base"><span>Total</span><span>{fmt(selectedPedido.total_liquido)}</span></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
