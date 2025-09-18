-- Add deleted_at column for soft delete tracking
ALTER TABLE user_files
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;
