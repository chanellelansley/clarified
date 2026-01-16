// Vercel Serverless Function for Stripe checkout
const Stripe = require('stripe');

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// Price IDs - set these in your Stripe Dashboard
const PRICES = {
    pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_pro_monthly',
    pro_annual: process.env.STRIPE_PRICE_PRO_ANNUAL || 'price_pro_annual'
};

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
        if (!stripe) {
            return res.status(500).json({ error: 'Stripe not configured' });
        }

        const { userId, email, plan = 'pro_monthly' } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        // Get the price ID based on plan selection
        const priceId = PRICES[plan] || PRICES.pro_monthly;

        console.log('[Checkout] Creating session:', { userId, plan, priceId });

        const sessionConfig = {
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [{
                price: priceId,
                quantity: 1
            }],
            success_url: `${req.headers.origin || 'https://clarified.app'}/?upgrade_success=true`,
            cancel_url: `${req.headers.origin || 'https://clarified.app'}/?upgrade_canceled=true`,
            // Pass user_id in metadata for webhook handler
            metadata: {
                user_id: userId
            },
            // Also set client_reference_id as backup
            client_reference_id: userId
        };

        // Pre-fill email if provided
        if (email) {
            sessionConfig.customer_email = email;
        }

        const session = await stripe.checkout.sessions.create(sessionConfig);

        console.log('[Checkout] Session created:', session.id);
        return res.status(200).json({ url: session.url, sessionId: session.id });
    } catch (error) {
        console.error('[Checkout] Error:', error);
        return res.status(500).json({ error: error.message });
    }
};
