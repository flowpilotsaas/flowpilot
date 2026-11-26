-- Add direction column to text_messages (outbound = sent by org, inbound = received from customer)
ALTER TABLE text_messages
  ADD COLUMN IF NOT EXISTS direction TEXT NOT NULL DEFAULT 'outbound';

-- SMS opt-out table: one row per phone that replied STOP to this org
CREATE TABLE IF NOT EXISTS sms_opt_outs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  phone      TEXT        NOT NULL,  -- E.164 e.g. +15551234567
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, phone)
);

ALTER TABLE sms_opt_outs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_read_own_org_opt_outs" ON sms_opt_outs
  FOR SELECT USING (
    org_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
