// backend/src/integracoes/sync-worker/sync-worker.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { CardapioWebImporterService, ImportProgress } from '../cardapioweb/cardapioweb.importer.service';

const STUCK_JOB_THRESHOLD_MIN = 15;
const PROGRESS_DEBOUNCE_MS = 2000;

// Parse 'YYYY-MM-DD' como data local (evita conversão UTC que recua um dia em BRT)
function parseDateLocal(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

@Injectable()
export class SyncWorkerService implements OnModuleInit {
  private readonly logger = new Logger(SyncWorkerService.name);
  private busy = false;

  constructor(
    private supabase: SupabaseService,
    private importer: CardapioWebImporterService,
  ) {}

  async onModuleInit() {
    await this.resetStuckJobs();
  }

  @Cron('*/5 * * * * *', { name: 'sync-worker' })
  async tick() {
    if (this.busy) return;
    this.busy = true;
    try {
      const job = await this.claimNextJob();
      if (!job) return;
      await this.processJob(job);
    } catch (err: any) {
      this.logger.error(`Worker tick error: ${err.message}`);
    } finally {
      this.busy = false;
    }
  }

  private async claimNextJob(): Promise<any | null> {
    // Usa RPC porque supabase-js não suporta SELECT FOR UPDATE diretamente.
    // Alternativa: chamada SQL via .rpc('claim_sync_job').
    // Para esta iteração, fazemos a estratégia "update returning" otimista.
    const { data, error } = await this.supabase.db.rpc('claim_sync_job');
    if (error) {
      this.logger.error(`claim_sync_job: ${error.message}`);
      return null;
    }
    const row = Array.isArray(data) ? data[0] : data;
    // A função SQL retorna uma row com todos os campos null quando não há job
    // (porque RETURNING não preenche v_job quando o UPDATE não afeta linhas).
    if (!row || !row.id) return null;
    return row;
  }

  private async processJob(job: any) {
    this.logger.log(`Processing job ${job.id} (${job.periodo_inicio} → ${job.periodo_fim})`);
    let lastProgressAt = 0;

    const onProgress = async (p: ImportProgress) => {
      const now = Date.now();
      if (now - lastProgressAt < PROGRESS_DEBOUNCE_MS) return;
      lastProgressAt = now;
      try {
        await this.supabase.db
          .from('sync_job')
          .update({
            current_page: p.current_page,
            total_pages: p.total_pages,
            processed_count: p.processed_count,
            total_count: p.total_count,
          })
          .eq('id', job.id);
      } catch (e: any) {
        this.logger.warn(`Job ${job.id}: falha ao atualizar progresso: ${e?.message ?? e}`);
      }
    };

    try {
      const result = await this.importer.importarPeriodo(
        job.credencial_id,
        parseDateLocal(job.periodo_inicio),
        parseDateLocal(job.periodo_fim),
        onProgress,
      );

      await this.supabase.db
        .from('sync_job')
        .update({
          status: 'completed',
          finished_at: new Date().toISOString(),
          imported_count: result.importados,
          updated_count: result.atualizados,
          error_count: result.erros,
          processed_count: result.importados + result.atualizados + result.erros,
        })
        .eq('id', job.id);

      this.logger.log(`Job ${job.id} completed: ${JSON.stringify(result)}`);
    } catch (err: any) {
      this.logger.error(`Job ${job.id} failed: ${err.message}`);
      await this.supabase.db
        .from('sync_job')
        .update({
          status: 'failed',
          finished_at: new Date().toISOString(),
          error_message: String(err.message ?? err).slice(0, 1000),
        })
        .eq('id', job.id);
    }
  }

  private async resetStuckJobs() {
    const cutoff = new Date(Date.now() - STUCK_JOB_THRESHOLD_MIN * 60_000).toISOString();
    const { error, count } = await this.supabase.db
      .from('sync_job')
      .update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        error_message: 'worker reiniciado',
      }, { count: 'exact' })
      .eq('status', 'running')
      .lt('started_at', cutoff);
    if (error) this.logger.warn(`resetStuckJobs: ${error.message}`);
    else if (count) this.logger.warn(`${count} job(s) presos foram marcados como failed`);
  }
}
