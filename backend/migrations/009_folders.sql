-- 009_folders.sql

-- Create folders table for organizing files per user, supports hierarchy
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  parent_id UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_folders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_folders_parent FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE,
  CONSTRAINT uq_folder_per_parent UNIQUE (user_id, parent_id, name)
);

CREATE INDEX IF NOT EXISTS idx_folders_user_parent ON folders(user_id, parent_id);

-- Add folder_id to user_files; folder is owned by same user; NULL means root
ALTER TABLE user_files
  ADD COLUMN IF NOT EXISTS folder_id UUID NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_files_folder'
  ) THEN
    ALTER TABLE user_files
      ADD CONSTRAINT fk_user_files_folder FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_user_files_folder ON user_files(folder_id);
