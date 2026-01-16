// Vercel Serverless Function for Stripe checkout
const Stripe = require('stripe');

// Validate Stripe configuration at startup
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

// Price IDs - set these in your Stripe Dashboard
const PRICES = {
    pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
    pro_annual: process.env.STRIPE_PRICE_PRO_ANNUAL
};

// Log configuration status (without exposing secrets)
console.log('[Checkout] Server startup - config check:', {
    stripe_configured: !!STRIPE_SECRET_KEY,
    price_monthly_configured: !!PRICES.pro_monthly,
    price_annual_configured: !!PRICES.pro_annual
});

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'method_not_allowed' });
    }

    const { userId, email, plan = 'pro_monthly' } = req.body || {};

    console.log('[Checkout] Request received:', {
        userId: userId ? `${userId.substring(0, 8)}...` : null,
        email: email ? `${email.split('@')[0]}@...` : null,
        plan
    });

    // Validate Stripe is configured
    if (!stripe) {
        console.error('[Checkout] STRIPE_SECRET_KEY not configured');
        return res.status(500).json({ error: 'stripe_not_configured' });
    }

    // Validate price IDs are configured
    const priceId = PRICES[plan];
    if (!priceId) {
        console.error('[Checkout] Price ID not configured for plan:', plan);
        return res.status(500).json({ error: 'stripe_not_configured', details: 'Price not configured' });
    }

    // Validate userId is present
    if (!userId) {
        console.error('[Checkout] Missing userId in request');
        return res.status(400).json({ error: 'not_authenticated' });
    }

    // Validate userId format (should be a UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
        console.error('[Checkout] Invalid userId format:', userId.substring(0, 8) + '...');
        return res.status(400).json({ error: 'invalid_user_id' });
    }

    try {
        console.log('[Checkout] Creating Stripe session:', { plan, priceId: priceId.substring(0, 20) + '...' });

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

        console.log('[Checkout] Session created successfully:', {
            sessionId: session.id,
            url: session.url ? 'present' : 'missing'
        });

        return res.status(200).json({ url: session.url, sessionId: session.id });
    } catch (error) {
        console.error('[Checkout] Stripe error:', {
            type: error.type,
            code: error.code,
            message: error.message
        });

        // Return a user-friendly error
        if (error.type === 'StripeInvalidRequestError') {
            return res.status(400).json({ error: 'checkout_configuration_error', details: error.message });
        }

        return res.status(500).json({ error: 'checkout_failed', details: error.message });
    }
};
