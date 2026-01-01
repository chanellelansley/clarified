-- Add outcome tracking columns to decisions table
-- Run this in Supabase SQL Editor

-- Add columns for decision outcomes
ALTER TABLE public.decisions
ADD COLUMN IF NOT EXISTS outcome_choice TEXT,
ADD COLUMN IF NOT EXISTS outcome_locked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS check_in_due TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Create index for faster lookups by status
CREATE INDEX IF NOT EXISTS idx_decisions_status ON public.decisions(status);
CREATE INDEX IF NOT EXISTS idx_decisions_check_in_due ON public.decisions(check_in_due);

-- Comment the columns for documentation
COMMENT ON COLUMN public.decisions.outcome_choice IS 'Which option the user chose from their decision';
COMMENT ON COLUMN public.decisions.outcome_locked_at IS 'When the user locked in their decision';
COMMENT ON COLUMN public.decisions.check_in_due IS 'When the user should check in on how the decision went (2 weeks after locking in)';
COMMENT ON COLUMN public.decisions.status IS 'Decision status: pending, decided, checked_in';
