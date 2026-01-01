-- Check what triggers exist on auth.users
-- Run this in Supabase SQL Editor to see if the problematic trigger still exists

SELECT
    trigger_name,
    event_manipulation,
    event_object_schema,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
AND event_object_table = 'users';

-- Also check what functions exist
SELECT
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%subscription%';
