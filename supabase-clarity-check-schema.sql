-- Clarity Check Feedback table for Clarified app
-- Run this in Supabase SQL editor to create the clarity_check table

-- Drop existing feedback table if it exists (optional - comment out if you want to keep old feedback)
-- DROP TABLE IF EXISTS public.feedback;

-- Create clarity_check table for structured feedback
CREATE TABLE IF NOT EXISTS public.clarity_check (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    decision_id UUID REFERENCES public.decisions(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    clarity_score TEXT NOT NULL CHECK (clarity_score IN ('high', 'medium', 'low')),
    reason_tags TEXT[] NOT NULL DEFAULT '{}',
    free_text TEXT CHECK (char_length(free_text) <= 240),
    page TEXT,
    recommendation_version TEXT
);

-- Enable RLS
ALTER TABLE public.clarity_check ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone (anon + authenticated) can insert feedback
CREATE POLICY "Anyone can submit clarity check feedback"
ON public.clarity_check
FOR INSERT
TO public
WITH CHECK (true);

-- Policy: Authenticated users can view their own feedback only
CREATE POLICY "Users can view their own clarity check feedback"
ON public.clarity_check
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Note: Service role bypasses RLS by default, so admins can read all via service role

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_clarity_check_user_id ON public.clarity_check(user_id);
CREATE INDEX IF NOT EXISTS idx_clarity_check_decision_id ON public.clarity_check(decision_id);
CREATE INDEX IF NOT EXISTS idx_clarity_check_created_at ON public.clarity_check(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clarity_check_clarity_score ON public.clarity_check(clarity_score);
CREATE INDEX IF NOT EXISTS idx_clarity_check_page ON public.clarity_check(page);

-- Grant necessary permissions
GRANT INSERT ON public.clarity_check TO anon;
GRANT INSERT ON public.clarity_check TO authenticated;
GRANT SELECT ON public.clarity_check TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.clarity_check IS 'Structured feedback from users about recommendation clarity';
COMMENT ON COLUMN public.clarity_check.clarity_score IS 'User rating: high (very clear), medium (somewhat), low (not really)';
COMMENT ON COLUMN public.clarity_check.reason_tags IS 'Array of selected reason tags (max 2)';
COMMENT ON COLUMN public.clarity_check.free_text IS 'Optional freeform feedback (max 240 chars)';
COMMENT ON COLUMN public.clarity_check.page IS 'Where feedback was submitted from (recommendation, account, etc)';
COMMENT ON COLUMN public.clarity_check.recommendation_version IS 'Optional version identifier for the recommendation engine';
