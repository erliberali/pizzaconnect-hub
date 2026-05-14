import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { SyncJob } from '@/types';

const statusVariant: Record<SyncJob['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  queued: { label: 'Na fila', variant: 'secondary' },
  running: { label: 'Rodando', variant: 'default' },
  completed: { label: 'Concluído', variant: 'outline' },
  failed: { label: 'Falhou', variant: 'destructive' },
};

const fmt = (d?: string | null) => d ? new Date(d).toLocaleString('pt-BR') : '—';
const fmtRange = (a: string, b: string) => `${a.split('-').reverse().join('/')} → ${b.split('-').reverse().join('/')}`;
const duracao = (job: SyncJob): string => {
  if (!job.started_at) return '—';
  const end = job.finished_at ? new Date(job.finished_at).getTime() : Date.now();
  const ms = end - new Date(job.started_at).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m${s % 60}s`;
};

export function SyncJobRow({ job, onClick }: { job: SyncJob; onClick?: () => void }) {
  const st = statusVariant[job.status];
  const pct = job.total_pages && job.current_page ? Math.round((job.current_page / job.total_pages) * 100) : 0;
  return (
    <TableRow className={onClick ? 'cursor-pointer hover:bg-muted/30' : ''} onClick={onClick}>
      <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
      <TableCell className="text-xs">{fmtRange(job.periodo_inicio, job.periodo_fim)}</TableCell>
      <TableCell className="w-48">
        {job.status === 'running' ? (
          <div className="space-y-1">
            <Progress value={pct} className="h-1.5" />
            <p className="text-[10px] text-muted-foreground">
              p{job.current_page ?? 0}/{job.total_pages ?? '?'} — {job.processed_count ?? 0}/{job.total_count ?? '?'} pedidos
            </p>
          </div>
        ) : <span className="text-xs text-muted-foreground">—</span>}
      </TableCell>
      <TableCell className="text-xs">
        <span className="text-success">{job.imported_count}</span> /{' '}
        <span className="text-info">{job.updated_count}</span> /{' '}
        <span className="text-destructive">{job.error_count}</span>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{fmt(job.started_at)}</TableCell>
      <TableCell className="text-xs">{duracao(job)}</TableCell>
    </TableRow>
  );
}
