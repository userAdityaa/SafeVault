-- 010_relax_folders_user_fk.sql
-- Drop strict FK on folders.user_id so we can support both standard users and google_users IDs.
-- We rely on application-level ownership checks and existing indexes for performance.

ALTER TABLE folders DROP CONSTRAINT IF EXISTS fk_folders_user;

-- Ensure index on (user_id, parent_id) exists for listing; created in 009, but safe to create if missing
CREATE INDEX IF NOT EXISTS idx_folders_user_parent ON folders(user_id, parent_id);
