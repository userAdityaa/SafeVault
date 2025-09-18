-- 002_add_google_users.sql

-- Google Users table
CREATE TABLE IF NOT EXISTS google_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL
);
