-- Add deposit_percentage to projects table
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS deposit_percentage DECIMAL(5,2) DEFAULT 50;

-- Add milestone_id FK to invoices table (links invoices to milestones)
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS milestone_id UUID REFERENCES public.milestones(id) ON DELETE SET NULL;

-- Add invoice_type to invoices table
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'custom'
  CHECK (invoice_type IN ('deposit', 'milestone', 'custom'));

-- Add stripe_invoice_url for hosted invoice link
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS stripe_invoice_url TEXT;

-- Add index on milestone_id for efficient lookups
CREATE INDEX IF NOT EXISTS idx_invoices_milestone_id ON public.invoices(milestone_id);

-- Add index on stripe_invoice_id for webhook lookups
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_invoice_id ON public.invoices(stripe_invoice_id);

-- Add FK from payments.invoice_id to invoices.id if not already present
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'payments_invoice_id_fkey'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_invoice_id_fkey
      FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;
  END IF;
END $$;
