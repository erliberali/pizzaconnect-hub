CREATE TYPE sync_job_status AS ENUM ('queued', 'running', 'completed', 'failed');

CREATE TABLE sync_job (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credencial_id UUID NOT NULL REFERENCES integracao_credencial(id) ON DELETE CASCADE,
  pizzaria_id UUID NOT NULL REFERENCES pizzaria(id) ON DELETE CASCADE,
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  status sync_job_status NOT NULL DEFAULT 'queued',
  total_pages INT,
  current_page INT,
  total_count INT,
  processed_count INT,
  imported_count INT NOT NULL DEFAULT 0,
  updated_count INT NOT NULL DEFAULT 0,
  error_count INT NOT NULL DEFAULT 0,
  error_message TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE INDEX sync_job_status_created_idx ON sync_job (status, created_at);
CREATE INDEX sync_job_credencial_created_idx ON sync_job (credencial_id, created_at DESC);

ALTER TABLE sync_job ENABLE ROW LEVEL SECURITY;

CREATE POLICY sync_job_select_anon ON sync_job
  FOR SELECT TO anon
  USING (true);

CREATE POLICY sync_job_insert_anon ON sync_job
  FOR INSERT TO anon
  WITH CHECK (status = 'queued');

CREATE POLICY sync_job_update_service_role ON sync_job
  FOR UPDATE TO service_role
  USING (true) WITH CHECK (true);
