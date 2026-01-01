-- Drop the problematic trigger and function that tries to modify auth.users
-- Run this in Supabase SQL Editor FIRST, then run the main schema

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS init_subscription_on_signup ON auth.users;

-- Drop the function if it exists
DROP FUNCTION IF EXISTS initialize_user_subscription();

-- Confirm
SELECT 'Trigger and function dropped successfully' AS result;
