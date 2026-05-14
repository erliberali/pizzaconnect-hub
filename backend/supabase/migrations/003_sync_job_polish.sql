-- Ajustes de qualidade no sync_job apontados na revisão da Task 1
ALTER TABLE sync_job
  ALTER COLUMN processed_count SET DEFAULT 0,
  ALTER COLUMN processed_count SET NOT NULL;

-- Índice parcial é menor e mais rápido para o worker que só filtra status='queued'
DROP INDEX IF EXISTS sync_job_status_created_idx;
CREATE INDEX sync_job_queued_idx ON sync_job (created_at) WHERE status = 'queued';
