-- Migration: Add draft and final link fields to deliverables
-- Support for Frame.io (drafts/comments) and Google Drive (final files)

-- Add new columns to deliverables table
ALTER TABLE deliverables
ADD COLUMN IF NOT EXISTS draft_url TEXT,
ADD COLUMN IF NOT EXISTS draft_platform TEXT DEFAULT 'frame_io' CHECK (draft_platform IN ('frame_io', 'vimeo', 'youtube', 'dropbox', 'other')),
ADD COLUMN IF NOT EXISTS final_url TEXT,
ADD COLUMN IF NOT EXISTS final_platform TEXT DEFAULT 'google_drive' CHECK (final_platform IN ('google_drive', 'dropbox', 'wetransfer', 's3', 'other')),
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comments for documentation
COMMENT ON COLUMN deliverables.draft_url IS 'Link to draft version for review (typically Frame.io)';
COMMENT ON COLUMN deliverables.draft_platform IS 'Platform where draft is hosted';
COMMENT ON COLUMN deliverables.final_url IS 'Link to final approved version (typically Google Drive)';
COMMENT ON COLUMN deliverables.final_platform IS 'Platform where final file is hosted';
COMMENT ON COLUMN deliverables.notes IS 'Internal notes about this deliverable';
