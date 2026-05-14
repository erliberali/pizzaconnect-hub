import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { useProdutosEstoque } from '@/hooks/gestao/useProdutosEstoque';
import { useToggleProdutoAtivo } from '@/hooks/gestao/useToggleProdutoAtivo';
import { usePizzarias } from '@/hooks/usePizzarias';
import { ProdutoDialog } from '@/components/compras/ProdutoDialog';
import { Plus, Search, Pencil, Power } from 'lucide-react';
import type { ProdutoEstoque } from '@/types';

const fmtMoney = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Produtos() {
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

  const [search, setSearch] = useState('');
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const [dialog, setDialog] = useState<{ open: boolean; produto: ProdutoEstoque | null }>({ open: false, produto: null });

  const { data: produtos = [], isLoading } = useProdutosEstoque(pizzariaId);
  const toggle = useToggleProdutoAtivo();

  const pizzariaNome = useMemo(() => {
    const m = new Map(pizzarias.map((p) => [p.id, p.nome]));
    return (id: string) => m.get(id) ?? id.slice(0, 8);
  }, [pizzarias]);

  const filtrados = useMemo(() => {
    const s = search.trim().toLowerCase();
    return produtos.filter((p) => {
      if (!mostrarInativos && !p.ativo) return false;
      if (!s) return true;
      return (
        p.nome.toLowerCase().includes(s) ||
        (p.sku ?? '').toLowerCase().includes(s) ||
        (p.categoria ?? '').toLowerCase().includes(s)
      );
    });
  }, [produtos, search, mostrarInativos]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Produtos de estoque</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? 'Carregando...' : `${filtrados.length} produto(s)`}
          </p>
        </div>
        {podeEditar && (
          <Button onClick={() => setDialog({ open: true, produto: null })}>
            <Plus className="w-4 h-4 mr-1" /> Novo produto
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, SKU ou categoria..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button
          type="button"
          variant={mostrarInativos ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMostrarInativos((s) => !s)}
        >
          {mostrarInativos ? 'Ocultando inativos' : 'Mostrar inativos'}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                {verTodas && <TableHead>Pizzaria</TableHead>}
                <TableHead>SKU</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead className="text-right">Custo médio</TableHead>
                <TableHead className="text-right">Estoque mín.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={verTodas ? 8 : 7} className="text-center text-sm text-muted-foreground py-6">
                    {produtos.length === 0 ? 'Nenhum produto cadastrado.' : 'Nenhum produto casa com o filtro.'}
                  </TableCell>
                </TableRow>
              ) : (
                filtrados.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-medium">{p.nome}</div>
                      {p.categoria && <div className="text-xs text-muted-foreground">{p.categoria}</div>}
                    </TableCell>
                    {verTodas && (
                      <TableCell>
                        {p.pizzaria_id ? (
                          <Badge variant="outline">{pizzariaNome(p.pizzaria_id)}</Badge>
                        ) : (
                          <Badge variant="secondary">Ambas</Badge>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="font-mono text-xs">{p.sku ?? '—'}</TableCell>
                    <TableCell>{p.unidade}</TableCell>
                    <TableCell className="text-right">{fmtMoney(Number(p.custo_medio ?? 0))}</TableCell>
                    <TableCell className="text-right">{Number(p.estoque_minimo ?? 0).toLocaleString('pt-BR')}</TableCell>
                    <TableCell><Badge variant={p.ativo ? 'default' : 'secondary'}>{p.ativo ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                    <TableCell className="text-right">
                      {podeEditar && (
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => setDialog({ open: true, produto: p })} title="Editar">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => toggle.mutate({ id: p.id, ativo: !p.ativo })} title={p.ativo ? 'Inativar' : 'Reativar'}>
                            <Power className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ProdutoDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((s) => ({ ...s, open }))}
        produto={dialog.produto}
        pizzariaIdFixo={verTodas ? null : currentPizzaria?.id ?? null}
      />
    </div>
  );
}
