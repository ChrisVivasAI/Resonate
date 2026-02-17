-- Add payment tracking columns to labor_entries
ALTER TABLE labor_entries
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'owed' CHECK (payment_status IN ('owed', 'paid')),
  ADD COLUMN IF NOT EXISTS payment_date DATE,
  ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Index for querying by team member + payment status
CREATE INDEX IF NOT EXISTS idx_labor_entries_payment_status ON labor_entries (payment_status);
CREATE INDEX IF NOT EXISTS idx_labor_entries_team_member_payment ON labor_entries (team_member_id, payment_status);
