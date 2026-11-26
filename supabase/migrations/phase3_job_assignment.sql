-- Add technician assignment column to jobs
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index for quick lookups (overlap check, schedule view)
CREATE INDEX IF NOT EXISTS idx_jobs_assigned_to ON jobs(assigned_to);
CREATE INDEX IF NOT EXISTS idx_jobs_assigned_date ON jobs(assigned_to, scheduled_date);
