# Early Tester Features - Setup Guide

All 5 early tester features have been implemented! Here's what was added and how to set them up.

---

## ✅ What's Been Implemented

### 1. **Founding Member Badge**
- **Location**: Account page and Dashboard
- **Appearance**: Gold/amber pill badge with ⭐ icon
- **Text**: "⭐ Founding Member"
- **Auto-assigned**: All new signups automatically get `founding_member: true`

### 2. **Beta User Pro Unlock**
- **Field**: `is_beta_user: true` in subscriptions table
- **Effect**: Bypasses ALL paywalls and limits
- **Display**: Shows "Beta access — all features unlocked" on Account page
- **Usage**: Shows "(unlimited)" next to decision counts
- **Auto-assigned**: All new signups automatically get `is_beta_user: true`

### 3. **Feedback Thumbs Up/Down**
- **Location**: After Quick Clarity results
- **👍 Click**: Shows "Thanks!" and logs to database
- **👎 Click**: Expands to text field "What would've helped?"
- **Database**: New `decision_feedback` table with RLS policies

### 4. **Decision Profile Progress Teaser**
- **Location**: Dashboard (when user has 1-4 decisions)
- **Display**: Progress bar showing X of 5 decisions
- **Message**: "Make 5 decisions to see patterns in how you think"
- **Auto-hides**: Once user reaches 5 decisions

### 5. **Personal Founder Welcome Note**
- **Location**: Dashboard (only for users with 0 decisions)
- **From**: Chanelle with personal message
- **Action**: "Send me feedback" button (mailto link)
- **Dismissible**: Click X to dismiss permanently
- **Database**: Saves `has_seen_welcome: true` when dismissed

---

## 🗄️ Database Setup

### Step 1: Run the Schema Update

Run this SQL in your Supabase SQL Editor:

```bash
# File location: supabase-early-tester-schema.sql
```

This will:
- Add `founding_member`, `is_beta_user`, and `has_seen_welcome` columns to `subscriptions` table
- Create `decision_feedback` table with RLS policies
- Mark all existing users as founding members and beta users

### Step 2: Verify Tables

Check that these tables exist:
- `subscriptions` (should now have 3 new columns)
- `decision_feedback` (newly created)

---

## 🎯 How Each Feature Works

### Founding Member Badge

**On Account Page**:
- Shows below plan subtitle if `founding_member: true`

**On Dashboard**:
- Shows in header below subtitle if `founding_member: true`

**Code locations**:
- HTML: [clarity.html:815-818](clarity.html#L815-L818) (Account), [clarity.html:229-234](clarity.html#L229-L234) (Dashboard)
- CSS: [clarity.css:8104-8132](clarity.css#L8104-L8132)
- JS: [payments.js:163-164](payments.js#L163-L164), [clarity.js:366-372](clarity.js#L366-L372)

### Beta User Pro Unlock

**Paywall Bypass**:
- Modified `checkDecisionLimit()` in [supabase-client.js:418-423](supabase-client.js#L418-L423)
- Returns `{ allowed: true, isBeta: true }` for beta users

**Display Updates**:
- Account page shows "(unlimited)" for decision counts
- Beta access note appears below plan details

**Code locations**:
- Bypass logic: [supabase-client.js:418-423](supabase-client.js#L418-L423)
- Display: [payments.js:204-238](payments.js#L204-L238)
- New user assignment: [supabase-client.js:163-164](supabase-client.js#L163-L164)

### Feedback Thumbs Up/Down

**User Flow**:
1. User sees Quick Clarity result
2. Feedback component appears below with 👍 👎 buttons
3. 👍: Shows "Thanks!" after 300ms, logs helpful=true
4. 👎: Expands text field for optional feedback, logs helpful=false

**Code locations**:
- HTML: [clarity.html:1187-1205](clarity.html#L1187-L1205)
- CSS: [clarity.css:8146-8223](clarity.css#L8146-L8223)
- JS: [clarity.js:839-946](clarity.js#L839-L946)

### Decision Profile Progress Teaser

**Visibility**:
- Only shows when user has 1-4 decisions
- Automatically hides at 5+ decisions

**Progress Calculation**:
- Progress bar: `(decisionCount / 5) * 100%`
- Updates on each dashboard load

**Code locations**:
- HTML: [clarity.html:254-271](clarity.html#L254-L271)
- CSS: [clarity.css:8225-8285](clarity.css#L8225-L8285)
- JS: [clarity.js:384-403](clarity.js#L384-L403)

### Personal Founder Welcome Note

**Visibility Logic**:
- Only shows for users with 0 decisions
- Only shows if `has_seen_welcome: false`
- Once dismissed, never shows again

**Dismissal**:
- Click X button
- Updates database: `has_seen_welcome: true`
- Hides immediately

**Code locations**:
- HTML: [clarity.html:239-254](clarity.html#L239-L254)
- CSS: [clarity.css:8287-8344](clarity.css#L8287-L8344)
- JS: [clarity.js:380-391](clarity.js#L380-L391) (show), [clarity.js:952-983](clarity.js#L952-L983) (dismiss)

---

## 🧪 Testing Checklist

### Test 1: Founding Member Badge
- [ ] Sign up new account
- [ ] Go to Account page → see "⭐ Founding Member" badge
- [ ] Go to Dashboard → see badge in header

### Test 2: Beta User Unlimited Access
- [ ] Check Account page → see "Beta access — all features unlocked"
- [ ] Check usage counts → see "(unlimited)" next to numbers
- [ ] Try making more than 5 Everyday decisions → should work

### Test 3: Feedback Component
- [ ] Complete a Quick Clarity decision
- [ ] Click 👍 → see "Thanks for your feedback!" message
- [ ] Refresh and do another decision
- [ ] Click 👎 → see text field appear
- [ ] Enter feedback → submit → see thanks message

### Test 4: Decision Profile Progress
- [ ] With 0 decisions: Dashboard shows empty state
- [ ] Make 1 decision → see progress teaser with "1 of 5 decisions"
- [ ] Make more decisions → see progress bar fill up
- [ ] Reach 5 decisions → teaser disappears

### Test 5: Founder Welcome Note
- [ ] New user with 0 decisions → see welcome card from Chanelle
- [ ] Click X → card disappears
- [ ] Refresh page → card doesn't come back
- [ ] Click "Send me feedback" → opens email to chanelle@clarified.app

---

## 📊 Viewing Feedback Data

To see all feedback submitted by users:

```sql
SELECT
    df.created_at,
    df.helpful,
    df.feedback_text,
    u.email
FROM decision_feedback df
LEFT JOIN auth.users u ON df.user_id = u.id
ORDER BY df.created_at DESC;
```

---

## 🔧 Customization

### Change who gets Founding Member status

Edit [supabase-client.js:163-164](supabase-client.js#L163-L164):

```javascript
// To disable for new users:
founding_member: false,  // Change from true to false
```

### Change the 5-decision unlock threshold

Edit [clarity.js:386](clarity.js#L386):

```javascript
if (profileTeaser && decisionCount < 10) {  // Change 5 to any number
```

### Update founder email

Edit [clarity.html:250](clarity.html#L250):

```html
<a href="mailto:your-email@example.com" class="btn btn-outline">
```

---

## 🚀 Going Live

When you're ready to stop giving Founding Member status to new users:

1. Update [supabase-client.js:163-164](supabase-client.js#L163-L164):
   ```javascript
   founding_member: false,
   is_beta_user: false,
   ```

2. Existing founding members keep their status (data is already in database)

3. New signups will be regular Free plan users

---

## 📝 Notes

- All new signups automatically get founding member + beta user status
- Existing users were marked as founding members when you ran the schema
- Beta users have truly unlimited access (no limits enforced)
- Feedback is saved even if user is not logged in (just won't have user_id)
- Welcome note only shows once per user

Enjoy testing! 🎉
