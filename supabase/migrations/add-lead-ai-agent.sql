-- Migration: Add AI Lead Agent support
-- This enables per-lead AI conversations with action capabilities

-- =====================================================
-- LEAD CONVERSATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS lead_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- LEAD MESSAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS lead_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES lead_conversations(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,

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
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_lead_conversations_lead ON lead_conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_messages_conversation ON lead_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_lead_messages_lead ON lead_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_messages_created ON lead_messages(created_at DESC);

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_lead_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE lead_conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_lead_conversation_on_message ON lead_messages;
CREATE TRIGGER update_lead_conversation_on_message
  AFTER INSERT ON lead_messages
  FOR EACH ROW EXECUTE FUNCTION update_lead_conversation_timestamp();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE lead_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_messages ENABLE ROW LEVEL SECURITY;

-- Conversations policies
CREATE POLICY "Users can view lead conversations"
  ON lead_conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'member')
    )
  );

CREATE POLICY "Users can create lead conversations"
  ON lead_conversations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'member')
    )
  );

-- Messages policies
CREATE POLICY "Users can view lead messages"
  ON lead_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'member')
    )
  );

CREATE POLICY "Users can create lead messages"
  ON lead_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'member')
    )
  );

CREATE POLICY "Users can update lead messages"
  ON lead_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'member')
    )
  );

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE lead_conversations IS 'Chat conversation threads for each lead';
COMMENT ON TABLE lead_messages IS 'Individual messages in lead conversations, including tool calls and pending actions';
COMMENT ON COLUMN lead_messages.pending_action IS 'JSON object describing an action awaiting user confirmation';
