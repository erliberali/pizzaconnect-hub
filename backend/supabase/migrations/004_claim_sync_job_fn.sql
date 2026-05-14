CREATE OR REPLACE FUNCTION claim_sync_job()
RETURNS sync_job
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job sync_job;
BEGIN
  UPDATE sync_job
  SET status = 'running', started_at = now()
  WHERE id = (
    SELECT id FROM sync_job
    WHERE status = 'queued'
    ORDER BY created_at
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  RETURNING * INTO v_job;
  RETURN v_job;
END;
$$;

REVOKE EXECUTE ON FUNCTION claim_sync_job() FROM anon;
GRANT EXECUTE ON FUNCTION claim_sync_job() TO service_role;
