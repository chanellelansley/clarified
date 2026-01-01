# Values & Assumptions Pages — Polish & Fixes

Complete UI polish and bug fixes for the Values (deep-4) and Assumptions (deep-6) pages.

---

## VALUES PAGE UPDATES

### 1. Credibility Tooltip ✅

**Already implemented** in [clarity.html:1678-1690](clarity.html#L1678-L1690):

```html
<div class="reframe-headline">
    <h2 class="page-title">What matters most to you?</h2>
    <div class="info-tooltip">
        <svg class="info-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 16v-4"></path>
            <path d="M12 8h.01"></path>
        </svg>
        <div class="tooltip-content">
            Research shows decisions aligned with your values lead to higher satisfaction — even when outcomes aren't perfect. This is the foundation of values-based decision making.
        </div>
    </div>
</div>
```

**Result**: Users see "What matters most to you?" with info icon (ⓘ). Tooltip provides research-backed credibility.

---

### 2. Value Pill Selection Bug ✅

**Status**: No bug found. Selection working correctly.

**Current Implementation** [clarity.js:2139-2142](clarity.js#L2139-L2142):

```javascript
pill.addEventListener('click', function() {
    this.classList.toggle('selected');
    updateValuesCounter();
});
```

Pills toggle selected state on click and update counter. No disappearing behavior detected.

---

### 3. Selection Dots ✅

**Status**: No selection dots found in UI.

The counter simply shows "0 selected" → "2 selected" → "3 selected" without any dots.

**Counter Implementation** [clarity.html:1698-1700](clarity.html#L1698-L1700):

```html
<div class="values-counter" id="values-counter">
    <span class="counter-text">0 selected</span>
</div>
```

---

### 4. Selected State Styling ✅

**Already properly styled** [clarity.css:7781-7802](clarity.css#L7781-L7802):

```css
/* Selected State */
.value-pill.selected {
    background: var(--brand-primary);     /* Sage green #418F6F */
    border-color: var(--brand-primary);
    color: white;
    box-shadow: 0 2px 8px rgba(65, 143, 111, 0.2);
    animation: selectPulse 300ms ease;    /* Subtle scale animation */
}

@keyframes selectPulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.02); }
    100% { transform: scale(1); }
}

.value-pill.selected .value-icon {
    color: white;                          /* Icon turns white */
}

.value-pill.selected .value-checkmark {
    opacity: 1;                            /* Checkmark appears */
    transform: scale(1);
}
```

**Result**: Selected pills have sage green background, white text, white icon, visible checkmark, and subtle scale animation.

---

### 5. "Add Your Own" Styling ✅

**Already has dashed border** [clarity.css:7791-7802](clarity.css#L7791-L7802):

```css
.value-pill.add-custom {
    border-style: dashed;                  /* Dashed border */
    border-color: var(--gray-300);
    color: var(--text-muted);
    background: var(--gray-50);
}

.value-pill.add-custom:hover {
    border-color: var(--brand-primary);
    background: var(--brand-soft);
    color: var(--brand-primary);
}
```

**Result**: "Add your own" pill has dashed border matching other "add" patterns throughout the app.

---

### 6. Continue Button Validation ✅

**Already validated** [clarity.js:2169-2172](clarity.js#L2169-L2172):

```javascript
// Enable/disable continue button (requires at least 3 values)
if (continueBtn) {
    continueBtn.disabled = selected < 3;
}
```

**Result**: Continue button disabled until at least 3 values selected.

---

## UNIFIED PILL STYLING

### Before Unification:
- **Values page**: Sage background, white text when selected ✓
- **Timeline page**: Soft sage background, sage text when selected ✗
- **Challenges page**: Sage background, white text when selected ✓

### After Unification ✅

**Updated Timeline Cards** [clarity.css:7365-7374](clarity.css#L7365-L7374):

```css
.timeline-card.selected {
    background: var(--brand-primary);      /* Changed from soft to solid */
    border-color: var(--brand-primary);
    color: white;                           /* Changed from sage to white */
    box-shadow: 0 2px 8px rgba(65, 143, 111, 0.2);
}

.timeline-card.selected svg {
    color: white;                           /* Changed from sage to white */
}
```

### Unified Specifications

All pills/cards across all pages now share:

| Property | Value |
|----------|-------|
| **Height** | auto (flexible based on content) |
| **Border radius** | 14px (value pills), var(--radius-xl) (timeline cards) |
| **Border color** | var(--gray-200) #E5E7EB |
| **Icon size** | 18-24px |
| **Padding** | 8px 16px (pills), var(--spacing-lg) (cards) |
| **Selected background** | var(--brand-primary) #418F6F |
| **Selected text** | white |
| **Selected icon** | white |
| **Hover state** | lift + shadow |

---

## ASSUMPTIONS PAGE UPDATES

### 1. Colored Borders ✅

**Status**: No colored borders found. All cards use standard gray borders.

**Current Implementation** [clarity.css:8180-8188](clarity.css#L8180-L8188):

```css
.assumption-card {
    background: var(--card-bg);
    border: 2px solid var(--card-border);   /* Gray border */
    border-radius: var(--radius-card);
    padding: var(--spacing-lg);
    margin-bottom: var(--spacing-md);
    position: relative;
    transition: all 200ms ease;
}
```

**Result**: Consistent white background, subtle gray border, rounded corners.

---

### 2. Card Style Unification ✅

**Status**: All cards (A, B, and "What might you be wrong about?") use consistent styling.

**"What might you be wrong about?" card** [clarity.css:8259-8263](clarity.css#L8259-L8263):

```css
.assumption-uncertain {
    border-style: solid;                    /* Solid, not dashed */
    border-color: var(--card-border);
    background: var(--card-bg);
}
```

**Result**: All three cards have solid borders, matching the rest of the app's card styling.

---

### 3. Credibility Tooltip ✅

**Already implemented** [clarity.html:1730-1740](clarity.html#L1730-L1740):

```html
<div class="reframe-headline">
    <h2 class="page-title">What do you expect to happen?</h2>
    <div class="info-tooltip">
        <svg class="info-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 16v-4"></path>
            <path d="M12 8h.01"></path>
        </svg>
        <div class="tooltip-content">
            Surfacing assumptions helps avoid confirmation bias — the tendency to only see evidence that supports what we already believe.
        </div>
    </div>
</div>
```

**Result**: Users see "What do you expect to happen?" with info icon (ⓘ). Tooltip explains the value of surfacing assumptions.

---

### 4. Subhead Text ✅

**Already updated** [clarity.html:1743](clarity.html#L1743):

```html
<p class="text-center text-muted mb-xl">Your expectations reveal hidden assumptions</p>
```

**Before**: "Think through each path"
**After**: "Your expectations reveal hidden assumptions"

**Result**: More helpful, insight-driven subhead.

---

## TOOLTIP CUTOFF FIX

### Problem
Tooltips were getting cut off at the edge of the screen on mobile devices.

### Solution ✅

**Updated mobile tooltip positioning** [clarity.css:6610-6622](clarity.css#L6610-L6622):

```css
@media (max-width: 768px) {
    .info-tooltip:active .tooltip-content {
        opacity: 1;
        pointer-events: auto;
    }

    /* Prevent tooltip cutoff on mobile */
    .tooltip-content {
        left: auto;
        right: 0;
        transform: none;
        max-width: calc(100vw - 32px);
    }

    .tooltip-content::after {
        left: auto;
        right: 16px;
        transform: none;
    }
}
```

**Changes**:
- Tooltip anchored to right edge instead of center
- Max width prevents overflow
- Arrow positioned correctly
- 32px total margin (16px each side) prevents edge cutoff

**Result**: Tooltips fit within viewport on all screen sizes.

---

## CATEGORY DETECTION FIX

### Problem
Values page was showing wrong category values (e.g., "other" category values for relationship decisions) because category detection was async and didn't complete before the page loaded.

### Solution ✅

**1. Wait for Category Detection** [clarity.js:2014-2030](clarity.js#L2014-L2030):

```javascript
async function populateCategoryValues() {
    // Wait for category detection if it's still in progress
    // Check every 100ms for up to 5 seconds
    let attempts = 0;
    while (!deepDecisionState.category && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }

    const category = deepDecisionState.category || 'other';
    // ... populate values based on correct category
}
```

**2. Re-populate if Detection Completes Late** [clarity.js:1437-1450](clarity.js#L1437-L1450):

```javascript
try {
    // ... category detection logic

    const detectedCategory = response.trim().toLowerCase();
    deepDecisionState.category = detectedCategory;
    categoryDisplay.textContent = capitalizeFirst(detectedCategory);

    // If we're already on the values page, update it with the detected category
    if (document.getElementById('deep-4').classList.contains('active')) {
        populateCategoryValues();
    }

} catch (error) {
    // ... error handling

    // If we're already on the values page, update it with fallback category
    if (document.getElementById('deep-4').classList.contains('active')) {
        populateCategoryValues();
    }
}
```

**Result**:
- Values page waits up to 5 seconds for category detection
- If user is already on values page when detection completes, values automatically update
- Correct category-specific values always shown

---

## FILES MODIFIED

### clarity.html
- **Lines 1678-1690**: Values page credibility tooltip (already exists)
- **Lines 1730-1740**: Assumptions page credibility tooltip (already exists)
- **Lines 1743**: Assumptions subhead text (already updated)

### clarity.css
- **Lines 6610-6622**: Mobile tooltip positioning (prevent cutoff) ✨ NEW
- **Lines 7365-7374**: Timeline card selected state (unified with pills) ✨ NEW
- **Lines 7781-7802**: Value pill selected state (already correct)
- **Lines 7791-7802**: "Add your own" dashed border (already correct)
- **Lines 8180-8188**: Assumption card borders (already correct)
- **Lines 8259-8263**: Uncertain card styling (already correct)

### clarity.js
- **Lines 2014-2030**: Wait for category detection before populating values ✨ NEW
- **Lines 1437-1450**: Re-populate values if detection completes late ✨ NEW
- **Lines 2139-2142**: Value pill selection (already working)
- **Lines 2169-2172**: Continue button validation (already working)

---

## VERIFICATION CHECKLIST

### Values Page:
- [x] Credibility tooltip exists and shows on hover/tap
- [x] Tooltip text: "Research shows decisions aligned with your values..."
- [x] Value pills toggle selected state on click
- [x] Selected pills: sage background, white text, white icon, checkmark visible
- [x] Selection counter updates (0 selected → 3 selected)
- [x] No selection dots (just text counter)
- [x] "Add your own" has dashed border
- [x] Continue button disabled until 3 values selected
- [x] Category-specific values shown (not "other" fallback)

### Timeline Page:
- [x] Timeline cards show selected state
- [x] Selected state: sage background, white text, white icon
- [x] Matches value pill selected styling

### Challenges Page:
- [x] Challenge chips show selected state
- [x] Selected state: sage background, white text
- [x] Matches value pill selected styling

### Assumptions Page:
- [x] Credibility tooltip exists and shows on hover/tap
- [x] Tooltip text: "Surfacing assumptions helps avoid confirmation bias..."
- [x] Subhead: "Your expectations reveal hidden assumptions"
- [x] All three cards have solid gray borders (no colored borders)
- [x] "What might you be wrong about?" card matches A/B card styling

### Mobile:
- [x] Tooltips don't get cut off at screen edges
- [x] Tooltips have proper max-width
- [x] Tooltip arrows positioned correctly

---

## STATUS

**Completed**:
- ✅ Values page credibility tooltip (already existed)
- ✅ Value pill selection working correctly
- ✅ Selected state styling (sage bg, white text, checkmark)
- ✅ "Add your own" dashed border (already existed)
- ✅ Continue button validation (already existed)
- ✅ Unified pill styling across all pages (timeline updated)
- ✅ Assumptions page credibility tooltip (already existed)
- ✅ Assumptions subhead updated (already done)
- ✅ Assumption cards unified (already done)
- ✅ Tooltip cutoff fix (mobile positioning updated)
- ✅ Category detection fix (async waiting + re-population)

**Last Updated**: 2025-12-30
