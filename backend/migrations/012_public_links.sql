-- 012_public_links.sql
-- Public link sharing for files and folders

CREATE TABLE IF NOT EXISTS file_public_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT NOT NULL UNIQUE,
    file_id UUID NOT NULL,
    owner_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    expires_at TIMESTAMP,
    revoked_at TIMESTAMP,
    download_count BIGINT DEFAULT 0,
    CONSTRAINT fk_fpl_file FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_file_public_links_token ON file_public_links(token);
CREATE INDEX IF NOT EXISTS idx_file_public_links_owner ON file_public_links(owner_id);

CREATE TABLE IF NOT EXISTS folder_public_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT NOT NULL UNIQUE,
    folder_id UUID NOT NULL,
    owner_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    expires_at TIMESTAMP,
    revoked_at TIMESTAMP,
    access_count BIGINT DEFAULT 0,
    CONSTRAINT fk_fpl_folder FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_folder_public_links_token ON folder_public_links(token);
CREATE INDEX IF NOT EXISTS idx_folder_public_links_owner ON folder_public_links(owner_id);
