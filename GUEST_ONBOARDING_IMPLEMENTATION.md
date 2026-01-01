##GUEST ONBOARDING - Implementation Guide

**Value-first, identity-second onboarding flow**

---

## 📋 OVERVIEW

This implements a guest-first flow where users experience value before signing up:

```
Landing → Quick Guidance (guest) → Results → Save Prompt → Sign Up → Onboarding (2 screens) → Decisions
```

**Key Benefits:**
- ✅ No friction to start
- ✅ Increased conversion (users see value first)
- ✅ Guest decisions auto-saved on sign-up
- ✅ Deep Guidance gated (requires account)

---

## 📁 FILES CREATED

1. **guest-onboarding-pages.html** - Landing, sign-up, sign-in, and onboarding pages
2. **guest-onboarding-modals.html** - Save prompt and Deep Guidance modals
3. **guest-onboarding.css** - All styling
4. **guest-onboarding.js** - All JavaScript functions
5. **guest-onboarding-schema.sql** - Database migrations

---

## 🔧 STEP-BY-STEP INTEGRATION

### Step 1: Database Migration

Run the SQL in Supabase:

```bash
# Open Supabase Dashboard → SQL Editor
# Copy contents of guest-onboarding-schema.sql
# Run the query
```

This adds:
- `first_name`, `onboarding_completed`, `onboarding_focus` to `user_profiles`
- `matters`, `emotion`, `recommendation`, `reason` to `decisions` (if missing)

### Step 2: Update clarity.html

**A. Insert new pages**

Find line 42 (`<div class="page active" id="page-login">`) and INSERT the contents of **guest-onboarding-pages.html** BEFORE it.

**B. Change initial page**

Line 42 - change:
```html
<!-- OLD -->
<div class="page active" id="page-login">

<!-- NEW -->
<div class="page" id="page-login">
```

**C. Insert modals**

Find the modals section (before `</div>` closing the app container, around line 1944) and INSERT the contents of **guest-onboarding-modals.html**.

### Step 3: Update clarity.css

**Option A: Append to clarity.css**

```bash
cat guest-onboarding.css >> clarity.css
```

**Option B: Link separately in HTML**

In `<head>` section:
```html
<link rel="stylesheet" href="guest-onboarding.css">
```

### Step 4: Update clarity.js

**A. Guest mode state is already added** (lines 9-34)

**B. Add the functions from guest-onboarding.js**

You can either:

1. **Append the entire file:**
```bash
cat guest-onboarding.js >> clarity.js
```

2. **Or manually copy specific sections:**
   - Landing page functions (lines 7-19)
   - Auth functions (lines 90-170)
   - Onboarding functions (lines 278-332)
   - App init update (lines 335-381)

**C. UPDATE existing Quick Guidance completion**

Find where Quick Guidance results are shown (around where `generateQuickRecommendation` completes) and add:

```javascript
// After showing results
if (isGuestMode) {
    const guestData = {
        decision: quickDecisionState.decision,
        matters: quickDecisionState.matters,
        emotion: quickDecisionState.emotion,
        context: quickDecisionState.context,
        results: {
            recommendation: recommendation,
            reason: reason,
            caveat: caveat
        },
        type: 'quick',
        created_at: new Date().toISOString()
    };

    saveGuestDecision(guestData);

    setTimeout(() => {
        showSavePromptForGuest();
    }, 2000);
}
```

**D. UPDATE selectDecisionType function**

Find the existing `selectDecisionType` function and REPLACE it with the version from guest-onboarding.js (lines 45-66) that includes the Deep Guidance restriction.

**E. REPLACE initApp function**

Replace the existing `initApp` function with the version from guest-onboarding.js (lines 335-367) that checks for guest mode.

### Step 5: Test Flow

1. **Guest Quick Guidance:**
   - Visit app (should show landing)
   - Click "What's on your mind?"
   - Complete Quick Guidance
   - See results
   - See "Save your clarity" modal after 2 seconds

2. **Sign Up:**
   - Click "Create free account"
   - Sign up with email or Google
   - See "Decision saved!" screen
   - Enter name
   - Select focus area
   - See decisions page with saved decision

3. **Deep Guidance Restriction:**
   - As guest, select "Deep Guidance"
   - See "Deep Guidance requires an account" modal
   - Can either sign up or switch to Quick Guidance

4. **Returning User:**
   - Sign in
   - Skip onboarding, go straight to decisions page

---

## 🎨 DESIGN NOTES

### Landing Page
- Gradient background (#F0F9F6 → white)
- Large headline: "Stop spiraling. Start deciding."
- Single CTA: "What's on your mind? →"
- Small sign-in link at bottom

### Save Prompt Modal
- Appears 2 seconds after Quick Guidance results
- 3 benefits listed with checkmarks
- "Create free account" button (primary)
- "Maybe later" link (dismisses, stays on results)

### Sign-Up/Sign-In
- Clean, centered form
- Google sign-in button with official brand colors
- Email/password alternative
- Back button to return

### Post-Signup Onboarding
- **Screen 1:** Name collection (skipped if Google provided it)
  - Checkmark icon
  - "Decision saved!" confirmation
  - Simple text input

- **Screen 2:** Focus selection
  - 4 emoji options (Career, Relationships, Life changes, Everything)
  - Cards with radio buttons
  - Can skip

### Progress Indicators
- Dots at top (2-step progress)
- Skip button in top-right

---

## 🚀 BEHAVIOR CHANGES

### Before (Old Flow)
1. See login page
2. Must sign up/in before using app
3. Full onboarding (5 screens)
4. Then can make decisions

### After (New Flow)
1. See landing page
2. Start Quick Guidance immediately (no account)
3. See results
4. Optional: Sign up to save
5. Brief onboarding (2 screens)
6. Decisions page

### Guest Restrictions
- ✅ Can use Quick Guidance
- ❌ Cannot use Deep Guidance (shows sign-up prompt)
- ❌ Cannot save decisions (prompts to save after results)
- ❌ Cannot see past decisions

### Sign-Up Bonuses
- Guest decision auto-saved to database
- sessionStorage cleared after save
- Onboarding streamlined (name + focus only)

---

## 🔍 DEBUGGING

### Console Logs

Look for these markers:
```
[GUEST] Starting guest decision
[GUEST] Decision saved for guest
[GUEST] Showing save prompt
[GUEST] Guest attempted to access Deep Guidance
[AUTH] Signing up with email
[AUTH] Sign-up successful
[GUEST] Saving guest decision to database
[GUEST] Guest decision saved successfully
[GUEST] Guest data cleared
[ONBOARDING] Error completing onboarding (if any errors)
[APP] Initializing app
[APP] User logged in / No session
```

### Common Issues

**1. "Save prompt doesn't appear"**
- Check: `isGuestMode === true`
- Check: `guestDecisionData` is populated
- Check: Modal HTML is in DOM (`#save-prompt-modal`)

**2. "Guest decision not saved after sign-up"**
- Check console for `[GUEST] Saving guest decision to database`
- Check Supabase logs for INSERT errors
- Verify `decisions` table has required columns

**3. "Onboarding doesn't show after sign-up"**
- Check `onSignUpComplete` is called
- Check `user_profiles` table insert succeeded
- Verify RLS policies allow insert

**4. "Deep Guidance works for guests"**
- Verify `selectDecisionType` function was updated
- Check `isGuestMode === true` before selecting Deep

---

## 📊 ANALYTICS TO TRACK

Recommended events:
- `guest_started` - Guest began Quick Guidance
- `guest_completed` - Guest finished Quick Guidance
- `save_prompt_shown` - Save modal appeared
- `save_prompt_dismissed` - User clicked "Maybe later"
- `save_prompt_converted` - User clicked "Create account"
- `signup_completed` - User finished sign-up
- `onboarding_completed` - User finished onboarding
- `guest_decision_saved` - Guest decision saved to DB

Conversion funnel:
```
Landing → Start → Complete → Save Prompt → Sign Up → Onboarding → Active User
```

---

## 🔐 SECURITY NOTES

- Guest data stored in sessionStorage (cleared on tab close)
- No PII collected before sign-up
- RLS policies prevent unauthorized access
- OAuth handled by Supabase Auth
- Passwords hashed by Supabase (min 8 chars)

---

## 📝 COPY VARIATIONS TO TEST

### Landing Headline
- Current: "Stop spiraling. Start deciding."
- Alt 1: "Make better decisions in 5 minutes."
- Alt 2: "Finally decide what to do."

### Save Prompt Headline
- Current: "Save your clarity"
- Alt 1: "Want to save this?"
- Alt 2: "Keep this decision"

### CTA Button
- Current: "What's on your mind? →"
- Alt 1: "Get clarity now →"
- Alt 2: "Start deciding →"

---

## ✅ TESTING CHECKLIST

- [ ] Guest can complete Quick Guidance without account
- [ ] Save prompt appears after 2 seconds
- [ ] "Maybe later" dismisses modal, stays on results
- [ ] "Create account" goes to sign-up page
- [ ] Email sign-up works
- [ ] Google sign-up works
- [ ] Guest decision saves to database on sign-up
- [ ] Onboarding shows name screen (if not Google)
- [ ] Onboarding shows focus selection
- [ ] Skip button works
- [ ] After onboarding, user sees decisions page
- [ ] Saved guest decision appears in list
- [ ] Deep Guidance shows sign-up prompt for guests
- [ ] "Use Quick Guidance instead" switches to Quick
- [ ] Returning user skips onboarding
- [ ] Sign-out returns to landing page

---

## 🎯 SUCCESS METRICS

**Week 1:**
- Guest conversion rate (started → completed)
- Save prompt → sign-up conversion
- Time to first value (landing → see results)

**Week 2+:**
- Guest-to-paid conversion
- Retention of users who started as guests
- Deep Guidance upgrade rate

**Expected Improvements:**
- 📈 3-5x more users start (no sign-up friction)
- 📈 2x sign-up conversion (see value first)
- 📈 Higher engagement (committed users)

---

## 🚧 FUTURE ENHANCEMENTS

1. **Social proof** - "1,247 decisions made today"
2. **Guest limits** - After 3 decisions, require sign-up
3. **Email capture** - Save email before full sign-up
4. **Abandon recovery** - Email partial decisions
5. **Personalized onboarding** - Based on first decision type
6. **Progressive profile** - Collect data over time

---

## 📞 NEED HELP?

Common integration questions:

Q: Can I keep the old login page?
A: Yes, rename it to `page-login-old` for now

Q: Do I need to update the app nav?
A: No, nav is hidden on landing/auth pages

Q: What about existing users?
A: They keep signing in normally, skip onboarding

Q: Can guests use Deep Guidance?
A: No, intentionally gated to drive sign-ups

---

**Last Updated:** 2025-12-30
