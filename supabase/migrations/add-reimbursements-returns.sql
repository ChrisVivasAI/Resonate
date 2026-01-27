-- Migration: Add reimbursements and returns tracking
-- This tracks:
-- 1. Reimbursements: When team members spend their own money and need to be paid back
-- 2. Returns: When items are returned to vendors and money is received back

-- =====================================================
-- REIMBURSEMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS reimbursements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,

  -- Who needs to be reimbursed
  person_name TEXT NOT NULL,
  person_email TEXT,

  -- What was purchased
  description TEXT NOT NULL,
  category TEXT DEFAULT 'Other',
  vendor TEXT,

  -- Money details
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),

  -- Dates
  date_incurred DATE NOT NULL DEFAULT CURRENT_DATE,
  date_requested DATE DEFAULT CURRENT_DATE,
  date_approved DATE,
  date_paid DATE,

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),

  -- Payment details (when reimbursed)
  payment_method TEXT,
  payment_reference TEXT,

  -- Documentation
  receipt_url TEXT,
  notes TEXT,

  -- Audit
  created_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- RETURNS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS returns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,

  -- Item details
  item_description TEXT NOT NULL,
  vendor TEXT NOT NULL,
  category TEXT DEFAULT 'Props',

  -- Money details
  original_cost DECIMAL(12,2) NOT NULL CHECK (original_cost >= 0),
  return_amount DECIMAL(12,2) NOT NULL CHECK (return_amount >= 0),
  restocking_fee DECIMAL(12,2) DEFAULT 0 CHECK (restocking_fee >= 0),

  -- Net return amount (computed)
  net_return DECIMAL(12,2) GENERATED ALWAYS AS (return_amount - restocking_fee) STORED,

  -- Dates
  purchase_date DATE,
  return_initiated_date DATE DEFAULT CURRENT_DATE,
  return_completed_date DATE,
  refund_received_date DATE,

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'denied', 'partial')),

  -- Refund details
  refund_method TEXT CHECK (refund_method IN ('original_payment', 'store_credit', 'check', 'cash', 'bank_transfer', 'other')),
  refund_reference TEXT,

  -- Return policy info
  return_window_days INTEGER,
  return_policy_notes TEXT,

  -- Documentation
  tracking_number TEXT,
  notes TEXT,

  -- Audit
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_reimbursements_project ON reimbursements(project_id);
CREATE INDEX IF NOT EXISTS idx_reimbursements_status ON reimbursements(status);
CREATE INDEX IF NOT EXISTS idx_reimbursements_person ON reimbursements(person_name);
CREATE INDEX IF NOT EXISTS idx_reimbursements_date_incurred ON reimbursements(date_incurred);

CREATE INDEX IF NOT EXISTS idx_returns_project ON returns(project_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(status);
CREATE INDEX IF NOT EXISTS idx_returns_vendor ON returns(vendor);

-- =====================================================
-- TRIGGERS FOR updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_reimbursements_updated_at ON reimbursements;
CREATE TRIGGER update_reimbursements_updated_at
  BEFORE UPDATE ON reimbursements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_returns_updated_at ON returns;
CREATE TRIGGER update_returns_updated_at
  BEFORE UPDATE ON returns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE reimbursements ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;

-- Reimbursements policies
CREATE POLICY "Users can view reimbursements for their projects"
  ON reimbursements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'member')
    )
  );

CREATE POLICY "Users can insert reimbursements"
  ON reimbursements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'member')
    )
  );

CREATE POLICY "Users can update reimbursements"
  ON reimbursements FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'member')
    )
  );

CREATE POLICY "Admins can delete reimbursements"
  ON reimbursements FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Returns policies
CREATE POLICY "Users can view returns for their projects"
  ON returns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'member')
    )
  );

CREATE POLICY "Users can insert returns"
  ON returns FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'member')
    )
  );

CREATE POLICY "Users can update returns"
  ON returns FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'member')
    )
  );

CREATE POLICY "Admins can delete returns"
  ON returns FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE reimbursements IS 'Tracks reimbursements owed to team members who spent their own money on project expenses';
COMMENT ON TABLE returns IS 'Tracks items returned to vendors and money received back (e.g., prop returns, equipment rentals)';

COMMENT ON COLUMN reimbursements.status IS 'pending: awaiting approval, approved: approved but not paid, rejected: denied, paid: reimbursement complete';
COMMENT ON COLUMN returns.status IS 'pending: return not started, in_progress: return initiated, completed: refund received, denied: return rejected, partial: partial refund received';
COMMENT ON COLUMN returns.net_return IS 'Computed: return_amount minus restocking_fee';
