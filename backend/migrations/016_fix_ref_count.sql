-- 016_fix_ref_count.sql

-- Update ref_count to reflect actual number of users referencing each file
-- Count active (non-deleted) user_files mappings per file
UPDATE files 
SET ref_count = (
    SELECT COUNT(DISTINCT user_id) 
    FROM user_files 
    WHERE user_files.file_id = files.id 
    AND deleted_at IS NULL
);

-- Change default value for new files to 0
ALTER TABLE files ALTER COLUMN ref_count SET DEFAULT 0;