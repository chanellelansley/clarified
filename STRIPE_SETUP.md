# Stripe Payment Integration Setup

This guide will help you set up Stripe payments for the Clarified app.

## Prerequisites

1. A Stripe account ([sign up at stripe.com](https://stripe.com))
2. Supabase project set up (see SUPABASE_SETUP.md)

## Step 1: Get Stripe API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Click on **Developers** → **API keys**
3. Copy the following keys:
   - **Publishable key** (starts with `pk_`)
   - **Secret key** (starts with `sk_` - keep this secure!)

## Step 2: Create Stripe Products & Prices

### Create Pro Subscription

1. Go to **Products** → **Add product**
2. Fill in:
   - Name: `Clarified Pro`
   - Description: `Unlimited Everyday decisions, 2 Life decisions/month, what-if scenarios, Decision Profile, outcome tracking`
   - Pricing model: `Recurring`
   - Price: `$8.00 USD`
   - Billing period: `Monthly`
3. Click **Save product**
4. Copy the **Price ID** (starts with `price_`)

### Create Life Decision (One-time Payment)

1. Go to **Products** → **Add product**
2. Fill in:
   - Name: `Life Decision`
   - Description: `One Life decision with what-if scenarios`
   - Pricing model: `One time`
   - Price: `$5.00 USD`
3. Click **Save product**
4. Copy the **Price ID** (starts with `price_`)

## Step 3: Add Keys to .env File

Add these to your `.env` file:

```env
# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PRO_PRICE_ID=price_xxxxx
STRIPE_LIFE_PRICE_ID=price_xxxxx
```

## Step 4: Set Up Stripe Webhook

Webhooks allow Stripe to notify your app when payments succeed, subscriptions are updated, etc.

### For Local Development (Using Stripe CLI)

1. Install the Stripe CLI: https://stripe.com/docs/stripe-cli
2. Run: `stripe login`
3. Forward webhooks to your local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhook
   ```
4. Copy the webhook signing secret (starts with `whsec_`)
5. Add to `.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```

### For Production

1. Go to **Developers** → **Webhooks** → **Add endpoint**
2. Set endpoint URL: `https://yourdomain.com/api/webhook`
3. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the webhook signing secret
5. Add to production environment variables:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_prod_xxxxx
   ```

## Step 5: Set Up Supabase Database

Run the SQL schema in `supabase-subscription-schema.sql`:

1. Go to your Supabase project → **SQL Editor**
2. Copy and paste the entire contents of `supabase-subscription-schema.sql`
3. Click **Run**

This creates:
- `subscriptions` table
- `usage_tracking` table
- RLS policies
- Automatic usage reset triggers

## Step 6: Get Supabase Service Role Key

The server needs the service role key to update subscription data via webhooks.

1. Go to Supabase Dashboard → **Settings** → **API**
2. Copy the **service_role** key (starts with `eyJ` - keep this VERY secure!)
3. Add to `.env`:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=eyJxxxxxxx
   ```

⚠️ **WARNING**: The service role key bypasses Row Level Security. NEVER expose it to the client!

## Step 7: Test the Integration

1. Start your server: `npm start`
2. Create a test account in your app
3. Try upgrading to Pro:
   - Use Stripe test card: `4242 4242 4242 4242`
   - Any future expiry date
   - Any 3-digit CVC
4. Verify:
   - Checkout completes successfully
   - Webhook processes the event
   - Subscription status updates in Supabase
   - Account page shows "Pro Plan"

## Stripe Test Cards

- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires authentication (3D Secure): `4000 0025 0000 3155`

## Webhooks to Handle

The app handles these Stripe events:

- `checkout.session.completed` - Payment succeeded, activate subscription or add Life decision credit
- `customer.subscription.created/updated` - Update subscription status
- `customer.subscription.deleted` - Downgrade to free plan
- `invoice.payment_succeeded` - Reset usage for new billing period
- `invoice.payment_failed` - Handle failed payments

## Usage Limits

### Free Plan
- 5 Everyday decisions/month
- 1 Life decision (free trial, requires card on file)
- No what-if scenarios
- No Decision Profile
- No outcome tracking

### Pro Plan ($8/month)
- Unlimited Everyday decisions
- 2 Life decisions/month
- What-if scenarios included
- Full Decision Profile
- Outcome tracking

### Pay-per-use
- $5 per Life decision (no subscription)
- Includes what-if scenarios for that decision
- No Profile or outcome tracking

## Troubleshooting

### Webhook not working
- Check webhook signing secret is correct
- For local dev, ensure `stripe listen` is running
- Check server logs for webhook errors

### Subscription not updating
- Verify service role key is set
- Check Supabase table exists
- Look for errors in webhook handler logs

### Checkout redirect fails
- Verify success/cancel URLs are correct
- Check Stripe publishable key is set in frontend

## Going Live

Before going to production:

1. **Switch to live mode** in Stripe Dashboard
2. Get **live API keys** (starts with `pk_live_` and `sk_live_`)
3. Create **live products** and prices
4. Set up **live webhook** endpoint
5. Update `.env` with live keys
6. **Test thoroughly** with real cards before launch!

## Support

- Stripe Documentation: https://stripe.com/docs
- Stripe Support: https://support.stripe.com
- Test your integration: https://dashboard.stripe.com/test/payments
