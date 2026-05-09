import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTenant } from '@/contexts/TenantContext';
import { usePedidosHoje } from '@/hooks/usePedidos';
import { usePizzarias } from '@/hooks/usePizzarias';
import type { Pedido, PedidoCanal, DashboardKPIs } from '@/types';
import { ShoppingBag, DollarSign, TrendingUp, XCircle, Truck, UtensilsCrossed, Store, Package } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const canalIcons: Record<PedidoCanal, React.ReactNode> = {
  delivery: <Truck className="w-4 h-4" />,
  mesa: <UtensilsCrossed className="w-4 h-4" />,
  balcao: <Store className="w-4 h-4" />,
  retirada: <Package className="w-4 h-4" />,
};

const canalColors: Record<PedidoCanal, string> = {
  delivery: 'hsl(15, 90%, 55%)',
  mesa: 'hsl(210, 80%, 52%)',
  balcao: 'hsl(142, 72%, 42%)',
  retirada: 'hsl(38, 92%, 50%)',
};

const canalLabels: Record<PedidoCanal, string> = {
  delivery: 'Delivery',
  mesa: 'Mesa',
  balcao: 'Balcão',
  retirada: 'Retirada',
};

function computeKPIs(pedidos: Pedido[]): DashboardKPIs {
  const cancelados = pedidos.filter(p => p.status === 'cancelado');
  const naoCanc = pedidos.filter(p => p.status !== 'cancelado');
  const faturamento = naoCanc.reduce((s, p) => s + p.total_liquido, 0);

  const porCanal = { delivery: 0, mesa: 0, balcao: 0, retirada: 0 };
  const fatCanal = { delivery: 0, mesa: 0, balcao: 0, retirada: 0 };
  pedidos.forEach(p => {
    porCanal[p.canal] = (porCanal[p.canal] ?? 0) + 1;
    if (p.status !== 'cancelado') fatCanal[p.canal] = (fatCanal[p.canal] ?? 0) + p.total_liquido;
  });

  return {
    pedidos_dia: pedidos.length,
    faturamento_dia: faturamento,
    ticket_medio: naoCanc.length > 0 ? faturamento / naoCanc.length : 0,
    cancelamentos_dia: cancelados.length,
    pedidos_por_canal: porCanal,
    faturamento_por_canal: fatCanal,
  };
}

function KPICard({ title, value, subtitle, icon, loading }: { title: string; value: string; subtitle?: string; icon: React.ReactNode; loading?: boolean }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            {loading ? <Skeleton className="h-8 w-24 mt-1" /> : <p className="text-2xl font-display font-bold mt-1">{value}</p>}
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { currentPizzaria, isConsolidated } = useTenant();
  const { data: pedidosHoje = [], isLoading } = usePedidosHoje(isConsolidated ? null : currentPizzaria?.id);
  const { data: pizzarias = [] } = usePizzarias();

  const kpis = computeKPIs(pedidosHoje);

  const pieData = Object.entries(kpis.pedidos_por_canal)
    .filter(([, v]) => v > 0)
    .map(([canal, count]) => ({
      name: canalLabels[canal as PedidoCanal],
      value: count,
      color: canalColors[canal as PedidoCanal],
    }));

  const barData = isConsolidated
    ? pizzarias.map(pz => {
        const pzPedidos = pedidosHoje.filter(p => p.pizzaria_id === pz.id);
        const pzKpis = computeKPIs(pzPedidos);
        return { name: pz.nome.replace('Pizzaria ', ''), faturamento: Math.round(pzKpis.faturamento_dia), pedidos: pzKpis.pedidos_dia };
      })
    : Object.entries(kpis.faturamento_por_canal)
        .filter(([, v]) => v > 0)
        .map(([canal, val]) => ({ name: canalLabels[canal as PedidoCanal], faturamento: Math.round(val as number) }));

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isConsolidated ? 'Visão consolidada — todas as pizzarias' : currentPizzaria?.nome}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard loading={isLoading} title="Pedidos Hoje" value={String(kpis.pedidos_dia)} icon={<ShoppingBag className="w-5 h-5" />} />
        <KPICard loading={isLoading} title="Faturamento" value={fmt(kpis.faturamento_dia)} icon={<DollarSign className="w-5 h-5" />} />
        <KPICard loading={isLoading} title="Ticket Médio" value={fmt(kpis.ticket_medio)} icon={<TrendingUp className="w-5 h-5" />} />
        <KPICard loading={isLoading} title="Cancelamentos" value={String(kpis.cancelamentos_dia)}
          subtitle={kpis.pedidos_dia > 0 ? `${((kpis.cancelamentos_dia / kpis.pedidos_dia) * 100).toFixed(1)}% dos pedidos` : undefined}
          icon={<XCircle className="w-5 h-5" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pedidos por Canal — Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" paddingAngle={3}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-10">Sem pedidos hoje</p>
            )}
            <div className="grid grid-cols-2 gap-3 mt-4">
              {(Object.keys(canalLabels) as PedidoCanal[]).map(canal => (
                <div key={canal} className="flex items-center gap-2 text-sm">
                  {canalIcons[canal]}
                  <span className="text-muted-foreground">{canalLabels[canal]}:</span>
                  <span className="font-semibold">{kpis.pedidos_por_canal[canal] ?? 0}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isConsolidated ? 'Faturamento por Pizzaria — Hoje' : 'Faturamento por Canal — Hoje'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="faturamento" fill="hsl(15, 90%, 55%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-10">Sem dados hoje</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
