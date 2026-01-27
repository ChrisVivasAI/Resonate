-- Fix: RLS policy blocking auto-creation of AI settings
-- The trigger function needs SECURITY DEFINER to bypass RLS when auto-creating settings

-- =====================================================
-- FIX 1: Update trigger function with SECURITY DEFINER
-- =====================================================
CREATE OR REPLACE FUNCTION create_project_ai_settings()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO project_ai_settings (project_id)
  VALUES (NEW.id)
  ON CONFLICT (project_id) DO NOTHING;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================================
-- FIX 2: Allow members to insert AI settings (as fallback)
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage project ai settings" ON project_ai_settings;

-- Allow both admin and member to manage AI settings
CREATE POLICY "Users can manage project ai settings"
  ON project_ai_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'member')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'member')
    )
  );
