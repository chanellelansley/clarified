// Vercel Serverless Function for Stripe webhooks
// This route handles raw body parsing for signature verification

const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Disable body parsing - Stripe requires raw body for signature verification
export const config = {
    api: {
        bodyParser: false,
    },
};

// Helper to get raw body from request stream
async function getRawBody(req) {
    const chunks = [];
    for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    let event;

    try {
        const rawBody = await getRawBody(req);
        const signature = req.headers['stripe-signature'];

        // Verify webhook signature
        event = stripe.webhooks.constructEvent(
            rawBody,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('[Stripe Webhook] Signature verification failed:', err.message);
        return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    // Handle the event
    console.log('[Stripe Webhook] Event received:', event.type);

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(event.data.object);
                break;

            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object);
                break;

            default:
                // Ignore all other events
                console.log('[Stripe Webhook] Ignored event type:', event.type);
        }
    } catch (err) {
        console.error('[Stripe Webhook] Handler error:', err);
        // Still return 200 to acknowledge receipt
    }

    // Return 200 quickly
    return res.status(200).json({ received: true });
};

/**
 * Handle checkout.session.completed
 * - Read user_id from session.metadata.user_id
 * - Set subscriptions.plan = 'pro' and status = 'active'
 * - Store stripe_customer_id and stripe_subscription_id
 */
async function handleCheckoutCompleted(session) {
    const userId = session.metadata?.user_id;

    if (!userId) {
        console.error('[Stripe Webhook] No user_id in session metadata');
        return;
    }

    console.log('[Stripe Webhook] Checkout completed for user:', userId);

    // Upsert subscription record
    const { error } = await supabaseAdmin
        .from('subscriptions')
        .upsert({
            user_id: userId,
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            plan: 'pro',
            status: 'active'
        }, {
            onConflict: 'user_id'
        });

    if (error) {
        console.error('[Stripe Webhook] Failed to update subscription:', error);
        throw error;
    }

    console.log('[Stripe Webhook] User upgraded to Pro:', userId);
}

/**
 * Handle customer.subscription.deleted
 * - Look up user by stripe_customer_id
 * - Set plan = 'free' and status = 'canceled'
 */
async function handleSubscriptionDeleted(subscription) {
    const customerId = subscription.customer;

    if (!customerId) {
        console.error('[Stripe Webhook] No customer ID in subscription');
        return;
    }

    console.log('[Stripe Webhook] Subscription deleted for customer:', customerId);

    const { error } = await supabaseAdmin
        .from('subscriptions')
        .update({
            plan: 'free',
            status: 'canceled'
        })
        .eq('stripe_customer_id', customerId);

    if (error) {
        console.error('[Stripe Webhook] Failed to update subscription:', error);
        throw error;
    }

    console.log('[Stripe Webhook] User downgraded from Pro:', customerId);
}
