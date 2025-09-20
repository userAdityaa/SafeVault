-- Add created_at and updated_at to google_users table
ALTER TABLE google_users
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing rows to have proper timestamps
UPDATE google_users 
SET created_at = NOW(), updated_at = NOW() 
WHERE created_at IS NULL OR updated_at IS NULL;