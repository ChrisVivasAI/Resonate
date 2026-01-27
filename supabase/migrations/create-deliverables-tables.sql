-- =====================================================
-- DELIVERABLES SYSTEM TABLES
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Deliverables table
CREATE TABLE IF NOT EXISTS deliverables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  ai_generation_id UUID REFERENCES ai_generations(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('image', 'video', 'audio', 'document', 'text')),
  file_url TEXT,
  thumbnail_url TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'approved', 'rejected', 'final')),
  current_version INTEGER DEFAULT 1,
  -- Draft link fields (typically Frame.io for review/comments)
  draft_url TEXT,
  draft_platform TEXT DEFAULT 'frame_io' CHECK (draft_platform IN ('frame_io', 'vimeo', 'youtube', 'dropbox', 'other')),
  -- Final link fields (typically Google Drive for approved files)
  final_url TEXT,
  final_platform TEXT DEFAULT 'google_drive' CHECK (final_platform IN ('google_drive', 'dropbox', 'wetransfer', 's3', 'other')),
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Deliverable versions table
CREATE TABLE IF NOT EXISTS deliverable_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deliverable_id UUID REFERENCES deliverables(id) ON DELETE CASCADE NOT NULL,
  version_number INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deliverable_id UUID REFERENCES deliverables(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Approval records table
CREATE TABLE IF NOT EXISTS approval_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deliverable_id UUID REFERENCES deliverables(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('approved', 'rejected', 'requested_changes')),
  feedback TEXT,
  version_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Activity feed table
CREATE TABLE IF NOT EXISTS activity_feed (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id),
  activity_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  is_client_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Project health reports table
CREATE TABLE IF NOT EXISTS project_health_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  health_score INTEGER CHECK (health_score >= 0 AND health_score <= 100),
  status TEXT CHECK (status IN ('healthy', 'at_risk', 'critical')),
  summary TEXT,
  analysis JSONB,
  recommendations JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Project monitoring settings table
CREATE TABLE IF NOT EXISTS project_monitoring_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE UNIQUE NOT NULL,
  monitoring_enabled BOOLEAN DEFAULT TRUE,
  frequency TEXT DEFAULT 'weekly' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  alert_threshold INTEGER DEFAULT 60,
  next_check_at TIMESTAMPTZ,
  last_check_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverable_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_health_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_monitoring_settings ENABLE ROW LEVEL SECURITY;

-- Deliverables policies
CREATE POLICY "Users can view deliverables for their projects" ON deliverables
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'member')
    )
    OR (
      status IN ('in_review', 'approved', 'rejected', 'final')
      AND project_id IN (
        SELECT p.id FROM projects p
        JOIN clients c ON p.client_id = c.id
        JOIN profiles pr ON pr.client_id = c.id
        WHERE pr.id = auth.uid()
      )
    )
  );

CREATE POLICY "Admin/member can insert deliverables" ON deliverables
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
  );

CREATE POLICY "Admin/member can update deliverables" ON deliverables
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
  );

CREATE POLICY "Admin/member can delete deliverables" ON deliverables
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
  );

-- Deliverable versions policies
CREATE POLICY "Users can view versions" ON deliverable_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM deliverables d
      WHERE d.id = deliverable_id
      AND (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
        OR (
          d.status IN ('in_review', 'approved', 'rejected', 'final')
          AND d.project_id IN (
            SELECT p.id FROM projects p
            JOIN clients c ON p.client_id = c.id
            JOIN profiles pr ON pr.client_id = c.id
            WHERE pr.id = auth.uid()
          )
        )
      )
    )
  );

CREATE POLICY "Admin/member can manage versions" ON deliverable_versions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
  );

-- Comments policies
CREATE POLICY "Users can view non-internal comments" ON comments
  FOR SELECT USING (
    is_internal = FALSE
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
  );

CREATE POLICY "Authenticated users can insert comments" ON comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments" ON comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admin can delete any comment" ON comments
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Approval records policies
CREATE POLICY "Users can view approval records" ON approval_records
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert approval records" ON approval_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Activity feed policies
CREATE POLICY "Users can view client-visible activity" ON activity_feed
  FOR SELECT USING (
    is_client_visible = TRUE
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
  );

CREATE POLICY "Admin/member can insert activity" ON activity_feed
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
    OR auth.uid() = user_id
  );

-- Health reports policies
CREATE POLICY "Admin/member can view health reports" ON project_health_reports
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
  );

CREATE POLICY "Admin/member can manage health reports" ON project_health_reports
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
  );

-- Monitoring settings policies
CREATE POLICY "Admin/member can view monitoring settings" ON project_monitoring_settings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
  );

CREATE POLICY "Admin/member can manage monitoring settings" ON project_monitoring_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'member'))
  );

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_deliverables_project_id ON deliverables(project_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_status ON deliverables(status);
CREATE INDEX IF NOT EXISTS idx_deliverable_versions_deliverable_id ON deliverable_versions(deliverable_id);
CREATE INDEX IF NOT EXISTS idx_comments_deliverable_id ON comments(deliverable_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_project_id ON activity_feed(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created_at ON activity_feed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_reports_project_id ON project_health_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_health_reports_created_at ON project_health_reports(created_at DESC);

-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_deliverables_updated_at ON deliverables;
CREATE TRIGGER update_deliverables_updated_at
    BEFORE UPDATE ON deliverables
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
