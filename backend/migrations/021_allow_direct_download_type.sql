-- Add 'direct' as a valid download_type for file_downloads
-- This allows tracking owner/self downloads (non-shared, non-public)

ALTER TABLE file_downloads
  DROP CONSTRAINT IF EXISTS file_downloads_download_type_check;

ALTER TABLE file_downloads
  ADD CONSTRAINT file_downloads_download_type_check
  CHECK (download_type IN ('shared', 'public', 'direct'));

-- Optional: supporting index remains valid; no change needed

