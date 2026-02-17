-- A. Add assignee_id to tasks (no FK — references either profiles or team_members)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee_id UUID;
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id) WHERE assignee_id IS NOT NULL;

-- B. Extend comments to support tasks (currently deliverable-only)
ALTER TABLE comments ALTER COLUMN deliverable_id DROP NOT NULL;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES tasks(id) ON DELETE CASCADE;
ALTER TABLE comments ADD CONSTRAINT comments_entity_check
  CHECK (deliverable_id IS NOT NULL OR task_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_comments_task_id ON comments(task_id) WHERE task_id IS NOT NULL;
