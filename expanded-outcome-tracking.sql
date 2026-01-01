-- Expanded Outcome Tracking Schema
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. ADD COLUMNS TO DECISIONS TABLE
-- ============================================

DO $$
BEGIN
    -- Add outcome tracking columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='decisions' AND column_name='outcome_choice' AND table_schema='public') THEN
        ALTER TABLE public.decisions ADD COLUMN outcome_choice TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='decisions' AND column_name='outcome_feeling' AND table_schema='public') THEN
        ALTER TABLE public.decisions ADD COLUMN outcome_feeling TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='decisions' AND column_name='outcome_reflection' AND table_schema='public') THEN
        ALTER TABLE public.decisions ADD COLUMN outcome_reflection TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='decisions' AND column_name='outcome_recorded_at' AND table_schema='public') THEN
        ALTER TABLE public.decisions ADD COLUMN outcome_recorded_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='decisions' AND column_name='confidence_at_decision' AND table_schema='public') THEN
        ALTER TABLE public.decisions ADD COLUMN confidence_at_decision INTEGER;
    END IF;
END $$;

-- Add comments
COMMENT ON COLUMN public.decisions.outcome_choice IS 'What user did: followed_recommendation, chose_different, still_deciding';
COMMENT ON COLUMN public.decisions.outcome_feeling IS 'How user feels: good, mixed, regret';
COMMENT ON COLUMN public.decisions.outcome_reflection IS 'Optional reflection on the outcome';
COMMENT ON COLUMN public.decisions.outcome_recorded_at IS 'When outcome was recorded';
COMMENT ON COLUMN public.decisions.confidence_at_decision IS 'Confidence level 1-5 when decision was made';

-- ============================================
-- 2. CREATE CHECK-INS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.decision_check_ins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    decision_id UUID REFERENCES public.decisions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    check_in_type TEXT NOT NULL, -- 'immediate', '2_week', '2_month'
    feeling TEXT, -- 'good', 'mixed', 'regret'
    reflection TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.decision_check_ins ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own check-ins" ON public.decision_check_ins;
DROP POLICY IF EXISTS "Users can insert their own check-ins" ON public.decision_check_ins;
DROP POLICY IF EXISTS "Users can update their own check-ins" ON public.decision_check_ins;
DROP POLICY IF EXISTS "Users can delete their own check-ins" ON public.decision_check_ins;

-- Create RLS policies
CREATE POLICY "Users can view their own check-ins"
    ON public.decision_check_ins FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own check-ins"
    ON public.decision_check_ins FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own check-ins"
    ON public.decision_check_ins FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own check-ins"
    ON public.decision_check_ins FOR DELETE
    USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_check_ins_decision_id ON public.decision_check_ins(decision_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_user_id ON public.decision_check_ins(user_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_type ON public.decision_check_ins(check_in_type);

-- Comments
COMMENT ON TABLE public.decision_check_ins IS 'Follow-up check-ins on decisions to track outcomes over time';
COMMENT ON COLUMN public.decision_check_ins.check_in_type IS 'Type of check-in: immediate, 2_week, 2_month';
COMMENT ON COLUMN public.decision_check_ins.feeling IS 'How user feels at check-in: good, mixed, regret';
