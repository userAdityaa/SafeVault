-- Add name and picture to google_users
ALTER TABLE google_users
  ADD COLUMN IF NOT EXISTS name TEXT DEFAULT '' NOT NULL,
  ADD COLUMN IF NOT EXISTS picture TEXT DEFAULT '' NOT NULL;
