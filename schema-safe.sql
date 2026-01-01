-- Complete Schema Setup for Guest Onboarding (Safe Version)
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. CREATE USER_PROFILES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    first_name TEXT,
    onboarding_completed BOOLEAN DEFAULT false,
    onboarding_focus TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then create them
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
CREATE POLICY "Users can view their own profile"
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile"
    ON public.user_profiles FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
CREATE POLICY "Users can insert their own profile"
    ON public.user_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding ON public.user_profiles(onboarding_completed);

-- Comments
COMMENT ON TABLE public.user_profiles IS 'User profile information collected during onboarding';
COMMENT ON COLUMN public.user_profiles.first_name IS 'User''s first name collected during onboarding';
COMMENT ON COLUMN public.user_profiles.onboarding_completed IS 'Whether user has completed post-signup onboarding';
COMMENT ON COLUMN public.user_profiles.onboarding_focus IS 'What type of decisions the user is focused on (career, relationship, life-change, everything)';

-- ============================================
-- 2. ADD COLUMNS TO EXISTING DECISIONS TABLE
-- ============================================

DO $$
BEGIN
    -- Add columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='decisions' AND column_name='matters' AND table_schema='public') THEN
        ALTER TABLE public.decisions ADD COLUMN matters TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='decisions' AND column_name='emotion' AND table_schema='public') THEN
        ALTER TABLE public.decisions ADD COLUMN emotion TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='decisions' AND column_name='recommendation' AND table_schema='public') THEN
        ALTER TABLE public.decisions ADD COLUMN recommendation TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='decisions' AND column_name='reason' AND table_schema='public') THEN
        ALTER TABLE public.decisions ADD COLUMN reason TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='decisions' AND column_name='outcome_choice' AND table_schema='public') THEN
        ALTER TABLE public.decisions ADD COLUMN outcome_choice TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='decisions' AND column_name='outcome_locked_at' AND table_schema='public') THEN
        ALTER TABLE public.decisions ADD COLUMN outcome_locked_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='decisions' AND column_name='check_in_due' AND table_schema='public') THEN
        ALTER TABLE public.decisions ADD COLUMN check_in_due TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='decisions' AND column_name='status' AND table_schema='public') THEN
        ALTER TABLE public.decisions ADD COLUMN status TEXT DEFAULT 'pending';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='decisions' AND column_name='decision_type' AND table_schema='public') THEN
        ALTER TABLE public.decisions ADD COLUMN decision_type TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='decisions' AND column_name='context' AND table_schema='public') THEN
        ALTER TABLE public.decisions ADD COLUMN context TEXT;
    END IF;
END $$;

-- Add new indexes for decisions
CREATE INDEX IF NOT EXISTS idx_decisions_status ON public.decisions(status);
CREATE INDEX IF NOT EXISTS idx_decisions_check_in_due ON public.decisions(check_in_due);

-- Add comments
COMMENT ON COLUMN public.decisions.matters IS 'What matters to the user in this decision (Quick Guidance)';
COMMENT ON COLUMN public.decisions.emotion IS 'How the user wants to feel (Quick Guidance)';
COMMENT ON COLUMN public.decisions.recommendation IS 'The AI recommendation';
COMMENT ON COLUMN public.decisions.reason IS 'The reason for the recommendation';
COMMENT ON COLUMN public.decisions.outcome_choice IS 'Which option the user chose from their decision';
COMMENT ON COLUMN public.decisions.outcome_locked_at IS 'When the user locked in their decision';
COMMENT ON COLUMN public.decisions.check_in_due IS 'When the user should check in on how the decision went (2 weeks after locking in)';
COMMENT ON COLUMN public.decisions.status IS 'Decision status: pending, decided, checked_in';

-- ============================================
-- 3. UPDATED_AT TRIGGER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_decisions_updated_at ON public.decisions;
CREATE TRIGGER update_decisions_updated_at
    BEFORE UPDATE ON public.decisions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
