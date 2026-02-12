-- Fix Financial Audit Migration
-- Addresses 6 schema issues found during financial audit
-- Run this in your Supabase SQL Editor

-- ============================================
-- TASK #1: Add 'canceled' and 'disputed' to payments status CHECK constraint
-- The webhook writes status='canceled' and we need 'disputed' for dispute handling.
-- Current: ('pending','processing','succeeded','failed','refunded')
-- ============================================

-- Drop existing CHECK constraint on payments.status (handles auto-generated names)
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
  JOIN pg_attribute att ON att.attnum = ANY(con.conkey) AND att.attrelid = con.conrelid
  WHERE con.conrelid = 'public.payments'::regclass
    AND con.contype = 'c'
    AND att.attname = 'status'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.payments DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded', 'canceled', 'disputed'));

-- ============================================
-- TASK #2: Add invoice RLS policies for INSERT/UPDATE/DELETE for team members
-- Currently only admin can INSERT/UPDATE/DELETE invoices.
-- Team members (admin + member) should be able to manage invoices.
-- ============================================

-- Drop existing admin-only policies
DROP POLICY IF EXISTS "Admins can insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admins can update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admins can delete invoices" ON public.invoices;

-- Recreate with team member access (admin + member)
CREATE POLICY "Team members can insert invoices" ON public.invoices
  FOR INSERT WITH CHECK (public.get_user_role() IN ('admin', 'member'));

CREATE POLICY "Team members can update invoices" ON public.invoices
  FOR UPDATE USING (public.get_user_role() IN ('admin', 'member'));

CREATE POLICY "Team members can delete invoices" ON public.invoices
  FOR DELETE USING (public.get_user_role() IN ('admin', 'member'));

-- Add client SELECT policy so clients can view their own invoices
CREATE POLICY "Clients can view their own invoices" ON public.invoices
  FOR SELECT USING (
    client_id IN (
      SELECT c.id FROM public.clients c
      JOIN public.profiles pr ON pr.client_id = c.id
      WHERE pr.id = auth.uid()
    )
  );

-- ============================================
-- TASK #3: Make invoices.due_date nullable
-- Draft invoices may not have a due date yet.
-- The API sends due_date: null for drafts.
-- ============================================

ALTER TABLE public.invoices
  ALTER COLUMN due_date DROP NOT NULL;

-- ============================================
-- TASK #4: Fix project_financial_summary view to use total_amount
-- The outstanding_invoices subquery uses `amount` (pre-tax) instead of
-- `total_amount` (with tax included).
-- ============================================

CREATE OR REPLACE VIEW public.project_financial_summary AS
SELECT
    p.id AS project_id,
    p.name AS project_name,
    p.budget AS client_budget,
    p.internal_budget_cap,

    -- Total expenses (internal cost)
    COALESCE(SUM(e.total), 0) AS total_expense_cost,

    -- Total client charges from expenses
    COALESCE(SUM(e.client_price), 0) AS total_expense_client_charges,

    -- Total labor cost
    COALESCE((SELECT SUM(actual_cost) FROM public.labor_entries WHERE project_id = p.id), 0) AS total_labor_cost,

    -- Total internal cost (expenses + labor)
    COALESCE(SUM(e.total), 0) +
    COALESCE((SELECT SUM(actual_cost) FROM public.labor_entries WHERE project_id = p.id), 0) AS total_internal_cost,

    -- Total client charges
    COALESCE(SUM(e.client_price), 0) AS total_client_charges,

    -- Gross profit
    COALESCE(SUM(e.client_price), 0) -
    (COALESCE(SUM(e.total), 0) + COALESCE((SELECT SUM(actual_cost) FROM public.labor_entries WHERE project_id = p.id), 0)) AS gross_profit,

    -- Remaining budget
    p.budget - COALESCE(SUM(e.client_price), 0) AS remaining_budget,

    -- Outstanding invoices (FIXED: use total_amount instead of amount)
    COALESCE((SELECT SUM(total_amount) FROM public.invoices WHERE project_id = p.id AND status IN ('sent', 'overdue')), 0) AS outstanding_invoices

FROM public.projects p
LEFT JOIN public.expenses e ON e.project_id = p.id
GROUP BY p.id, p.name, p.budget, p.internal_budget_cap;

-- ============================================
-- TASK #5: Add paid_at column to payments table
-- The webhook inserts paid_at but the column doesn't exist on payments.
-- (Note: invoices already has paid_at; this adds it to payments.)
-- ============================================

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- ============================================
-- TASK #6: Create invoice number sequence and helper function
-- Replaces the query-and-increment pattern that has a race condition.
-- Start value accounts for any existing invoice numbers.
-- ============================================

-- Determine the current max invoice number and create/advance the sequence.
-- Invoice numbers follow the format 'INV-NNNN'.
DO $$
DECLARE
  max_num INTEGER;
  seq_exists BOOLEAN;
BEGIN
  -- Find the highest existing invoice number
  SELECT COALESCE(
    MAX(
      CASE
        WHEN invoice_number ~ '^INV-[0-9]+$'
        THEN CAST(SUBSTRING(invoice_number FROM 5) AS INTEGER)
        ELSE 0
      END
    ), 0
  ) INTO max_num
  FROM public.invoices;

  -- Check if sequence already exists
  SELECT EXISTS (
    SELECT 1 FROM pg_sequences
    WHERE schemaname = 'public' AND sequencename = 'invoice_number_seq'
  ) INTO seq_exists;

  IF NOT seq_exists THEN
    -- Create the sequence starting after the current max
    EXECUTE format('CREATE SEQUENCE public.invoice_number_seq START %s', max_num + 1);
  ELSE
    -- Sequence exists; advance it past the current max if needed
    IF max_num > 0 THEN
      PERFORM setval('public.invoice_number_seq', max_num);
    END IF;
  END IF;
END $$;

-- Atomic invoice number generation function
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT AS $$
  SELECT 'INV-' || LPAD(nextval('public.invoice_number_seq')::TEXT, 4, '0');
$$ LANGUAGE SQL;
