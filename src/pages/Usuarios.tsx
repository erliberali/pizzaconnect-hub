import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTenant } from '@/contexts/TenantContext';
import { mockUsers, mockMemberships, mockPizzarias } from '@/mocks/data';
import type { UserRole } from '@/types';

const roleLabel: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin_pizzaria: 'Admin Pizzaria',
  gestor: 'Gestor',
  operacao: 'Operação',
  financeiro: 'Financeiro',
  leitura: 'Leitura',
};

const roleVariant: Record<UserRole, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  super_admin: 'destructive',
  admin_pizzaria: 'default',
  gestor: 'default',
  operacao: 'secondary',
  financeiro: 'secondary',
  leitura: 'outline',
};

export default function Usuarios() {
  const { currentPizzaria, isConsolidated } = useTenant();

  const memberships = useMemo(() => {
    let list = mockMemberships;
    if (!isConsolidated) list = list.filter(m => m.pizzaria_id === currentPizzaria?.id);
    return list.map(m => ({
      ...m,
      user: mockUsers.find(u => u.id === m.user_id)!,
      pizzaria: mockPizzarias.find(p => p.id === m.pizzaria_id)!,
    }));
  }, [currentPizzaria, isConsolidated]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Usuários</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie membros e permissões por pizzaria</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Membros</CardTitle>
          <CardDescription>{memberships.length} membro(s) encontrado(s)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                {isConsolidated && <TableHead>Pizzaria</TableHead>}
                <TableHead>Função</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {memberships.map(m => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.user?.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{m.user?.email}</TableCell>
                  {isConsolidated && <TableCell>{m.pizzaria?.nome}</TableCell>}
                  <TableCell><Badge variant={roleVariant[m.role]}>{roleLabel[m.role]}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
