-- 004_relax_user_files_fk.sql

-- Drop FK to users to allow storing IDs from different auth tables
ALTER TABLE IF EXISTS user_files
  DROP CONSTRAINT IF EXISTS fk_user_files_user;

-- Keep unique constraint on (user_id, file_id) as is. Consider renaming user_id to owner_id later.
