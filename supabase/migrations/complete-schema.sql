-- =====================================================
-- COMPLETE SCHEMA - RUN THIS IN SUPABASE SQL EDITOR
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
  draft_url TEXT,
  draft_platform TEXT CHECK (draft_platform IN ('frame_io', 'vimeo', 'youtube', 'dropbox', 'other')),
  final_url TEXT,
  final_platform TEXT CHECK (final_platform IN ('google_drive', 'dropbox', 'wetransfer', 's3', 'other')),
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Deliverable versions
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

-- 3. Comments
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

-- 4. Approval records
CREATE TABLE IF NOT EXISTS approval_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deliverable_id UUID REFERENCES deliverables(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('approved', 'rejected', 'requested_changes')),
  feedback TEXT,
  version_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Activity feed
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

-- 6. Project health reports
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

-- 7. Project monitoring settings
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

-- 8. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ENABLE RLS
-- =====================================================
ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverable_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_health_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_monitoring_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SIMPLE POLICIES (authenticated users can access)
-- =====================================================

-- Deliverables
CREATE POLICY "auth_view_deliverables" ON deliverables FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_insert_deliverables" ON deliverables FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_update_deliverables" ON deliverables FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_delete_deliverables" ON deliverables FOR DELETE USING (auth.uid() IS NOT NULL);

-- Versions
CREATE POLICY "auth_view_versions" ON deliverable_versions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_manage_versions" ON deliverable_versions FOR ALL USING (auth.uid() IS NOT NULL);

-- Comments
CREATE POLICY "auth_view_comments" ON comments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_insert_comments" ON comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_update_comments" ON comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "auth_delete_comments" ON comments FOR DELETE USING (auth.uid() = user_id);

-- Approvals
CREATE POLICY "auth_view_approvals" ON approval_records FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_insert_approvals" ON approval_records FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Activity
CREATE POLICY "auth_view_activity" ON activity_feed FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_insert_activity" ON activity_feed FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Health reports
CREATE POLICY "auth_view_health" ON project_health_reports FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_manage_health" ON project_health_reports FOR ALL USING (auth.uid() IS NOT NULL);

-- Monitoring
CREATE POLICY "auth_view_monitoring" ON project_monitoring_settings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_manage_monitoring" ON project_monitoring_settings FOR ALL USING (auth.uid() IS NOT NULL);

-- Notifications
CREATE POLICY "users_view_own_notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_update_own_notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "system_insert_notifications" ON notifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_deliverables_project ON deliverables(project_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_status ON deliverables(status);
CREATE INDEX IF NOT EXISTS idx_versions_deliverable ON deliverable_versions(deliverable_id);
CREATE INDEX IF NOT EXISTS idx_comments_deliverable ON comments(deliverable_id);
CREATE INDEX IF NOT EXISTS idx_activity_project ON activity_feed(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_feed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_project ON project_health_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, is_read);
