import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { useFornecedores } from '@/hooks/gestao/useFornecedores';
import { useToggleFornecedorAtivo } from '@/hooks/gestao/useToggleFornecedorAtivo';
import { usePizzarias } from '@/hooks/usePizzarias';
import { FornecedorDialog } from '@/components/compras/FornecedorDialog';
import { Plus, Search, Pencil, Power } from 'lucide-react';
import type { Fornecedor } from '@/types';

export default function Fornecedores() {
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
  const [dialog, setDialog] = useState<{ open: boolean; fornecedor: Fornecedor | null }>({ open: false, fornecedor: null });

  const { data: fornecedores = [], isLoading } = useFornecedores(pizzariaId);
  const toggle = useToggleFornecedorAtivo();

  const pizzariaNome = useMemo(() => {
    const m = new Map(pizzarias.map((p) => [p.id, p.nome]));
    return (id: string) => m.get(id) ?? id.slice(0, 8);
  }, [pizzarias]);

  const filtrados = useMemo(() => {
    const s = search.trim().toLowerCase();
    return fornecedores.filter((f) => {
      if (!mostrarInativos && !f.ativo) return false;
      if (!s) return true;
      return (
        f.razao_social.toLowerCase().includes(s) ||
        (f.nome_fantasia ?? '').toLowerCase().includes(s) ||
        (f.cnpj ?? '').toLowerCase().includes(s)
      );
    });
  }, [fornecedores, search, mostrarInativos]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Fornecedores</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? 'Carregando...' : `${filtrados.length} fornecedor(es)`}
          </p>
        </div>
        {podeEditar && (
          <Button onClick={() => setDialog({ open: true, fornecedor: null })}>
            <Plus className="w-4 h-4 mr-1" /> Novo fornecedor
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por razão social, fantasia ou CNPJ..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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
                <TableHead>Razão Social</TableHead>
                {verTodas && <TableHead>Pizzaria</TableHead>}
                <TableHead>CNPJ</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={verTodas ? 6 : 5} className="text-center text-sm text-muted-foreground py-6">
                    {fornecedores.length === 0 ? 'Nenhum fornecedor cadastrado.' : 'Nenhum fornecedor casa com o filtro.'}
                  </TableCell>
                </TableRow>
              ) : (
                filtrados.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>
                      <div className="font-medium">{f.razao_social}</div>
                      {f.nome_fantasia && <div className="text-xs text-muted-foreground">{f.nome_fantasia}</div>}
                    </TableCell>
                    {verTodas && (
                      <TableCell>
                        {f.pizzaria_id ? (
                          <Badge variant="outline">{pizzariaNome(f.pizzaria_id)}</Badge>
                        ) : (
                          <Badge variant="secondary">Ambas</Badge>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="font-mono text-xs">{f.cnpj ?? '—'}</TableCell>
                    <TableCell className="text-sm">
                      {f.contato ?? '—'}
                      {f.telefone && <div className="text-xs text-muted-foreground">{f.telefone}</div>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={f.ativo ? 'default' : 'secondary'}>{f.ativo ? 'Ativo' : 'Inativo'}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {podeEditar && (
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => setDialog({ open: true, fornecedor: f })} title="Editar">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => toggle.mutate({ id: f.id, ativo: !f.ativo })} title={f.ativo ? 'Inativar' : 'Reativar'}>
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

      <FornecedorDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((s) => ({ ...s, open }))}
        fornecedor={dialog.fornecedor}
        pizzariaIdFixo={verTodas ? null : currentPizzaria?.id ?? null}
      />
    </div>
  );
}
