-- Add file activity tracking table
CREATE TABLE IF NOT EXISTS file_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_id UUID NOT NULL,
    user_id UUID NOT NULL,
    activity_type VARCHAR(20) NOT NULL CHECK (activity_type IN ('preview', 'download')),
    activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint for files only (user_id will be relaxed to support both user types)
    CONSTRAINT fk_file_activities_file_id FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

-- Add indexes for efficient querying (with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_file_activities_user_id ON file_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_file_activities_file_id ON file_activities(file_id);
CREATE INDEX IF NOT EXISTS idx_file_activities_activity_at ON file_activities(activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_activities_user_activity_at ON file_activities(user_id, activity_at DESC);

-- Note: No foreign key constraints on user_id to support both users and google_users tables
-- Application-level validation will ensure user_id exists in either users or google_users