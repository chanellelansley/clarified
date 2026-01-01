# Guest Access Fix - No Dashboard for Guests

Fixed issue where guests could access the dashboard and see sample decisions.

---

## 🚨 THE PROBLEM

**Issue**: When continuing as a guest, users could navigate to the dashboard (by clicking "Home" in the nav) and see hardcoded sample decisions, even though guests shouldn't have access to the dashboard.

**Why it happened**:
1. Guest flow sets `appState.isGuest = true`
2. Original auth check allowed guests to access protected pages
3. Nav bar was visible to guests on some pages
4. Clicking "Home" showed dashboard with sample decisions

---

## ✅ FIXES APPLIED

### 1. Block Guest Access to Protected Pages
**Location**: [clarity.js:69-74](clarity.js#L69-L74)

**Before**:
```javascript
if (protectedPages.includes(pageName)) {
    const currentUser = window.supabaseClient?.getCurrentUser();
    if (!currentUser && !appState.isGuest) {
        // Only blocked if NOT logged in AND NOT a guest
        // ❌ Guests could access dashboard
        showPage('login');
        return;
    }
}
```

**After**:
```javascript
if (protectedPages.includes(pageName)) {
    const currentUser = window.supabaseClient?.getCurrentUser();

    // Guests cannot access dashboard, decisions, or account
    if (appState.isGuest) {
        console.log('⚠️ Guests cannot access', pageName, '- redirecting to decision-type');
        showPage('decision-type');
        return;
    }

    // Non-guests must be logged in
    if (!currentUser) {
        console.log('⚠️ User not logged in, redirecting to login');
        showPage('login');
        return;
    }
}
```

**Result**: Guests are now explicitly blocked from dashboard, decisions, and account pages.

---

### 2. Hide Nav Bar for Guests
**Location**: [clarity.js:118-122](clarity.js#L118-L122)

**Before**:
```javascript
const nav = document.getElementById('global-nav');
if (pageName === 'login' || pageName === 'decision-type') {
    nav.style.display = 'none';
} else {
    nav.style.display = 'block'; // ❌ Nav shown to guests on other pages
}
```

**After**:
```javascript
const nav = document.getElementById('global-nav');
if (pageName === 'login' || pageName === 'decision-type' || appState.isGuest) {
    nav.style.display = 'none'; // ✅ Nav always hidden for guests
} else {
    nav.style.display = 'block';
}
```

**Result**: Guests never see the nav bar (Home, Decisions, Account links).

---

## 🎯 USER FLOW

### Before (BROKEN):

```
User clicks "Continue as Guest"
  ↓
Sets appState.isGuest = true
  ↓
Shows decision-type page
  ↓
User navigates to another page (shows nav)
  ↓
❌ Clicks "Home" in nav
  ↓
❌ Auth check allows guests through
  ↓
❌ Shows dashboard with sample decisions
```

### After (FIXED):

```
User clicks "Continue as Guest"
  ↓
Sets appState.isGuest = true
  ↓
Shows decision-type page
  ↓
✅ Nav is hidden (can't click Home)
  ↓
User makes decisions
  ↓
If they somehow try to access dashboard:
  ↓
✅ Auth check blocks guests
  ↓
✅ Redirects to decision-type
```

---

## 🔒 GUEST RESTRICTIONS

### What Guests CAN Access:
- Login page
- Decision type selection
- Full decision flow (Life & Everyday)
- Decision results

### What Guests CANNOT Access:
- ❌ Dashboard (Home)
- ❌ Decisions page (history)
- ❌ Account page
- ❌ Nav bar

**Why**: Guests don't have accounts, so they can't save decisions or view history. They can only make one-off decisions without saving.

---

## 🎨 GUEST EXPERIENCE

### Expected Guest Journey:

1. **Land on login page**
2. **Click "Continue as Guest"**
   - Sets guest mode
   - Goes to decision-type page
   - Nav hidden

3. **Make decision**
   - Choose Life or Everyday
   - Go through full flow
   - See results

4. **After decision**
   - Can make another decision
   - Cannot save or view history
   - Cannot access dashboard

5. **To save decisions**
   - Must sign up for an account
   - Convert from guest to user

---

## 🧪 TESTING

### Test 1: Guest Cannot Access Dashboard
1. Click "Continue as Guest"
2. Try to navigate to dashboard (if nav visible)
3. **Expected**: Redirects to decision-type page
4. **Expected**: Console shows "Guests cannot access dashboard"

### Test 2: Guest Nav Hidden
1. Click "Continue as Guest"
2. Make a decision (any page in flow)
3. **Expected**: Nav bar never visible
4. **Expected**: No way to click "Home"

### Test 3: Direct URL Access
1. Be in guest mode
2. Try `showPage('dashboard')` in console
3. **Expected**: Redirects to decision-type
4. **Expected**: No dashboard content shown

### Test 4: Logged In User Still Works
1. Sign in with email/password
2. Navigate to dashboard
3. **Expected**: Shows dashboard
4. **Expected**: Nav visible with Home link
5. **Expected**: Real decisions (not samples)

---

## 📝 FILES MODIFIED

### clarity.js
- **Lines 69-82**: Updated auth check to explicitly block guests from protected pages
- **Lines 118-122**: Updated nav visibility to hide for guests

---

## ✅ STATUS

**Fixed**:
- ✅ Guests cannot access dashboard
- ✅ Guests cannot access decisions page
- ✅ Guests cannot access account page
- ✅ Nav bar hidden for guests
- ✅ Guests redirected to decision-type if they try to access protected pages

**Guest Flow**:
- ✅ Continue as guest → decision-type → make decision → results
- ✅ No dashboard, no history, no nav
- ✅ Must sign up to save decisions

**Last Updated**: 2025-12-30
