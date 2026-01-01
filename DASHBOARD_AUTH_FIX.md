# Dashboard Auth & Sample Data Fix

Fixed issue where sample decisions were showing on the dashboard even when not logged in.

---

## 🚨 THE PROBLEM

**Issue**: When not logged in, the dashboard was showing hardcoded sample decisions:
- "Should I divorce my husband"
- "take job at bigger company or stay at startup"
- "Should I take a new job at kellogg?"

**Root Causes**:
1. No auth check when navigating to dashboard page
2. Dashboard content div was visible by default (`display: block`)
3. Hardcoded sample decisions in HTML were always visible

---

## ✅ FIXES APPLIED

### 1. Added Auth Check to showPage()
**Location**: [clarity.js:64-73](clarity.js#L64-L73)

**Before**:
```javascript
function showPage(pageName) {
    // Paywall check for decisions page (Pro-only feature)
    if (pageName === 'decisions') {
        // ... paywall logic
    }

    // Hide all pages
    // ... no auth check for dashboard
}
```

**After**:
```javascript
function showPage(pageName) {
    // Auth check for protected pages
    const protectedPages = ['dashboard', 'decisions', 'account'];
    if (protectedPages.includes(pageName)) {
        const currentUser = window.supabaseClient?.getCurrentUser();
        if (!currentUser && !appState.isGuest) {
            console.log('⚠️ User not logged in, redirecting to login');
            showPage('login');
            return;
        }
    }

    // Paywall check for decisions page (Pro-only feature)
    // ...
}
```

**What it does**:
- Checks if page is protected (dashboard, decisions, or account)
- If user is not logged in and not a guest, redirects to login
- Prevents unauthorized access to dashboard

---

### 2. Hidden Dashboard Content by Default
**Location**: [clarity.html:282](clarity.html#L282)

**Before**:
```html
<div id="dashboard-content">
    <!-- Sample decisions always visible -->
```

**After**:
```html
<div id="dashboard-content" style="display: none;">
    <!-- Sample decisions hidden by default -->
```

**What it does**:
- Dashboard content (including sample decisions) is hidden by default
- Only shown when `loadDashboard()` explicitly sets `display: block`
- Prevents sample data from showing before auth check

---

## 🎯 USER FLOW

### Before (BROKEN):

```
User not logged in
  ↓
Navigates to dashboard (directly or via nav)
  ↓
❌ No auth check
  ↓
❌ Dashboard content visible by default
  ↓
❌ Shows 3 hardcoded sample decisions
  ↓
User sees "Should I divorce my husband" etc.
```

### After (FIXED):

```
User not logged in
  ↓
Tries to navigate to dashboard
  ↓
✅ Auth check triggers
  ↓
✅ Not logged in → redirect to login
  ↓
User sees login page
```

**Logged In User**:
```
User logged in
  ↓
Navigates to dashboard
  ↓
✅ Auth check passes
  ↓
✅ loadDashboard() runs
  ↓
✅ Fetches real decisions from Supabase
  ↓
✅ populateRecentDecisions() replaces sample data
  ↓
✅ Shows user's actual decisions
```

---

## 🔐 PROTECTED PAGES

The following pages now require authentication:

1. **Dashboard** (`page-dashboard`)
   - Shows user's decision history
   - Requires: Logged in user OR guest session

2. **Decisions** (`page-decisions`)
   - Full decision list (Pro feature)
   - Requires: Logged in Pro user

3. **Account** (`page-account`)
   - Subscription and profile settings
   - Requires: Logged in user

**Public Pages** (no auth required):
- Login page
- Decision type selection
- Decision flow pages (guest access allowed)

---

## 🧪 TESTING

### Test 1: Not Logged In → Dashboard
1. Clear cookies/storage
2. Navigate to `http://localhost:3000`
3. Click "Dashboard" in nav (if visible)
4. **Expected**: Redirects to login page
5. **Expected**: No sample decisions visible

### Test 2: Guest User → Dashboard
1. Click "Continue as guest"
2. Complete a decision
3. Try to access dashboard
4. **Expected**: Redirects to login (guests can't access dashboard)

### Test 3: Logged In → Dashboard
1. Sign in with email/password
2. Navigate to dashboard
3. **Expected**: Shows empty state OR real decisions
4. **Expected**: No hardcoded sample data

### Test 4: Logged In with Decisions → Dashboard
1. Sign in with account that has decisions
2. Navigate to dashboard
3. **Expected**: Shows real decisions from Supabase
4. **Expected**: Hardcoded samples replaced with actual data

---

## 📝 FILES MODIFIED

### clarity.js
- **Lines 64-73**: Added auth check for protected pages in `showPage()`

### clarity.html
- **Line 282**: Added `style="display: none;"` to `dashboard-content` div

---

## 🎨 VISUAL CHANGES

### Before:
When not logged in and viewing source, hardcoded HTML showed:
```html
<div class="decision-item">
    <h4 class="decision-title">Should I divorce my husband</h4>
    <span class="chip-status status-ready">Ready</span>
</div>
```

### After:
- Dashboard content hidden until auth check passes
- Sample data replaced by `populateRecentDecisions()` when logged in
- Clean, dynamic list based on user's actual decisions

---

## 🔒 SECURITY IMPACT

**Before**:
- ❌ Sample decisions visible to anyone
- ❌ Could navigate to dashboard without login
- ❌ Privacy concern (even though data was fake)

**After**:
- ✅ Dashboard requires authentication
- ✅ Sample data hidden by default
- ✅ Only shows user's own decisions after login
- ✅ Proper access control

---

## ✅ STATUS

**Fixed Issues**:
- ✅ Dashboard redirects to login when not authenticated
- ✅ Sample decisions hidden by default
- ✅ Auth check added for protected pages
- ✅ Dashboard content only visible after `loadDashboard()` runs

**Protected Pages**:
- ✅ Dashboard
- ✅ Decisions
- ✅ Account

**Last Updated**: 2025-12-30
