-- Create file_downloads table for tracking download events
CREATE TABLE IF NOT EXISTS file_downloads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    downloaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    download_type VARCHAR(20) NOT NULL CHECK (download_type IN ('shared', 'public')),
    share_token VARCHAR(255),
    ip_address VARCHAR(45) NOT NULL,
    user_agent VARCHAR(512) NOT NULL,
    downloaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add indexes for efficient querying (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_file_downloads_file_id ON file_downloads(file_id);
CREATE INDEX IF NOT EXISTS idx_file_downloads_downloaded_by ON file_downloads(downloaded_by);
CREATE INDEX IF NOT EXISTS idx_file_downloads_owner_id ON file_downloads(owner_id);
CREATE INDEX IF NOT EXISTS idx_file_downloads_downloaded_at ON file_downloads(downloaded_at);
CREATE INDEX IF NOT EXISTS idx_file_downloads_share_token ON file_downloads(share_token);

-- Add index for analytics queries
CREATE INDEX IF NOT EXISTS idx_file_downloads_owner_download_type ON file_downloads(owner_id, download_type);