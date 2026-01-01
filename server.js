require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY ? Stripe(process.env.STRIPE_SECRET_KEY) : null;

// Initialize Supabase Admin Client (for server-side operations)
const supabaseAdmin = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

// Middleware
app.use(cors());

// Stripe webhook needs raw body
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    if (!stripe) {
        return res.status(500).json({ error: 'Stripe not configured' });
    }

    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log('📨 Stripe webhook received:', event.type);

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(event.data.object);
                break;

            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                await handleSubscriptionUpdate(event.data.object);
                break;

            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object);
                break;

            case 'invoice.payment_succeeded':
                await handlePaymentSucceeded(event.data.object);
                break;

            case 'invoice.payment_failed':
                await handlePaymentFailed(event.data.object);
                break;

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });
    } catch (error) {
        console.error('Webhook handler error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Webhook handler functions
async function handleCheckoutCompleted(session) {
    const userId = session.metadata?.user_id;
    const priceId = session.metadata?.price_id;
    const customerId = session.customer;

    console.log('✅ Checkout completed:', {
        userId,
        priceId,
        customerId,
        mode: session.mode,
        subscriptionId: session.subscription
    });

    if (!userId) {
        console.error('❌ No user_id in session metadata!');
        return;
    }

    // If it's a one-time payment (Life decision)
    if (session.mode === 'payment') {
        if (priceId === process.env.STRIPE_LIFE_PRICE_ID) {
            // Increment life_decisions_purchased
            const { error } = await supabaseAdmin
                .from('subscriptions')
                .update({
                    life_decisions_purchased: supabaseAdmin.sql`life_decisions_purchased + 1`
                })
                .eq('user_id', userId);

            if (error) {
                console.error('Error updating life decisions:', error);
            } else {
                console.log('✅ Life decision purchased for user:', userId);
            }
        }
    }
    // If it's a subscription (Pro plan)
    else if (session.mode === 'subscription') {
        const subscriptionId = session.subscription;
        console.log('📦 Retrieving subscription:', subscriptionId);

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        console.log('📦 Subscription details:', {
            id: subscription.id,
            status: subscription.status,
            customer: subscription.customer
        });

        // Pass userId directly since we have it from metadata
        await handleSubscriptionUpdate(subscription, userId);
    }
}

async function handleSubscriptionUpdate(subscription, passedUserId = null) {
    const customerId = subscription.customer;
    let userId = passedUserId;

    // If userId wasn't passed, look it up by customer ID
    if (!userId) {
        console.log('🔍 Looking up user by customer ID:', customerId);
        const { data: existingSubscription } = await supabaseAdmin
            .from('subscriptions')
            .select('user_id')
            .eq('stripe_customer_id', customerId)
            .single();

        if (!existingSubscription) {
            console.error('❌ No user found for customer:', customerId);
            return;
        }
        userId = existingSubscription.user_id;
    }

    console.log('📝 Updating subscription for user:', userId);

    // Update subscription in database
    const { error } = await supabaseAdmin
        .from('subscriptions')
        .update({
            stripe_subscription_id: subscription.id,
            plan: 'pro',
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end
        })
        .eq('user_id', userId);

    if (error) {
        console.error('❌ Error updating subscription:', error);
    } else {
        console.log('✅ Successfully updated subscription for user:', userId, '→ Pro plan');
    }
}

async function handleSubscriptionDeleted(subscription) {
    const customerId = subscription.customer;

    // Find user by Stripe customer ID
    const { data: existingSubscription } = await supabaseAdmin
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_customer_id', customerId)
        .single();

    if (!existingSubscription) {
        return;
    }

    const userId = existingSubscription.user_id;

    // Downgrade to free plan
    const { error } = await supabaseAdmin
        .from('subscriptions')
        .update({
            plan: 'free',
            status: 'canceled',
            stripe_subscription_id: null
        })
        .eq('user_id', userId);

    if (error) {
        console.error('Error downgrading subscription:', error);
    } else {
        console.log('✅ Downgraded user to free:', userId);
    }
}

async function handlePaymentSucceeded(invoice) {
    // Reset usage tracking for the new billing period
    const subscriptionId = invoice.subscription;
    if (!subscriptionId) return;

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await handleSubscriptionUpdate(subscription);
}

async function handlePaymentFailed(invoice) {
    console.error('Payment failed for subscription:', invoice.subscription);
    // Could send notification to user
}

// All other routes use JSON middleware
app.use(express.json());

// Environment variable validation
if (!process.env.CLAUDE_API_KEY) {
    console.error('❌ ERROR: CLAUDE_API_KEY not found in environment variables');
    console.error('Please create a .env file with your API keys. See .env.example for reference.');
    process.exit(1);
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.warn('⚠️  WARNING: Supabase credentials not found. Database features will not work.');
    console.warn('Please add SUPABASE_URL and SUPABASE_ANON_KEY to your .env file.');
}

// API configuration
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

// Expose Supabase config to frontend (anon key is safe to expose)
const SUPABASE_CONFIG = {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY
};

// Endpoint to handle chat messages
app.post('/api/chat', async (req, res) => {
    try {
        const { messages, system } = req.body;

        console.log('📨 Received request with', messages?.length || 0, 'messages');

        // Call Claude API
        const response = await fetch(CLAUDE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 1024,
                system: system,
                messages: messages
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Claude API error:', errorData);
            return res.status(response.status).json({
                error: errorData.error?.message || 'API request failed'
            });
        }

        const data = await response.json();
        console.log('✅ Successfully received response from Claude');

        res.json(data);
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({
            error: 'Internal server error: ' + error.message
        });
    }
});

// Supabase config endpoint
app.get('/api/config', (req, res) => {
    res.json({
        supabase: SUPABASE_CONFIG,
        stripe: {
            publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
            proPriceId: process.env.STRIPE_PRO_PRICE_ID,
            lifePriceId: process.env.STRIPE_LIFE_PRICE_ID
        }
    });
});

// ============================================
// STRIPE PAYMENT ENDPOINTS
// ============================================

// Create Stripe Checkout Session
app.post('/api/create-checkout-session', async (req, res) => {
    try {
        if (!stripe) {
            return res.status(500).json({ error: 'Stripe not configured' });
        }

        const { priceId, mode, userId, successUrl, cancelUrl } = req.body;

        if (!priceId || !mode || !userId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Get or create Stripe customer
        const { data: subscription, error: subError } = await supabaseAdmin
            .from('subscriptions')
            .select('stripe_customer_id')
            .eq('user_id', userId)
            .maybeSingle(); // Use maybeSingle() instead of single() to allow null

        let customerId = subscription?.stripe_customer_id;

        if (!customerId) {
            // Create new Stripe customer
            const customer = await stripe.customers.create({
                metadata: { supabase_user_id: userId }
            });
            customerId = customer.id;

            // Create or update subscription record with customer ID
            if (!subscription) {
                // No subscription record exists, create one
                const insertData = {
                    user_id: userId,
                    stripe_customer_id: customerId,
                    plan: 'free',
                    status: 'active',
                    everyday_decisions_used: 0,
                    life_decisions_used: 0,
                    trial_life_used: false
                };

                await supabaseAdmin
                    .from('subscriptions')
                    .insert(insertData);
            } else {
                // Subscription exists, just update with customer ID
                await supabaseAdmin
                    .from('subscriptions')
                    .update({ stripe_customer_id: customerId })
                    .eq('user_id', userId);
            }
        }

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: mode, // 'subscription' or 'payment'
            line_items: [
                {
                    price: priceId,
                    quantity: 1
                }
            ],
            success_url: successUrl || `${req.headers.origin}/?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: cancelUrl || `${req.headers.origin}/`,
            metadata: {
                user_id: userId,
                price_id: priceId
            }
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error('Stripe checkout error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get user subscription status
app.get('/api/user-subscription/:userId', async (req, res) => {
    try {
        if (!supabaseAdmin) {
            return res.status(500).json({ error: 'Supabase not configured' });
        }

        const { userId } = req.params;

        // Get subscription info
        const { data: subscription, error: subError } = await supabaseAdmin
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle(); // Use maybeSingle() to allow null instead of throwing error

        if (subError) {
            console.error('Error fetching subscription:', subError);
            return res.status(500).json({ error: subError.message });
        }

        // Get usage info
        const { data: usage, error: usageError } = await supabaseAdmin
            .from('usage_tracking')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(); // Use maybeSingle() to allow null

        if (usageError && usageError.code !== 'PGRST116') { // Ignore "not found" error
            console.error('Error fetching usage:', usageError);
        }

        res.json({
            subscription: subscription || { plan: 'free', status: 'active' },
            usage: usage || { everyday_decisions_used: 0, life_decisions_used: 0, trial_life_used: false }
        });
    } catch (error) {
        console.error('Error fetching user subscription:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create Stripe Customer Portal session
app.post('/api/create-portal-session', async (req, res) => {
    try {
        if (!stripe) {
            return res.status(500).json({ error: 'Stripe not configured' });
        }

        const { userId, returnUrl } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'Missing userId' });
        }

        // Get customer ID
        const { data: subscription } = await supabaseAdmin
            .from('subscriptions')
            .select('stripe_customer_id')
            .eq('user_id', userId)
            .single();

        if (!subscription?.stripe_customer_id) {
            return res.status(404).json({ error: 'No subscription found' });
        }

        // Create portal session
        const session = await stripe.billingPortal.sessions.create({
            customer: subscription.stripe_customer_id,
            return_url: returnUrl || `${req.headers.origin}/`
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error('Stripe portal error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Cancel subscription (at end of billing period)
app.post('/api/cancel-subscription', async (req, res) => {
    try {
        if (!stripe) {
            return res.status(500).json({ error: 'Stripe not configured' });
        }

        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'Missing userId' });
        }

        // Get subscription info
        const { data: subscription } = await supabaseAdmin
            .from('subscriptions')
            .select('stripe_subscription_id, current_period_end')
            .eq('user_id', userId)
            .single();

        if (!subscription?.stripe_subscription_id) {
            return res.status(404).json({ error: 'No active subscription found' });
        }

        // Cancel at end of billing period (not immediately)
        const canceledSubscription = await stripe.subscriptions.update(
            subscription.stripe_subscription_id,
            { cancel_at_period_end: true }
        );

        // Update database to reflect pending cancellation
        await supabaseAdmin
            .from('subscriptions')
            .update({
                cancel_at_period_end: true,
                status: 'active' // Still active until period ends
            })
            .eq('user_id', userId);

        const endDate = new Date(canceledSubscription.current_period_end * 1000);
        const formattedDate = endDate.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });

        console.log('✅ Subscription cancelled for user:', userId, '- Access until:', formattedDate);

        res.json({
            success: true,
            accessUntil: formattedDate,
            message: `Your subscription has been cancelled. You'll have Pro access until ${formattedDate}.`
        });
    } catch (error) {
        console.error('Cancel subscription error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// Default route - serve index.html
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Serve static files (CSS, JS, etc.) - but not HTML files by default
app.use(express.static('.', {
    index: false  // Don't serve index.html automatically
}));

app.listen(PORT, () => {
    console.log(`\n🚀 Server running at http://localhost:${PORT}`);
    console.log(`📝 Open http://localhost:${PORT} in your browser\n`);
});
