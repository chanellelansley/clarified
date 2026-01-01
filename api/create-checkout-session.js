// Vercel Serverless Function for Stripe checkout
const Stripe = require('stripe');

const stripe = process.env.STRIPE_SECRET_KEY ? Stripe(process.env.STRIPE_SECRET_KEY) : null;

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

        const { priceId, userId, mode, successUrl, cancelUrl } = req.body;

        console.log('[Checkout] Creating session for user:', userId, 'price:', priceId, 'mode:', mode);

        const session = await stripe.checkout.sessions.create({
            mode: mode || 'subscription',
            payment_method_types: ['card'],
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: successUrl || `${req.headers.origin || 'https://clarified.app'}/?upgrade_success=true`,
            cancel_url: cancelUrl || `${req.headers.origin || 'https://clarified.app'}/?upgrade_canceled=true`,
            client_reference_id: userId,
            metadata: { userId }
        });

        console.log('[Checkout] Session created:', session.id);
        return res.status(200).json({ url: session.url, sessionId: session.id });
    } catch (error) {
        console.error('[Checkout] Error:', error);
        return res.status(500).json({ error: error.message });
    }
};
