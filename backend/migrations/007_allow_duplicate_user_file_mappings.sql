-- 007_allow_duplicate_user_file_mappings.sql

-- Allow multiple active mappings per user per file
ALTER TABLE IF EXISTS user_files
  DROP CONSTRAINT IF EXISTS uq_user_files_user_file;
