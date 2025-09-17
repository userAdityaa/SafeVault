-- 003_files_and_user_files.sql

-- Files table
CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hash TEXT UNIQUE NOT NULL,
    storage_path TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT,
    size BIGINT NOT NULL,
    ref_count INT DEFAULT 1,
    visibility TEXT DEFAULT 'private',
    created_at TIMESTAMP DEFAULT now()
);

-- User_Files mapping table
CREATE TABLE IF NOT EXISTS user_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    file_id UUID NOT NULL,
    role TEXT DEFAULT 'owner',
    uploaded_at TIMESTAMP DEFAULT now(),
    CONSTRAINT fk_user_files_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_files_file FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
    CONSTRAINT uq_user_files_user_file UNIQUE (user_id, file_id)
);
