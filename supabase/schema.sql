-- Resonate Agency Platform Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member', 'client')),
    client_id UUID, -- Links client users to their client record (added later via FK)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients table
CREATE TABLE public.clients (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    company TEXT,
    avatar_url TEXT,
    status TEXT DEFAULT 'lead' CHECK (status IN ('active', 'inactive', 'lead')),
    stripe_customer_id TEXT,
    notes TEXT,
    profile_id UUID, -- Links to the client's portal account (added later via FK)
    portal_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table
CREATE TABLE public.projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'review', 'completed', 'cancelled')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    budget DECIMAL(10,2) DEFAULT 0,
    spent DECIMAL(10,2) DEFAULT 0,
    start_date DATE,
    due_date DATE,
    completed_at TIMESTAMPTZ,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks table
CREATE TABLE public.tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'completed')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    due_date DATE,
    completed_at TIMESTAMPTZ,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Milestones table
CREATE TABLE public.milestones (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    completed_at TIMESTAMPTZ,
    payment_amount DECIMAL(10,2),
    is_paid BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments table
CREATE TABLE public.payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    invoice_id UUID,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'usd',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded')),
    payment_method TEXT,
    stripe_payment_intent_id TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices table
CREATE TABLE public.invoices (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    invoice_number TEXT NOT NULL UNIQUE,
    amount DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'usd',
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    due_date DATE NOT NULL,
    paid_at TIMESTAMPTZ,
    stripe_invoice_id TEXT,
    line_items JSONB DEFAULT '[]',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Generations table
CREATE TABLE public.ai_generations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('image', 'video', 'music', 'voiceover', 'text')),
    prompt TEXT NOT NULL,
    negative_prompt TEXT,
    model TEXT NOT NULL,
    endpoint_id TEXT,
    request_id TEXT,
    parameters JSONB DEFAULT '{}',
    result_url TEXT,
    result_data JSONB,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    error_message TEXT,
    cost_credits INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Activity log table (legacy - keeping for compatibility)
CREATE TABLE public.activities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PROJECT MANAGEMENT SYSTEM TABLES
-- ============================================

-- Client Invitations - Invite-only client signup
CREATE TABLE public.client_invitations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    invited_by UUID REFERENCES public.profiles(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deliverables - Project content for client review
CREATE TABLE public.deliverables (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    ai_generation_id UUID REFERENCES public.ai_generations(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('image', 'video', 'audio', 'document', 'text')),
    file_url TEXT,
    thumbnail_url TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'approved', 'rejected', 'final')),
    current_version INTEGER DEFAULT 1,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deliverable Versions - Version history for revisions
CREATE TABLE public.deliverable_versions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    deliverable_id UUID REFERENCES public.deliverables(id) ON DELETE CASCADE NOT NULL,
    version_number INTEGER NOT NULL,
    file_url TEXT NOT NULL,
    thumbnail_url TEXT,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments - Feedback on deliverables
CREATE TABLE public.comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    deliverable_id UUID REFERENCES public.deliverables(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE, -- Internal comments hidden from clients
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Approval Records - Track approval/rejection history
CREATE TABLE public.approval_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    deliverable_id UUID REFERENCES public.deliverables(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('approved', 'rejected', 'requested_changes')),
    feedback TEXT,
    version_number INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Monitoring Settings - Per-project AI monitoring config
CREATE TABLE public.project_monitoring_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE UNIQUE NOT NULL,
    monitoring_enabled BOOLEAN DEFAULT TRUE,
    frequency TEXT DEFAULT 'weekly' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
    alert_threshold INTEGER DEFAULT 60 CHECK (alert_threshold >= 0 AND alert_threshold <= 100),
    next_check_at TIMESTAMPTZ,
    last_check_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Health Reports - AI-generated health analysis
CREATE TABLE public.project_health_reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    health_score INTEGER CHECK (health_score >= 0 AND health_score <= 100),
    status TEXT CHECK (status IN ('healthy', 'at_risk', 'critical')),
    summary TEXT,
    analysis JSONB,
    recommendations JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity Feed - Project activity tracking (new system)
CREATE TABLE public.activity_feed (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    activity_type TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    metadata JSONB DEFAULT '{}',
    is_client_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications - User notifications
CREATE TABLE public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraints after tables are created
ALTER TABLE public.profiles ADD CONSTRAINT fk_profiles_client
    FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;

ALTER TABLE public.clients ADD CONSTRAINT fk_clients_profile
    FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX idx_projects_client_id ON public.projects(client_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX idx_payments_client_id ON public.payments(client_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_ai_generations_user_id ON public.ai_generations(user_id);
CREATE INDEX idx_ai_generations_project_id ON public.ai_generations(project_id);
CREATE INDEX idx_activities_user_id ON public.activities(user_id);
CREATE INDEX idx_activities_entity ON public.activities(entity_type, entity_id);

-- New indexes for project management tables
CREATE INDEX idx_client_invitations_token ON public.client_invitations(token);
CREATE INDEX idx_client_invitations_client_id ON public.client_invitations(client_id);
CREATE INDEX idx_client_invitations_status ON public.client_invitations(status);
CREATE INDEX idx_deliverables_project_id ON public.deliverables(project_id);
CREATE INDEX idx_deliverables_status ON public.deliverables(status);
CREATE INDEX idx_deliverables_ai_generation_id ON public.deliverables(ai_generation_id);
CREATE INDEX idx_deliverable_versions_deliverable_id ON public.deliverable_versions(deliverable_id);
CREATE INDEX idx_comments_deliverable_id ON public.comments(deliverable_id);
CREATE INDEX idx_comments_user_id ON public.comments(user_id);
CREATE INDEX idx_approval_records_deliverable_id ON public.approval_records(deliverable_id);
CREATE INDEX idx_project_monitoring_project_id ON public.project_monitoring_settings(project_id);
CREATE INDEX idx_project_health_reports_project_id ON public.project_health_reports(project_id);
CREATE INDEX idx_activity_feed_project_id ON public.activity_feed(project_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);

-- Row Level Security Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliverable_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_monitoring_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_health_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Admin can view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Clients policies (admins and members can manage)
CREATE POLICY "Team members can view clients" ON public.clients
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
    );

CREATE POLICY "Team members can manage clients" ON public.clients
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
    );

-- Projects policies
CREATE POLICY "Team members can view projects" ON public.projects
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
    );

CREATE POLICY "Team members can manage projects" ON public.projects
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
    );

-- Tasks policies
CREATE POLICY "Team members can view tasks" ON public.tasks
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
    );

CREATE POLICY "Team members can manage tasks" ON public.tasks
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
    );

-- Payments policies (admin only for management)
CREATE POLICY "Team members can view payments" ON public.payments
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
    );

CREATE POLICY "Admins can manage payments" ON public.payments
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- AI Generations policies
CREATE POLICY "Users can view their own generations" ON public.ai_generations
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create generations" ON public.ai_generations
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own generations" ON public.ai_generations
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own generations" ON public.ai_generations
    FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- PROJECT MANAGEMENT RLS POLICIES
-- ============================================

-- Client Invitations policies (team members only)
CREATE POLICY "Team members can view invitations" ON public.client_invitations
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
    );

CREATE POLICY "Team members can manage invitations" ON public.client_invitations
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
    );

-- Deliverables policies
CREATE POLICY "Team members can view all deliverables" ON public.deliverables
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
    );

CREATE POLICY "Clients can view their deliverables" ON public.deliverables
    FOR SELECT USING (
        status IN ('in_review', 'approved', 'rejected', 'final')
        AND project_id IN (
            SELECT p.id FROM public.projects p
            JOIN public.clients c ON p.client_id = c.id
            JOIN public.profiles pr ON pr.client_id = c.id
            WHERE pr.id = auth.uid()
        )
    );

CREATE POLICY "Team members can manage deliverables" ON public.deliverables
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
    );

-- Deliverable Versions policies
CREATE POLICY "Team members can view versions" ON public.deliverable_versions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
    );

CREATE POLICY "Clients can view versions of their deliverables" ON public.deliverable_versions
    FOR SELECT USING (
        deliverable_id IN (
            SELECT d.id FROM public.deliverables d
            JOIN public.projects p ON d.project_id = p.id
            JOIN public.clients c ON p.client_id = c.id
            JOIN public.profiles pr ON pr.client_id = c.id
            WHERE pr.id = auth.uid() AND d.status IN ('in_review', 'approved', 'rejected', 'final')
        )
    );

CREATE POLICY "Team members can manage versions" ON public.deliverable_versions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
    );

-- Comments policies
CREATE POLICY "Team members can view all comments" ON public.comments
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
    );

CREATE POLICY "Clients can view non-internal comments" ON public.comments
    FOR SELECT USING (
        is_internal = FALSE
        AND deliverable_id IN (
            SELECT d.id FROM public.deliverables d
            JOIN public.projects p ON d.project_id = p.id
            JOIN public.clients c ON p.client_id = c.id
            JOIN public.profiles pr ON pr.client_id = c.id
            WHERE pr.id = auth.uid()
        )
    );

CREATE POLICY "Team members can manage comments" ON public.comments
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
    );

CREATE POLICY "Clients can add comments" ON public.comments
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND is_internal = FALSE
        AND deliverable_id IN (
            SELECT d.id FROM public.deliverables d
            JOIN public.projects p ON d.project_id = p.id
            JOIN public.clients c ON p.client_id = c.id
            JOIN public.profiles pr ON pr.client_id = c.id
            WHERE pr.id = auth.uid()
        )
    );

-- Approval Records policies
CREATE POLICY "Team members can view approval records" ON public.approval_records
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
    );

CREATE POLICY "Clients can view their approval records" ON public.approval_records
    FOR SELECT USING (
        user_id = auth.uid()
    );

CREATE POLICY "Team members can manage approval records" ON public.approval_records
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
    );

CREATE POLICY "Clients can create approval records" ON public.approval_records
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'client')
    );

-- Project Monitoring Settings policies (team members only)
CREATE POLICY "Team members can view monitoring settings" ON public.project_monitoring_settings
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
    );

CREATE POLICY "Team members can manage monitoring settings" ON public.project_monitoring_settings
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
    );

-- Project Health Reports policies (team members only)
CREATE POLICY "Team members can view health reports" ON public.project_health_reports
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
    );

CREATE POLICY "Team members can manage health reports" ON public.project_health_reports
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
    );

-- Activity Feed policies
CREATE POLICY "Team members can view all activity" ON public.activity_feed
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
    );

CREATE POLICY "Clients can view client-visible activity" ON public.activity_feed
    FOR SELECT USING (
        is_client_visible = TRUE
        AND project_id IN (
            SELECT p.id FROM public.projects p
            JOIN public.clients c ON p.client_id = c.id
            JOIN public.profiles pr ON pr.client_id = c.id
            WHERE pr.id = auth.uid()
        )
    );

CREATE POLICY "Team members can manage activity" ON public.activity_feed
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
    );

-- Notifications policies (users see their own)
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON public.notifications
    FOR INSERT WITH CHECK (TRUE);

-- Helper function to get client_id for the current user (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_client_id()
RETURNS UUID AS $$
  SELECT client_id FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Allow client users to read their own client record
CREATE POLICY "Clients can view own client record" ON public.clients
    FOR SELECT USING (profile_id = auth.uid());

-- Projects policies for clients (view only their projects)
CREATE POLICY "Clients can view their projects" ON public.projects
    FOR SELECT USING (client_id = public.get_client_id());

-- Functions for updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deliverables_updated_at BEFORE UPDATE ON public.deliverables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monitoring_settings_updated_at BEFORE UPDATE ON public.project_monitoring_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- AI PAGE GENERATION TABLES
-- ============================================

-- Generated Pages - Store AI generation jobs for design-to-code conversion
CREATE TABLE public.generated_pages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('svg', 'image')),
    source_url TEXT NOT NULL,
    source_filename TEXT,
    analysis_result JSONB, -- Colors, layout, sections detected
    generated_code TEXT,
    generated_sections JSONB, -- Individual section components
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'generating', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Pages - Persist published/draft pages
CREATE TABLE public.pages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    generated_page_id UUID REFERENCES public.generated_pages(id) ON DELETE SET NULL,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    template TEXT DEFAULT 'custom',
    sections JSONB DEFAULT '[]',
    settings JSONB DEFAULT '{}',
    views_count INTEGER DEFAULT 0,
    submissions_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

-- Indexes for page tables
CREATE INDEX idx_generated_pages_user_id ON public.generated_pages(user_id);
CREATE INDEX idx_generated_pages_project_id ON public.generated_pages(project_id);
CREATE INDEX idx_generated_pages_status ON public.generated_pages(status);
CREATE INDEX idx_pages_user_id ON public.pages(user_id);
CREATE INDEX idx_pages_project_id ON public.pages(project_id);
CREATE INDEX idx_pages_client_id ON public.pages(client_id);
CREATE INDEX idx_pages_slug ON public.pages(slug);
CREATE INDEX idx_pages_status ON public.pages(status);

-- RLS for generated_pages
ALTER TABLE public.generated_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own generated pages" ON public.generated_pages
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create generated pages" ON public.generated_pages
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own generated pages" ON public.generated_pages
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own generated pages" ON public.generated_pages
    FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Team members can view all generated pages" ON public.generated_pages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
    );

-- RLS for pages
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view all pages" ON public.pages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
    );

CREATE POLICY "Team members can manage pages" ON public.pages
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
    );

CREATE POLICY "Public can view published pages" ON public.pages
    FOR SELECT USING (status = 'published');

-- Trigger for pages updated_at
CREATE TRIGGER update_pages_updated_at BEFORE UPDATE ON public.pages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    _role TEXT;
BEGIN
    -- Read role from metadata, default to 'member' if not provided
    _role := COALESCE(NEW.raw_user_meta_data->>'role', 'member');

    -- Validate role value
    IF _role NOT IN ('admin', 'member', 'client') THEN
        _role := 'member';
    END IF;

    INSERT INTO public.profiles (id, email, full_name, role, client_id)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        _role,
        (NEW.raw_user_meta_data->>'client_id')::UUID
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- LEADS MANAGEMENT TABLES
-- ============================================

-- Leads - Contact form submissions and potential clients
CREATE TABLE public.leads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    company TEXT,
    subject TEXT,
    message TEXT NOT NULL,
    source TEXT DEFAULT 'website' CHECK (source IN ('website', 'referral', 'social', 'event', 'other')),
    source_page TEXT, -- Which page/form the lead came from
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'proposal', 'converted', 'lost')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL, -- If converted to client
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    last_contacted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lead Activity - Track interactions with leads
CREATE TABLE public.lead_activities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('note', 'email', 'call', 'meeting', 'ai_assist', 'status_change')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for leads tables
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_email ON public.leads(email);
CREATE INDEX idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX idx_lead_activities_lead_id ON public.lead_activities(lead_id);
CREATE INDEX idx_lead_activities_type ON public.lead_activities(type);

-- RLS for leads
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

-- Team members can view and manage all leads
CREATE POLICY "Team members can view leads" ON public.leads
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
    );

CREATE POLICY "Team members can manage leads" ON public.leads
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
    );

-- Allow public to create leads (for contact form submissions)
CREATE POLICY "Anyone can create leads" ON public.leads
    FOR INSERT WITH CHECK (TRUE);

-- Team members can view and manage lead activities
CREATE POLICY "Team members can view lead activities" ON public.lead_activities
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
    );

CREATE POLICY "Team members can manage lead activities" ON public.lead_activities
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
    );

-- Trigger for leads updated_at
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
