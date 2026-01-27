-- ============================================
-- LEADS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    company TEXT,
    subject TEXT,
    message TEXT NOT NULL,
    source TEXT DEFAULT 'website' CHECK (source IN ('website', 'referral', 'social', 'event', 'other')),
    source_page TEXT,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'proposal', 'converted', 'lost')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    last_contacted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for leads
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON public.leads(priority);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_source ON public.leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);

-- RLS for leads
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all leads
CREATE POLICY "authenticated_view_leads" ON public.leads
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to create leads
CREATE POLICY "authenticated_insert_leads" ON public.leads
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update leads
CREATE POLICY "authenticated_update_leads" ON public.leads
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete leads
CREATE POLICY "authenticated_delete_leads" ON public.leads
    FOR DELETE USING (auth.role() = 'authenticated');

-- Allow anonymous users to submit leads (from website contact forms)
CREATE POLICY "anon_submit_leads" ON public.leads
    FOR INSERT WITH CHECK (true);

-- ============================================
-- LEAD ACTIVITIES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.lead_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('note', 'email', 'call', 'meeting', 'ai_assist', 'status_change')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lead_activities
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON public.lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_type ON public.lead_activities(type);
CREATE INDEX IF NOT EXISTS idx_lead_activities_created_at ON public.lead_activities(created_at DESC);

-- RLS for lead_activities
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_view_lead_activities" ON public.lead_activities
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_insert_lead_activities" ON public.lead_activities
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated_delete_lead_activities" ON public.lead_activities
    FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================
-- CLIENT INVITATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.client_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    invited_by UUID REFERENCES public.profiles(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for client_invitations
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.client_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_client ON public.client_invitations(client_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.client_invitations(status);

-- RLS for client_invitations
ALTER TABLE public.client_invitations ENABLE ROW LEVEL SECURITY;

-- Admin/member can manage invitations
CREATE POLICY "admin_member_manage_invitations" ON public.client_invitations
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
    );

-- Anyone can read by token (for accepting invitations)
CREATE POLICY "anyone_read_by_token" ON public.client_invitations
    FOR SELECT USING (true);

-- ============================================
-- TRIGGER FOR UPDATED_AT
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for leads
DROP TRIGGER IF EXISTS update_leads_updated_at ON public.leads;
CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
