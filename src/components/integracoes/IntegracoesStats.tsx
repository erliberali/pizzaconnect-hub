import { Card, CardContent } from '@/components/ui/card';
import { Link2, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { useIntegracoesStats } from '@/hooks/integracoes';

export function IntegracoesStats({ pizzariaId }: { pizzariaId?: string | null }) {
  const { data } = useIntegracoesStats(pizzariaId);
  const cards = [
    { icon: Link2, label: 'Credenciais ativas', value: data?.credenciaisAtivas ?? 0, color: 'text-primary' },
    { icon: RefreshCw, label: 'Sync rodando', value: data?.syncRodando ?? 0, color: 'text-info' },
    { icon: CheckCircle, label: 'Pedidos importados (7d)', value: data?.pedidos7d ?? 0, color: 'text-success' },
    { icon: AlertTriangle, label: 'Falhas (7d)', value: data?.falhas7d ?? 0, color: 'text-destructive' },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ icon: Icon, label, value, color }) => (
        <Card key={label}>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <Icon className={`w-5 h-5 ${color}`} />
            <div>
              <p className="text-2xl font-display font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
