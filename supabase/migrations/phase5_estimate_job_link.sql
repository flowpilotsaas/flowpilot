ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_estimate_id ON jobs(estimate_id);
