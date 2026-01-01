-- Subscription & Usage Tracking Schema
-- Run this in Supabase SQL Editor
--
-- NOTE: We create separate tables instead of modifying auth.users
-- because Supabase's auth schema is managed and shouldn't be altered

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    plan TEXT DEFAULT 'free', -- 'free', 'pro'
    status TEXT DEFAULT 'active', -- 'active', 'canceled', 'past_due', etc.
    life_decisions_purchased INTEGER DEFAULT 0,
    current_period_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    current_period_end TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 month'),
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create usage tracking table
CREATE TABLE IF NOT EXISTS public.usage_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    everyday_decisions_used INTEGER DEFAULT 0,
    life_decisions_used INTEGER DEFAULT 0,
    trial_life_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, period_start)
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions
CREATE POLICY "Users can view their own subscription"
    ON public.subscriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
    ON public.subscriptions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription"
    ON public.subscriptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Service role has full access (for webhooks)
CREATE POLICY "Service role can manage all subscriptions"
    ON public.subscriptions FOR ALL
    USING (auth.role() = 'service_role');

-- RLS Policies for usage_tracking
CREATE POLICY "Users can view their own usage"
    ON public.usage_tracking FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage"
    ON public.usage_tracking FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage"
    ON public.usage_tracking FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Service role has full access (for webhooks)
CREATE POLICY "Service role can manage all usage"
    ON public.usage_tracking FOR ALL
    USING (auth.role() = 'service_role');

-- Create function to reset usage tracking at period end
CREATE OR REPLACE FUNCTION reset_usage_tracking()
RETURNS TRIGGER AS $$
BEGIN
    -- When current_period_end is updated and has passed, reset usage
    IF NEW.current_period_end IS NOT NULL AND NEW.current_period_end < NOW() THEN
        UPDATE public.usage_tracking
        SET everyday_decisions_used = 0,
            life_decisions_used = 0,
            period_start = NEW.current_period_end,
            period_end = NEW.current_period_end + INTERVAL '1 month'
        WHERE user_id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic usage reset
CREATE TRIGGER reset_usage_on_period_change
    AFTER UPDATE ON public.subscriptions
    FOR EACH ROW
    WHEN (OLD.current_period_end IS DISTINCT FROM NEW.current_period_end)
    EXECUTE FUNCTION reset_usage_tracking();

-- NOTE: We cannot create triggers on auth.users table
-- Instead, subscription records will be created by the application code
-- when a user first signs up or logs in

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON public.usage_tracking(user_id);
