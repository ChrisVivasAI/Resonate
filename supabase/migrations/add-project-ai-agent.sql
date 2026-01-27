-- Migration: Add AI Project Agent support
-- This enables per-project AI conversations with action capabilities

-- =====================================================
-- PROJECT CONVERSATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS project_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PROJECT MESSAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS project_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES project_conversations(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,

  -- Message content
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT,

  -- For tool calls/results
  tool_calls JSONB,
  tool_call_id TEXT,
  tool_name TEXT,

  -- For pending actions that need confirmation
  pending_action JSONB,
  action_confirmed BOOLEAN,
  action_confirmed_at TIMESTAMPTZ,
  action_confirmed_by UUID REFERENCES profiles(id),

  -- Metadata
  tokens_used INTEGER,
  model TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PROJECT DOCUMENTS TABLE (for future RAG support)
-- =====================================================
CREATE TABLE IF NOT EXISTS project_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,

  -- Document info
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  file_type TEXT,
  file_size INTEGER,

  -- Content for text-based documents
  content TEXT,

  -- For vector search (future)
  -- embedding VECTOR(768), -- Uncomment when using pgvector

  -- Categorization
  category TEXT DEFAULT 'general' CHECK (category IN (
    'brief', 'contract', 'meeting_notes', 'feedback',
    'reference', 'asset', 'general'
  )),

  -- Audit
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PROJECT AI SETTINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS project_ai_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE UNIQUE NOT NULL,

  -- AI behavior settings
  auto_generate_on_create BOOLEAN DEFAULT TRUE,
  agent_personality TEXT DEFAULT 'professional',
  confirmation_level TEXT DEFAULT 'destructive_only' CHECK (confirmation_level IN (
    'always', 'destructive_only', 'never'
  )),

  -- What the AI can do
  can_create_tasks BOOLEAN DEFAULT TRUE,
  can_update_tasks BOOLEAN DEFAULT TRUE,
  can_delete_tasks BOOLEAN DEFAULT FALSE,
  can_create_milestones BOOLEAN DEFAULT TRUE,
  can_update_milestones BOOLEAN DEFAULT TRUE,
  can_delete_milestones BOOLEAN DEFAULT FALSE,
  can_manage_deliverables BOOLEAN DEFAULT TRUE,
  can_manage_financials BOOLEAN DEFAULT TRUE,

  -- Context settings
  include_financial_data BOOLEAN DEFAULT TRUE,
  include_activity_history BOOLEAN DEFAULT TRUE,
  max_history_messages INTEGER DEFAULT 50,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_project_conversations_project ON project_conversations(project_id);
CREATE INDEX IF NOT EXISTS idx_project_messages_conversation ON project_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_project_messages_project ON project_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_project_messages_created ON project_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_documents_project ON project_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_project_documents_category ON project_documents(category);

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE project_conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_conversation_on_message ON project_messages;
CREATE TRIGGER update_conversation_on_message
  AFTER INSERT ON project_messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_timestamp();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE project_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_ai_settings ENABLE ROW LEVEL SECURITY;

-- Conversations policies
CREATE POLICY "Users can view project conversations"
  ON project_conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'member')
    )
  );

CREATE POLICY "Users can create project conversations"
  ON project_conversations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'member')
    )
  );

-- Messages policies
CREATE POLICY "Users can view project messages"
  ON project_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'member')
    )
  );

CREATE POLICY "Users can create project messages"
  ON project_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'member')
    )
  );

CREATE POLICY "Users can update project messages"
  ON project_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'member')
    )
  );

-- Documents policies
CREATE POLICY "Users can view project documents"
  ON project_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'member')
    )
  );

CREATE POLICY "Users can manage project documents"
  ON project_documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'member')
    )
  );

-- AI Settings policies
CREATE POLICY "Users can view project ai settings"
  ON project_ai_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'member')
    )
  );

CREATE POLICY "Admins can manage project ai settings"
  ON project_ai_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- DEFAULT AI SETTINGS FOR EXISTING PROJECTS
-- =====================================================
-- This will create default AI settings for all existing projects
INSERT INTO project_ai_settings (project_id)
SELECT id FROM projects
WHERE NOT EXISTS (
  SELECT 1 FROM project_ai_settings WHERE project_ai_settings.project_id = projects.id
)
ON CONFLICT (project_id) DO NOTHING;

-- =====================================================
-- FUNCTION TO AUTO-CREATE AI SETTINGS ON NEW PROJECT
-- =====================================================
CREATE OR REPLACE FUNCTION create_project_ai_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO project_ai_settings (project_id)
  VALUES (NEW.id)
  ON CONFLICT (project_id) DO NOTHING;
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS create_ai_settings_on_project ON projects;
CREATE TRIGGER create_ai_settings_on_project
  AFTER INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION create_project_ai_settings();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE project_conversations IS 'Chat conversation threads for each project';
COMMENT ON TABLE project_messages IS 'Individual messages in project conversations, including tool calls and pending actions';
COMMENT ON TABLE project_documents IS 'Documents uploaded to projects for AI context (briefs, contracts, notes)';
COMMENT ON TABLE project_ai_settings IS 'Per-project AI agent configuration and permissions';
COMMENT ON COLUMN project_messages.pending_action IS 'JSON object describing an action awaiting user confirmation';
COMMENT ON COLUMN project_ai_settings.confirmation_level IS 'always: confirm all changes, destructive_only: confirm deletes/major changes, never: auto-apply all';
