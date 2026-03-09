import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTenant } from '@/contexts/TenantContext';
import { mockPedidos, mockPizzarias } from '@/mocks/data';
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
  const today = new Date().toISOString().split('T')[0];
  const pedidosHoje = pedidos.filter(p => p.created_at_origem.split('T')[0] === today);
  const cancelados = pedidosHoje.filter(p => p.status === 'cancelado');
  const naoCanc = pedidosHoje.filter(p => p.status !== 'cancelado');
  const faturamento = naoCanc.reduce((s, p) => s + p.total_liquido, 0);

  const porCanal = { delivery: 0, mesa: 0, balcao: 0, retirada: 0 };
  const fatCanal = { delivery: 0, mesa: 0, balcao: 0, retirada: 0 };
  pedidosHoje.forEach(p => {
    porCanal[p.canal]++;
    if (p.status !== 'cancelado') fatCanal[p.canal] += p.total_liquido;
  });

  return {
    pedidos_dia: pedidosHoje.length,
    faturamento_dia: faturamento,
    ticket_medio: naoCanc.length > 0 ? faturamento / naoCanc.length : 0,
    cancelamentos_dia: cancelados.length,
    pedidos_por_canal: porCanal,
    faturamento_por_canal: fatCanal,
  };
}

function KPICard({ title, value, subtitle, icon }: { title: string; value: string; subtitle?: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-display font-bold mt-1">{value}</p>
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

  const filteredPedidos = useMemo(() => {
    if (isConsolidated) return mockPedidos;
    return mockPedidos.filter(p => p.pizzaria_id === currentPizzaria?.id);
  }, [currentPizzaria, isConsolidated]);

  const kpis = useMemo(() => computeKPIs(filteredPedidos), [filteredPedidos]);

  const pieData = Object.entries(kpis.pedidos_por_canal)
    .filter(([, v]) => v > 0)
    .map(([canal, count]) => ({
      name: canalLabels[canal as PedidoCanal],
      value: count,
      color: canalColors[canal as PedidoCanal],
    }));

  const barData = isConsolidated
    ? mockPizzarias.map(pz => {
        const pzPedidos = filteredPedidos.filter(p => p.pizzaria_id === pz.id);
        const pzKpis = computeKPIs(pzPedidos);
        return { name: pz.nome.replace('Pizzaria ', ''), faturamento: Math.round(pzKpis.faturamento_dia), pedidos: pzKpis.pedidos_dia };
      })
    : Object.entries(kpis.faturamento_por_canal)
        .filter(([, v]) => v > 0)
        .map(([canal, val]) => ({ name: canalLabels[canal as PedidoCanal], faturamento: Math.round(val) }));

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
        <KPICard title="Pedidos Hoje" value={String(kpis.pedidos_dia)} icon={<ShoppingBag className="w-5 h-5" />} />
        <KPICard title="Faturamento" value={fmt(kpis.faturamento_dia)} icon={<DollarSign className="w-5 h-5" />} />
        <KPICard title="Ticket Médio" value={fmt(kpis.ticket_medio)} icon={<TrendingUp className="w-5 h-5" />} />
        <KPICard title="Cancelamentos" value={String(kpis.cancelamentos_dia)} subtitle={kpis.pedidos_dia > 0 ? `${((kpis.cancelamentos_dia / kpis.pedidos_dia) * 100).toFixed(1)}% dos pedidos` : undefined} icon={<XCircle className="w-5 h-5" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pedidos por Canal</CardTitle>
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
                  <span className="font-semibold">{kpis.pedidos_por_canal[canal]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isConsolidated ? 'Faturamento por Pizzaria' : 'Faturamento por Canal'}
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
              <p className="text-muted-foreground text-sm text-center py-10">Sem dados</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
