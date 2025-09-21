-- Add starred items table for files and folders
CREATE TABLE IF NOT EXISTS starred_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- References either users(id) or google_users(id)
    item_type VARCHAR(10) NOT NULL CHECK (item_type IN ('file', 'folder')),
    item_id UUID NOT NULL,
    starred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying (only if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_starred_items_user_id') THEN
        CREATE INDEX idx_starred_items_user_id ON starred_items(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_starred_items_item_type_id') THEN
        CREATE INDEX idx_starred_items_item_type_id ON starred_items(item_type, item_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_starred_items_starred_at') THEN
        CREATE INDEX idx_starred_items_starred_at ON starred_items(starred_at);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_starred_items_unique') THEN
        CREATE UNIQUE INDEX idx_starred_items_unique ON starred_items(user_id, item_type, item_id);
    END IF;
END $$;

-- Add foreign key constraints based on item_type
-- Note: We can't add direct FK constraints since item_id references different tables
-- This will be enforced at the application level