// Vercel Serverless Function for canceling subscription
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const stripe = process.env.STRIPE_SECRET_KEY ? Stripe(process.env.STRIPE_SECRET_KEY) : null;
const supabaseAdmin = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        if (!stripe || !supabaseAdmin) {
            return res.status(500).json({ error: 'Services not configured' });
        }

        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'User ID required' });
        }

        // Get user's subscription from database
        const { data: subscription, error: subError } = await supabaseAdmin
            .from('subscriptions')
            .select('stripe_subscription_id, current_period_end')
            .eq('user_id', userId)
            .single();

        if (subError || !subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }

        if (!subscription.stripe_subscription_id) {
            return res.status(400).json({ error: 'No active subscription' });
        }

        // Cancel at end of billing period (not immediately)
        const canceledSubscription = await stripe.subscriptions.update(
            subscription.stripe_subscription_id,
            { cancel_at_period_end: true }
        );

        // Update database
        await supabaseAdmin
            .from('subscriptions')
            .update({
                cancel_at_period_end: true,
                status: 'active'
            })
            .eq('user_id', userId);

        const endDate = new Date(subscription.current_period_end);
        const formattedDate = endDate.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });

        console.log('[Cancel] Subscription cancelled for user:', userId, 'ends:', formattedDate);

        return res.status(200).json({
            success: true,
            accessUntil: formattedDate,
            message: `Your subscription has been cancelled. You'll have Pro access until ${formattedDate}.`
        });
    } catch (error) {
        console.error('[Cancel] Error:', error);
        return res.status(500).json({ error: error.message });
    }
};
