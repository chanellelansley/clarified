// Vercel Serverless Function for getting user subscription
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        if (!supabaseAdmin) {
            return res.status(500).json({ error: 'Supabase not configured' });
        }

        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ error: 'User ID required' });
        }

        // Get subscription data
        const { data: subscription, error: subError } = await supabaseAdmin
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (subError && subError.code !== 'PGRST116') {
            console.error('[Subscription] Query error:', subError);
        }

        // Get usage data
        const { data: usage, error: usageError } = await supabaseAdmin
            .from('usage_tracking')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (usageError && usageError.code !== 'PGRST116') {
            console.error('[Subscription] Usage query error:', usageError);
        }

        const result = {
            subscription: subscription || {
                plan: 'free',
                status: 'active',
                is_beta_user: false,
                founding_member: false
            },
            usage: usage || {
                everyday_decisions_used: 0,
                life_decisions_used: 0,
                trial_life_used: false
            }
        };

        console.log('[Subscription] Data retrieved for user:', userId);
        return res.status(200).json(result);
    } catch (error) {
        console.error('[Subscription] Error:', error);
        return res.status(500).json({ error: error.message });
    }
};
