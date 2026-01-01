# Subscription Creation Errors - Fixes Applied

Fixed multiple errors preventing test subscription creation.

---

## ERRORS FOUND

From console screenshot:

1. ❌ **"Cannot coerce the result to a single JSON object"**
   - `/api/user-subscription` endpoint failing
   - Using `.single()` when no record exists

2. ❌ **"Invalid API Key provided: sk_live*****"**
   - Using **LIVE** Stripe key instead of **TEST** key
   - **CRITICAL**: Never use live keys for testing!

3. ❌ **"Could not find the 'founding_member' column"**
   - Database schema missing columns from early tester feature
   - Trying to insert `founding_member` field that doesn't exist

---

## FIXES APPLIED

### 1. Fixed `.single()` Errors in Server

**Changed in two locations** [server.js:366, 380](server.js#L366):

**Before**:
```javascript
.single(); // Throws error if no record
```

**After**:
```javascript
.maybeSingle(); // Returns null if no record, doesn't throw
```

**Locations fixed**:
- Line 366: `getUserSubscription` - fetching subscription record
- Line 380: `getUserSubscription` - fetching usage tracking record
- Line 293: `createCheckoutSession` - fetching subscription for customer ID

**Result**: No more "Cannot coerce to single JSON object" errors

---

### 2. Removed `founding_member` from Insert

**Changed** [server.js:307-319](server.js#L307-L319):

**Before**:
```javascript
.insert({
    user_id: userId,
    stripe_customer_id: customerId,
    plan: 'free',
    status: 'active',
    everyday_decisions_used: 0,
    life_decisions_used: 0,
    trial_life_used: false,
    founding_member: false,  // ❌ Column doesn't exist
    is_beta_user: false      // ❌ Column doesn't exist
});
```

**After**:
```javascript
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
```

**Result**: No more "founding_member column not found" error

---

## ⚠️ CRITICAL: STRIPE KEY ISSUE

### Problem

You're using a **LIVE Stripe secret key** (`sk_live_*****`) instead of a **TEST** key.

**Error in console**:
```
Invalid API Key provided: sk_live***********************************here
```

### ⚠️ DANGER

- **NEVER** use live keys for development/testing
- Live keys charge **REAL money**
- Test subscriptions will bill actual credit cards

### ✅ SOLUTION

Update your `.env` file to use **TEST** keys:

```env
# ❌ WRONG - Do NOT use live keys
STRIPE_SECRET_KEY=sk_live_51...

# ✅ CORRECT - Use test keys
STRIPE_SECRET_KEY=sk_test_51...
STRIPE_PUBLISHABLE_KEY=pk_test_51...
STRIPE_PRO_PRICE_ID=price_test_...
STRIPE_LIFE_PRICE_ID=price_test_...
```

**How to get test keys**:
1. Go to https://dashboard.stripe.com/test/apikeys
2. Make sure you're in **Test mode** (toggle in top right)
3. Copy the test secret key (`sk_test_...`)
4. Copy the test publishable key (`pk_test_...`)

**How to create test price IDs**:
1. Go to https://dashboard.stripe.com/test/products
2. Create products for:
   - **Pro Plan**: $8/month recurring subscription
   - **Life Decision**: $5 one-time payment
3. Copy the **Price ID** (starts with `price_test_...`)

---

## OPTIONAL: ADD EARLY TESTER COLUMNS

If you want the `founding_member` and `is_beta_user` features, run this SQL in Supabase:

**Location**: [supabase-early-tester-schema.sql](supabase-early-tester-schema.sql)

```sql
-- Add columns to subscriptions table
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS founding_member BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_beta_user BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_seen_welcome BOOLEAN DEFAULT FALSE;

-- Create decision_feedback table
CREATE TABLE IF NOT EXISTS public.decision_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    decision_id TEXT NOT NULL,
    feedback_type TEXT NOT NULL,
    feedback_value INTEGER,
    feedback_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.decision_feedback ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can insert their own feedback"
ON public.decision_feedback
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own feedback"
ON public.decision_feedback
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
```

**Then update** [server.js:307-319](server.js#L307-L319) to include:
```javascript
const insertData = {
    user_id: userId,
    stripe_customer_id: customerId,
    plan: 'free',
    status: 'active',
    everyday_decisions_used: 0,
    life_decisions_used: 0,
    trial_life_used: false,
    founding_member: false,  // Now safe to include
    is_beta_user: false
};
```

---

## TESTING CHECKLIST

### ✅ Step 1: Fix Stripe Keys

- [ ] Open `.env` file
- [ ] Change `STRIPE_SECRET_KEY` to `sk_test_...`
- [ ] Change `STRIPE_PUBLISHABLE_KEY` to `pk_test_...`
- [ ] Change `STRIPE_PRO_PRICE_ID` to `price_test_...` (from test product)
- [ ] Change `STRIPE_LIFE_PRICE_ID` to `price_test_...` (from test product)
- [ ] Restart server: `npm start`

### ✅ Step 2: Test Subscription Creation

1. Sign up with a new test account
2. Navigate to Account page
3. Click "Upgrade to Pro"
4. Should redirect to Stripe Checkout (test mode)
5. Use test card: `4242 4242 4242 4242`
6. Check console - should see no errors

### ✅ Step 3: Verify Database

In Supabase:
1. Check `subscriptions` table
2. Should see new row with:
   - `stripe_customer_id` populated
   - `plan = 'free'`
   - `status = 'active'`

---

## CURRENT STATUS

**Fixed**:
- ✅ `.single()` errors (changed to `.maybeSingle()`)
- ✅ `founding_member` column error (removed from insert)
- ✅ Automatic subscription record creation

**Still Need to Fix**:
- ⚠️ **CRITICAL**: Change Stripe keys from LIVE to TEST
- ⚠️ Create test products and price IDs in Stripe
- ⚠️ Update `.env` file with test keys

**Optional**:
- Add early tester columns to database
- Enable founding member badges

---

## FILES MODIFIED

### server.js
- **Line 293**: Changed `.single()` to `.maybeSingle()` for checkout session
- **Lines 307-319**: Simplified insert data (removed missing columns)
- **Line 366**: Changed `.single()` to `.maybeSingle()` for subscription fetch
- **Line 380**: Changed `.single()` to `.maybeSingle()` for usage fetch

---

## NEXT STEPS

1. **IMMEDIATE**: Change to test Stripe keys (see above)
2. **IMMEDIATE**: Create test products in Stripe
3. **IMMEDIATE**: Update `.env` with test price IDs
4. **IMMEDIATE**: Restart server
5. Test subscription creation
6. Optional: Add early tester schema to database

**Last Updated**: 2025-12-30
