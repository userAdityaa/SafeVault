-- 008_tags_and_search_indexes.sql

-- Enable trigram extension for fast ILIKE searches
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- File to tags many-to-many
CREATE TABLE IF NOT EXISTS file_tags (
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (file_id, tag_id)
);

-- Indexes for search performance
-- Filename search (trigram)
CREATE INDEX IF NOT EXISTS idx_files_original_name_trgm ON files USING GIN (original_name gin_trgm_ops);

-- Exact/equality filters
CREATE INDEX IF NOT EXISTS idx_files_mime_type ON files (mime_type);

-- Range filters
CREATE INDEX IF NOT EXISTS idx_files_size ON files (size);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON files (created_at);

-- Pagination and user scoping
CREATE INDEX IF NOT EXISTS idx_user_files_user_uploaded ON user_files (user_id, uploaded_at DESC, id DESC);

-- Tag lookups
CREATE INDEX IF NOT EXISTS idx_file_tags_file_id ON file_tags (file_id);
CREATE INDEX IF NOT EXISTS idx_file_tags_tag_id ON file_tags (tag_id);

-- Uploader name/email filters
CREATE INDEX IF NOT EXISTS idx_google_users_name ON google_users (name);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
