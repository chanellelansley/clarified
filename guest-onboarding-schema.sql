-- Guest Onboarding Database Schema
-- Run this in Supabase SQL Editor

-- Add onboarding columns to user_profiles table
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_focus TEXT;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding ON public.user_profiles(onboarding_completed);

-- Comment columns for documentation
COMMENT ON COLUMN public.user_profiles.first_name IS 'User''s first name collected during onboarding';
COMMENT ON COLUMN public.user_profiles.onboarding_completed IS 'Whether user has completed post-signup onboarding';
COMMENT ON COLUMN public.user_profiles.onboarding_focus IS 'What type of decisions the user is focused on (career, relationship, life-change, everything)';

-- Ensure decisions table has necessary columns for guest decisions
-- (These may already exist from previous migrations)
DO $$
BEGIN
    -- Add columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='decisions' AND column_name='matters') THEN
        ALTER TABLE public.decisions ADD COLUMN matters TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='decisions' AND column_name='emotion') THEN
        ALTER TABLE public.decisions ADD COLUMN emotion TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='decisions' AND column_name='recommendation') THEN
        ALTER TABLE public.decisions ADD COLUMN recommendation TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='decisions' AND column_name='reason') THEN
        ALTER TABLE public.decisions ADD COLUMN reason TEXT;
    END IF;
END $$;

-- Comment for documentation
COMMENT ON COLUMN public.decisions.matters IS 'What matters to the user in this decision (Quick Guidance)';
COMMENT ON COLUMN public.decisions.emotion IS 'How the user wants to feel (Quick Guidance)';
COMMENT ON COLUMN public.decisions.recommendation IS 'The AI recommendation';
COMMENT ON COLUMN public.decisions.reason IS 'The reason for the recommendation';
