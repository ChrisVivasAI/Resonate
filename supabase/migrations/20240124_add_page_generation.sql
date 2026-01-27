-- Migration: Add AI Page Generation Tables
-- Generated: 2024-01-24

-- Generated Pages - Store AI generation jobs for design-to-code conversion
CREATE TABLE IF NOT EXISTS public.generated_pages (
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
CREATE TABLE IF NOT EXISTS public.pages (
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
CREATE INDEX IF NOT EXISTS idx_generated_pages_user_id ON public.generated_pages(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_pages_project_id ON public.generated_pages(project_id);
CREATE INDEX IF NOT EXISTS idx_generated_pages_status ON public.generated_pages(status);
CREATE INDEX IF NOT EXISTS idx_pages_user_id ON public.pages(user_id);
CREATE INDEX IF NOT EXISTS idx_pages_project_id ON public.pages(project_id);
CREATE INDEX IF NOT EXISTS idx_pages_client_id ON public.pages(client_id);
CREATE INDEX IF NOT EXISTS idx_pages_slug ON public.pages(slug);
CREATE INDEX IF NOT EXISTS idx_pages_status ON public.pages(status);

-- RLS for generated_pages
ALTER TABLE public.generated_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own generated pages" ON public.generated_pages;
CREATE POLICY "Users can view their own generated pages" ON public.generated_pages
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create generated pages" ON public.generated_pages;
CREATE POLICY "Users can create generated pages" ON public.generated_pages
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own generated pages" ON public.generated_pages;
CREATE POLICY "Users can update their own generated pages" ON public.generated_pages
    FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own generated pages" ON public.generated_pages;
CREATE POLICY "Users can delete their own generated pages" ON public.generated_pages
    FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Team members can view all generated pages" ON public.generated_pages;
CREATE POLICY "Team members can view all generated pages" ON public.generated_pages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
    );

-- RLS for pages
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team members can view all pages" ON public.pages;
CREATE POLICY "Team members can view all pages" ON public.pages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
    );

DROP POLICY IF EXISTS "Team members can manage pages" ON public.pages;
CREATE POLICY "Team members can manage pages" ON public.pages
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
    );

DROP POLICY IF EXISTS "Public can view published pages" ON public.pages;
CREATE POLICY "Public can view published pages" ON public.pages
    FOR SELECT USING (status = 'published');

-- Trigger for pages updated_at
DROP TRIGGER IF EXISTS update_pages_updated_at ON public.pages;
CREATE TRIGGER update_pages_updated_at BEFORE UPDATE ON public.pages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
