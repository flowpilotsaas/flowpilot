-- Add display name to organization members
ALTER TABLE organization_members
  ADD COLUMN IF NOT EXISTS display_name TEXT;
