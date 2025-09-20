-- 015_relax_file_downloads_fks.sql
-- Drop strict FKs on file_downloads to support both standard users and google_users IDs.
-- We rely on application-level checks and existing indexes for performance.

ALTER TABLE file_downloads DROP CONSTRAINT IF EXISTS file_downloads_downloaded_by_fkey;
ALTER TABLE file_downloads DROP CONSTRAINT IF EXISTS file_downloads_owner_id_fkey;

-- Keep the indexes for performance
-- (These were already created in 014_add_file_download_tracking.sql)