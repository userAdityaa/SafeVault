-- 018_relax_file_activities_user_fk.sql
-- Drop strict FK on file_activities.user_id to support both standard users and google_users IDs.
-- We rely on application-level checks and existing indexes for performance.

ALTER TABLE file_activities DROP CONSTRAINT IF EXISTS fk_file_activities_user_id;
ALTER TABLE file_activities DROP CONSTRAINT IF EXISTS fk_file_activities_google_user_id;