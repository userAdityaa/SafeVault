-- Fix starred_items foreign key constraint to support both users and google_users
-- Drop the existing foreign key constraint that only references users table

-- First, drop the foreign key constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'starred_items_user_id_fkey' 
               AND table_name = 'starred_items') THEN
        ALTER TABLE starred_items DROP CONSTRAINT starred_items_user_id_fkey;
    END IF;
END $$;

-- The user_id will now reference either users(id) or google_users(id)
-- Validation will be handled at the application level