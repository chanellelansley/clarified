// Vercel Serverless Function for Stripe customer portal
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

        // Get user's Stripe customer ID
        const { data: subscription, error: subError } = await supabaseAdmin
            .from('subscriptions')
            .select('stripe_customer_id')
            .eq('user_id', userId)
            .single();

        if (subError || !subscription?.stripe_customer_id) {
            return res.status(404).json({ error: 'No Stripe customer found' });
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: subscription.stripe_customer_id,
            return_url: req.headers.origin || 'https://clarified.app'
        });

        console.log('[Portal] Session created for user:', userId);
        return res.status(200).json({ url: session.url });
    } catch (error) {
        console.error('[Portal] Error:', error);
        return res.status(500).json({ error: error.message });
    }
};
