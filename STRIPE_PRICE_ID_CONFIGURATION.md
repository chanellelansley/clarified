# Stripe Price ID Configuration Guide

This guide shows where to set your Stripe Price IDs to fix the "Pro plan not configured" error.

---

## 🎯 WHERE TO SET STRIPE PRICE IDs

### Location: `.env` file
**File**: [.env](/.env) (lines 15-16)

```env
STRIPE_PRO_PRICE_ID=price_your_pro_price_id
STRIPE_LIFE_PRICE_ID=price_your_life_price_id
```

**Current values** (need to be replaced):
```env
STRIPE_PRO_PRICE_ID=pricprice_1Sjt6vItLSMazAtctgz1QKJPe_your_pro_price_id
STRIPE_LIFE_PRICE_ID=priceprice_1Sjt8MItLSMazAtc3wJM8W1V_your_life_price_id
```

**What to replace**:
- `STRIPE_PRO_PRICE_ID`: Replace with your actual Stripe Price ID for the Pro subscription
- `STRIPE_LIFE_PRICE_ID`: Replace with your actual Stripe Price ID for the one-time Life decision purchase

---

## 📊 HOW IT WORKS

### 1. User Clicks "Upgrade to Pro"
**Location**: [payments.js:46-68](payments.js#L46-L68)

```javascript
async function upgradeToPro() {
    // Get Pro price ID from environment
    const priceId = await getStripePriceId('pro');
    if (!priceId) {
        alert('Pro plan not configured. Please contact support.'); // ← ERROR SHOWN HERE
        return;
    }

    // Create checkout session
    const { url } = await window.supabaseClient.createCheckoutSession(priceId, 'subscription');

    // Redirect to Stripe Checkout
    window.location.href = url;
}
```

### 2. `getStripePriceId()` Fetches from Server
**Location**: [payments.js:96-110](payments.js#L96-L110)

```javascript
async function getStripePriceId(type) {
    try {
        const response = await fetch('/api/config');
        const config = await response.json();

        if (type === 'pro') {
            return config.stripe?.proPriceId;  // ← Returns STRIPE_PRO_PRICE_ID
        } else if (type === 'life') {
            return config.stripe?.lifePriceId; // ← Returns STRIPE_LIFE_PRICE_ID
        }
    } catch (error) {
        console.error('Error fetching price ID:', error);
        return null; // ← Returns null if .env not set, triggering error
    }
}
```

### 3. Server Exposes Config
**Location**: [server.js:260-269](server.js#L260-L269)

```javascript
app.get('/api/config', (req, res) => {
    res.json({
        supabase: SUPABASE_CONFIG,
        stripe: {
            publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
            proPriceId: process.env.STRIPE_PRO_PRICE_ID,      // ← From .env
            lifePriceId: process.env.STRIPE_LIFE_PRICE_ID     // ← From .env
        }
    });
});
```

---

## 🔑 HOW TO GET STRIPE PRICE IDs

### Step 1: Log into Stripe Dashboard
Go to: https://dashboard.stripe.com/

### Step 2: Create Products (if not already created)

#### Pro Subscription Product
1. Go to **Products** → **Add product**
2. Name: "Clarified Pro"
3. Description: "Pro subscription - unlimited Everyday decisions, 2 Life decisions/month"
4. Pricing:
   - Type: **Recurring**
   - Price: **$8.00 USD**
   - Billing period: **Monthly**
5. Click **Save product**
6. Copy the **Price ID** (starts with `price_`)

#### Life Decision One-Time Purchase
1. Go to **Products** → **Add product**
2. Name: "Life Decision (One-Time)"
3. Description: "Single Life decision purchase"
4. Pricing:
   - Type: **One-time**
   - Price: **$5.00 USD** (or your chosen price)
5. Click **Save product**
6. Copy the **Price ID** (starts with `price_`)

### Step 3: Update `.env` File
Replace the placeholder values:

```env
# Before
STRIPE_PRO_PRICE_ID=pricprice_1Sjt6vItLSMazAtctgz1QKJPe_your_pro_price_id
STRIPE_LIFE_PRICE_ID=priceprice_1Sjt8MItLSMazAtc3wJM8W1V_your_life_price_id

# After (example)
STRIPE_PRO_PRICE_ID=price_1ABcDeFgHiJkLmNoPqRsTuVw
STRIPE_LIFE_PRICE_ID=price_1XyZaBcDeFgHiJkLmNoPqRs
```

### Step 4: Restart Server
After updating `.env`, restart your Node.js server:

```bash
# Stop the server (Ctrl+C)
# Then restart it
node server.js
```

---

## 🧪 TESTING

### Test Pro Subscription
1. Navigate to Account page
2. Click "Upgrade to Pro" button
3. **Before fix**: Alert says "Pro plan not configured"
4. **After fix**: Redirects to Stripe Checkout with Pro subscription

### Test Life Decision Purchase
1. Try to make a 2nd Life decision (after free trial used)
2. Click "Buy Life decision ($5)"
3. **Before fix**: Alert says "Life decision pricing not configured"
4. **After fix**: Redirects to Stripe Checkout for one-time payment

---

## 📝 CURRENT STATUS

### Your `.env` File Status:

✅ **Stripe keys configured**:
```env
STRIPE_PUBLISHABLE_KEY=pk_live_...  # ✅ Set
STRIPE_SECRET_KEY=sk_live_...       # ✅ Set
STRIPE_WEBHOOK_SECRET=whsec_...     # ✅ Set
```

⚠️ **Price IDs need updating**:
```env
STRIPE_PRO_PRICE_ID=pricprice_1Sjt6vItLSMazAtctgz1QKJPe_your_pro_price_id  # ⚠️ Placeholder
STRIPE_LIFE_PRICE_ID=priceprice_1Sjt8MItLSMazAtc3wJM8W1V_your_life_price_id # ⚠️ Placeholder
```

**What's wrong**:
- Price IDs have "pricprice_" instead of "price_" (duplicated prefix)
- They contain placeholder text "_your_pro_price_id"
- They won't match any real Stripe products

---

## 🔍 ERROR MESSAGES & FIXES

### Error 1: "Pro plan not configured"
**Where shown**: [payments.js:55](payments.js#L55)
**Trigger**: `getStripePriceId('pro')` returns `null`
**Fix**: Set valid `STRIPE_PRO_PRICE_ID` in `.env`

### Error 2: "Life decision pricing not configured"
**Where shown**: [payments.js:80](payments.js#L80)
**Trigger**: `getStripePriceId('life')` returns `null`
**Fix**: Set valid `STRIPE_LIFE_PRICE_ID` in `.env`

---

## 📋 QUICK FIX CHECKLIST

- [ ] Log into Stripe Dashboard
- [ ] Create "Clarified Pro" product (recurring, $8/month)
- [ ] Copy Pro Price ID (starts with `price_`)
- [ ] Create "Life Decision" product (one-time, $5)
- [ ] Copy Life Price ID (starts with `price_`)
- [ ] Update `.env` file with real Price IDs
- [ ] Restart Node.js server
- [ ] Test "Upgrade to Pro" button
- [ ] Test "Buy Life decision" flow

---

## 🎯 EXPECTED RESULT

After setting valid Price IDs:

1. **Pro Subscription Flow**:
   - User clicks "Upgrade to Pro"
   - Redirects to Stripe Checkout
   - Shows "Clarified Pro - $8.00/month"
   - User completes payment
   - Webhook updates subscription in Supabase
   - User gets Pro features

2. **Life Decision Purchase Flow**:
   - User tries 2nd Life decision
   - Prompted to purchase
   - Redirects to Stripe Checkout
   - Shows "Life Decision - $5.00"
   - User completes payment
   - Webhook increments `life_decisions_purchased` in Supabase
   - User can make the Life decision

---

**Last Updated**: 2025-12-30

**Files Referenced**:
- [.env](.env) - Where to set Price IDs
- [payments.js](payments.js) - Where Price IDs are used
- [server.js](server.js) - Where Price IDs are exposed to frontend
