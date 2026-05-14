import { Badge } from '@/components/ui/badge';
import type { NotaCompraStatus } from '@/types';

const variantMap: Record<NotaCompraStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  rascunho: 'outline',
  lancada: 'default',
  cancelada: 'destructive',
};

const labelMap: Record<NotaCompraStatus, string> = {
  rascunho: 'Rascunho',
  lancada: 'Lançada',
  cancelada: 'Cancelada',
};

export function StatusNotaBadge({ status }: { status: NotaCompraStatus }) {
  return <Badge variant={variantMap[status]}>{labelMap[status]}</Badge>;
}
