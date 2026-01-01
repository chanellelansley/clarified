// Vercel Serverless Function for Stripe webhooks
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const stripe = process.env.STRIPE_SECRET_KEY ? Stripe(process.env.STRIPE_SECRET_KEY) : null;
const supabaseAdmin = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

// Disable body parsing for webhook signature verification
export const config = {
    api: {
        bodyParser: false,
    },
};

async function getRawBody(req) {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => resolve(data));
        req.on('error', reject);
    });
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        if (!stripe || !supabaseAdmin) {
            return res.status(500).json({ error: 'Services not configured' });
        }

        const rawBody = await getRawBody(req);
        const sig = req.headers['stripe-signature'];
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

        let event;
        try {
            event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
        } catch (err) {
            console.error('[Webhook] Signature verification failed:', err.message);
            return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
        }

        console.log('[Webhook] Event received:', event.type);

        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(event.data.object);
                break;
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted':
                await handleSubscriptionUpdate(event.data.object);
                break;
            default:
                console.log('[Webhook] Unhandled event type:', event.type);
        }

        return res.status(200).json({ received: true });
    } catch (error) {
        console.error('[Webhook] Error:', error);
        return res.status(500).json({ error: error.message });
    }
};

async function handleCheckoutCompleted(session) {
    console.log('[Webhook] Checkout completed:', session.id);
    const userId = session.client_reference_id || session.metadata?.userId;

    if (!userId) {
        console.error('[Webhook] No user ID in checkout session');
        return;
    }

    // Get subscription details from Stripe
    const subscription = await stripe.subscriptions.retrieve(session.subscription);

    // Update database
    const { error } = await supabaseAdmin
        .from('subscriptions')
        .upsert({
            user_id: userId,
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            plan: 'pro',
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
        }, { onConflict: 'user_id' });

    if (error) {
        console.error('[Webhook] Error updating subscription:', error);
    } else {
        console.log('[Webhook] Subscription updated for user:', userId);
    }
}

async function handleSubscriptionUpdate(subscription) {
    console.log('[Webhook] Subscription updated:', subscription.id);

    // Find user by Stripe customer ID
    const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', subscription.id)
        .single();

    if (!sub) {
        console.error('[Webhook] No user found for subscription:', subscription.id);
        return;
    }

    const plan = subscription.status === 'active' ? 'pro' : 'free';

    const { error } = await supabaseAdmin
        .from('subscriptions')
        .update({
            status: subscription.status,
            plan: plan,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end
        })
        .eq('user_id', sub.user_id);

    if (error) {
        console.error('[Webhook] Error updating subscription:', error);
    } else {
        console.log('[Webhook] Subscription status updated:', subscription.status);
    }
}
