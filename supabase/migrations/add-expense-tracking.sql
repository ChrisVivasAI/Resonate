-- Expense Tracking System Migration
-- Run this in your Supabase SQL Editor

-- ============================================
-- UPDATE PROJECTS TABLE
-- ============================================

-- Add new fields to projects table
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS project_type TEXT,
ADD COLUMN IF NOT EXISTS project_manager_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS internal_lead_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS internal_budget_cap DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_terms TEXT;

-- ============================================
-- EXPENSES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    category TEXT NOT NULL,
    description TEXT,
    vendor_or_person TEXT,
    cost_pre_tax DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) GENERATED ALWAYS AS (cost_pre_tax + COALESCE(tax, 0)) STORED,
    is_billable BOOLEAN DEFAULT FALSE,
    markup_percent DECIMAL(5,2) DEFAULT 0,
    client_price DECIMAL(10,2) GENERATED ALWAYS AS (
        CASE WHEN is_billable THEN (cost_pre_tax + COALESCE(tax, 0)) * (1 + COALESCE(markup_percent, 0) / 100)
        ELSE 0 END
    ) STORED,
    is_paid BOOLEAN DEFAULT FALSE,
    payment_method TEXT,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LABOR / TIME TRACKING TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.labor_entries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    team_member_id UUID REFERENCES public.profiles(id),
    team_member_name TEXT, -- For external contractors not in profiles
    role TEXT NOT NULL,
    hourly_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
    estimated_hours DECIMAL(8,2) DEFAULT 0,
    actual_hours DECIMAL(8,2) DEFAULT 0,
    estimated_cost DECIMAL(10,2) GENERATED ALWAYS AS (hourly_rate * COALESCE(estimated_hours, 0)) STORED,
    actual_cost DECIMAL(10,2) GENERATED ALWAYS AS (hourly_rate * COALESCE(actual_hours, 0)) STORED,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TIME ENTRIES TABLE (for detailed time logs)
-- ============================================

CREATE TABLE IF NOT EXISTS public.time_entries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    labor_entry_id UUID REFERENCES public.labor_entries(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    hours DECIMAL(5,2) NOT NULL,
    description TEXT,
    is_billable BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EXPENSE CATEGORIES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.expense_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default expense categories
INSERT INTO public.expense_categories (name, description, sort_order) VALUES
    ('Software & Tools', 'Software subscriptions, licenses, and tools', 1),
    ('Stock Media', 'Stock photos, videos, music, and other media', 2),
    ('Equipment', 'Hardware, cameras, and equipment rentals', 3),
    ('Talent & Contractors', 'External contractors, actors, voiceover', 4),
    ('Travel', 'Transportation, lodging, and meals', 5),
    ('Production', 'Sets, props, and production materials', 6),
    ('Marketing', 'Advertising, promotion, and marketing costs', 7),
    ('Miscellaneous', 'Other project-related expenses', 8)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_expenses_project_id ON public.expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_is_billable ON public.expenses(is_billable);
CREATE INDEX IF NOT EXISTS idx_labor_entries_project_id ON public.labor_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_labor_entries_team_member ON public.labor_entries(team_member_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_project_id ON public.time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON public.time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON public.time_entries(date);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labor_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

-- Expenses policies
CREATE POLICY "Team members can view expenses" ON public.expenses
    FOR SELECT USING (public.get_user_role() IN ('admin', 'member'));

CREATE POLICY "Team members can insert expenses" ON public.expenses
    FOR INSERT WITH CHECK (public.get_user_role() IN ('admin', 'member'));

CREATE POLICY "Team members can update expenses" ON public.expenses
    FOR UPDATE USING (public.get_user_role() IN ('admin', 'member'));

CREATE POLICY "Team members can delete expenses" ON public.expenses
    FOR DELETE USING (public.get_user_role() IN ('admin', 'member'));

-- Labor entries policies
CREATE POLICY "Team members can view labor entries" ON public.labor_entries
    FOR SELECT USING (public.get_user_role() IN ('admin', 'member'));

CREATE POLICY "Team members can insert labor entries" ON public.labor_entries
    FOR INSERT WITH CHECK (public.get_user_role() IN ('admin', 'member'));

CREATE POLICY "Team members can update labor entries" ON public.labor_entries
    FOR UPDATE USING (public.get_user_role() IN ('admin', 'member'));

CREATE POLICY "Team members can delete labor entries" ON public.labor_entries
    FOR DELETE USING (public.get_user_role() IN ('admin', 'member'));

-- Time entries policies
CREATE POLICY "Team members can view time entries" ON public.time_entries
    FOR SELECT USING (public.get_user_role() IN ('admin', 'member'));

CREATE POLICY "Team members can insert time entries" ON public.time_entries
    FOR INSERT WITH CHECK (public.get_user_role() IN ('admin', 'member'));

CREATE POLICY "Team members can update time entries" ON public.time_entries
    FOR UPDATE USING (public.get_user_role() IN ('admin', 'member'));

CREATE POLICY "Team members can delete time entries" ON public.time_entries
    FOR DELETE USING (public.get_user_role() IN ('admin', 'member'));

-- Expense categories policies (read-only for most, admin can manage)
CREATE POLICY "Everyone can view expense categories" ON public.expense_categories
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage expense categories" ON public.expense_categories
    FOR ALL USING (public.get_user_role() = 'admin');

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_labor_entries_updated_at BEFORE UPDATE ON public.labor_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VIEWS FOR DASHBOARD CALCULATIONS
-- ============================================

-- Project financial summary view
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

    -- Outstanding invoices
    COALESCE((SELECT SUM(amount) FROM public.invoices WHERE project_id = p.id AND status IN ('sent', 'overdue')), 0) AS outstanding_invoices

FROM public.projects p
LEFT JOIN public.expenses e ON e.project_id = p.id
GROUP BY p.id, p.name, p.budget, p.internal_budget_cap;
