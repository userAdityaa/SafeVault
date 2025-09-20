-- 011_add_file_folder_sharing.sql

-- File shares table - stores which files are shared with which users
CREATE TABLE IF NOT EXISTS file_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL,
    owner_id UUID NOT NULL, -- User who shared the file  
    shared_with_email TEXT NOT NULL, -- Email of user file is shared with
    shared_with_id UUID, -- Actual user ID if user exists in system
    permission TEXT DEFAULT 'viewer', -- viewer, editor
    shared_at TIMESTAMP DEFAULT now(),
    expires_at TIMESTAMP, -- Optional expiration
    
    CONSTRAINT fk_file_shares_file FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
    CONSTRAINT uq_file_shares_file_email UNIQUE (file_id, shared_with_email)
);

-- Folder shares table - stores which folders are shared with which users  
CREATE TABLE IF NOT EXISTS folder_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id UUID NOT NULL,
    owner_id UUID NOT NULL, -- User who shared the folder
    shared_with_email TEXT NOT NULL, -- Email of user folder is shared with
    shared_with_id UUID, -- Actual user ID if user exists in system
    permission TEXT DEFAULT 'viewer', -- viewer, editor
    shared_at TIMESTAMP DEFAULT now(),
    expires_at TIMESTAMP, -- Optional expiration
    
    CONSTRAINT fk_folder_shares_folder FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
    CONSTRAINT uq_folder_shares_folder_email UNIQUE (folder_id, shared_with_email)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_file_shares_shared_with_email ON file_shares(shared_with_email);
CREATE INDEX IF NOT EXISTS idx_file_shares_shared_with_id ON file_shares(shared_with_id);
CREATE INDEX IF NOT EXISTS idx_file_shares_owner_id ON file_shares(owner_id);

CREATE INDEX IF NOT EXISTS idx_folder_shares_shared_with_email ON folder_shares(shared_with_email);
CREATE INDEX IF NOT EXISTS idx_folder_shares_shared_with_id ON folder_shares(shared_with_id);
CREATE INDEX IF NOT EXISTS idx_folder_shares_owner_id ON folder_shares(owner_id);