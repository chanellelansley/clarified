-- Early Tester Features Schema Updates
-- Run this in Supabase SQL Editor AFTER the main subscription schema

-- Add columns to subscriptions table for early tester features
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS founding_member BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_beta_user BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_seen_welcome BOOLEAN DEFAULT FALSE;

-- Create decision_feedback table for thumbs up/down feedback
CREATE TABLE IF NOT EXISTS public.decision_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    decision_id UUID NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    helpful BOOLEAN NOT NULL,
    feedback_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on decision_feedback
ALTER TABLE public.decision_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for decision_feedback
CREATE POLICY "Users can view their own feedback"
    ON public.decision_feedback FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback"
    ON public.decision_feedback FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Service role has full access (for admin dashboard later)
CREATE POLICY "Service role can manage all feedback"
    ON public.decision_feedback FOR ALL
    USING (auth.role() = 'service_role');

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_decision_feedback_user_id ON public.decision_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_decision_feedback_decision_id ON public.decision_feedback(decision_id);

-- Mark all existing users as founding members and beta users
-- (Run this to grandfather in current users)
UPDATE public.subscriptions
SET founding_member = TRUE,
    is_beta_user = TRUE
WHERE created_at < NOW();

-- Confirm
SELECT 'Early tester schema updates completed successfully' AS result;
