# Reframing Page — Polish & Credibility

Visual and UX refinements to increase trust and reduce visual noise on the reframing step.

---

## CHANGES APPLIED

### 1. Credibility Tooltip ✅

**Already implemented** in HTML [clarity.html:1419-1427](clarity.html#L1419-L1427):

```html
<div class="info-tooltip">
    <svg class="info-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
    <div class="tooltip-content">
        Research shows 40% of decisions fail because we're solving the wrong problem. Reframing helps you focus on what actually matters.
    </div>
</div>
```

**Result**: Users see "Are we solving the right problem?" with info icon. Tooltip provides research-backed credibility.

---

### 2. "But Consider..." Section — Remove Horizontal Lines

**Status**: Already clean in HTML [clarity.html:1442-1449](clarity.html#L1442-L1449)

The transition section displays:
- Light bulb icon in circular sage green background
- "But consider..." text
- No horizontal lines (clean implementation)

```html
<div class="reframe-transition">
    <div class="transition-icon">
        <svg width="20" height="20">...</svg>
    </div>
    <p class="transition-text">But consider...</p>
</div>
```

CSS [clarity.css:6652-6678](clarity.css#L6652-L6678):
```css
.reframe-transition {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    margin: var(--spacing-2xl) 0 var(--spacing-xl) 0;
}
```

**Result**: Clean, minimal presentation with icon + text only.

---

### 3. Card Descriptions — Muted Styling

**Already optimized** [clarity.css:6840-6845](clarity.css#L6840-L6845):

```css
.reframe-card-insight {
    font-size: var(--text-sm);
    font-weight: 400;
    color: var(--text-muted);  /* Muted gray, not brand colors */
    line-height: 1.5;
}
```

**Card Question (prominent)** [clarity.css:6832-6838](clarity.css#L6832-L6838):
```css
.reframe-card-question {
    font-size: 1.0625rem;
    font-weight: 600;
    color: var(--text-primary);  /* Dark, prominent */
    line-height: 1.5;
    margin-bottom: var(--spacing-sm);
}
```

**Visual hierarchy**:
- Question: Large (1.0625rem), bold (600), dark (#1a1a1a)
- Description: Small (text-sm), normal weight, muted gray (#6B7280)

**Result**: Questions are prominent, descriptions provide context without competing.

---

### 4. Card Icon Colors — All Sage Green

**Updated** [clarity.css:6786-6800](clarity.css#L6786-L6800):

```css
/* All card icons use sage green for consistency */
.type-motivation .reframe-card-icon {
    background: var(--brand-soft);   /* #F0F9F6 */
    color: var(--brand-primary);      /* #418F6F */
}

.type-growth .reframe-card-icon {
    background: var(--brand-soft);
    color: var(--brand-primary);
}

.type-tradeoffs .reframe-card-icon {
    background: var(--brand-soft);
    color: var(--brand-primary);
}
```

**Before**: Pink (#E07A5F), green, and orange (#F4A261) icons felt random
**After**: All icons use consistent sage green (#418F6F) on soft background (#F0F9F6)

**Result**: Visual consistency, cleaner aesthetic, matches brand colors.

---

### 5. "Or Frame It Your Own Way" — Proper Equal Option

**Updated** [clarity.css:6868-6889](clarity.css#L6868-L6889):

```css
/* Custom Reframe Card - Equal option treatment */
.reframe-card-custom {
    margin-top: 0;               /* No extra spacing */
    margin-bottom: var(--spacing-md);
    border: 2px dashed var(--gray-300);
    border-radius: var(--radius-card);
    padding: var(--spacing-lg);
    background: white;           /* White background, not gray */
    cursor: pointer;
    transition: all var(--transition-base);
    min-height: 120px;          /* Same height as other cards */
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.reframe-card-custom:hover {
    border-color: var(--brand-primary);
    background: var(--brand-soft);      /* Sage green background on hover */
    transform: translateY(-2px);        /* Lift effect like other cards */
    box-shadow: var(--shadow-hover);    /* Matching shadow */
}
```

**Before**: Gray background, separated with `margin-top: lg`, felt like an afterthought
**After**:
- White background (matches other cards)
- No extra top margin (flows with other options)
- Same min-height (120px) as other cards
- Hover effects match other cards (lift, shadow, sage background)
- Dashed border distinguishes it as "custom input" option

**HTML structure** [clarity.html:1464-1473](clarity.html#L1464-L1473):
```html
<div class="reframe-card-custom">
    <div class="reframe-card-icon">
        <svg><!-- Pencil icon --></svg>
    </div>
    <h3 class="reframe-card-title">Or frame it your own way</h3>
    <input type="text" class="input-reframe-custom"
           id="deep-custom-reframe"
           placeholder="Write your own question...">
</div>
```

**Result**: Custom input feels like an equal, valid choice alongside AI-generated options.

---

## DESIGN SUMMARY

### Visual Hierarchy (Strongest → Weakest):
1. **Card Questions** — Large, bold, dark (primary focus)
2. **Icons** — Sage green, consistent across all cards
3. **Descriptions** — Small, muted gray (supporting context)
4. **Custom input** — Equal treatment with dashed border

### Color Consistency:
- **All icons**: Sage green (#418F6F) on soft background (#F0F9F6)
- **Card borders**: Remain type-specific on hover (motivation, growth, tradeoffs)
- **Descriptions**: Muted gray (#6B7280), not brand colors

### Credibility Elements:
- **Tooltip**: Research-backed stat (40% of decisions fail)
- **Clean layout**: No visual clutter, easier to trust
- **Equal treatment**: Custom option feels professional, not rushed

---

## FILES MODIFIED

### clarity.css
- **Lines 6786-6800**: Unified card icon colors to sage green
- **Lines 6868-6889**: Custom reframe card styling (equal option treatment)

### clarity.html
- **Lines 1419-1427**: Credibility tooltip (already implemented)
- **Lines 1442-1449**: "But consider..." section (already clean)
- **Lines 1464-1473**: Custom reframe card HTML

---

## USER EXPERIENCE IMPROVEMENTS

### Before:
- Random colors felt untrustworthy
- Descriptions competed with questions
- Custom input felt like an afterthought
- No credibility signal about reframing value

### After:
- ✅ Consistent sage green creates trust
- ✅ Questions are clearly the focal point
- ✅ Descriptions provide context without noise
- ✅ Custom input is a valid, equal choice
- ✅ Tooltip provides research-backed credibility
- ✅ Clean "But consider..." transition (no horizontal lines)

---

## TESTING CHECKLIST

### Visual Polish:
- [ ] All card icons show sage green color (#418F6F)
- [ ] Card descriptions use muted gray, not brand colors
- [ ] "But consider..." shows icon + text only (no lines)
- [ ] Custom input card has same height as other cards
- [ ] Custom input has white background, dashed border

### Hover States:
- [ ] Custom input card lifts on hover (translateY -2px)
- [ ] Custom input shows sage green background on hover
- [ ] Custom input shadow matches other cards

### Credibility:
- [ ] Info icon appears next to headline
- [ ] Tooltip shows research stat on hover/tap
- [ ] Tooltip has dark background, white text

---

## STATUS

**Completed**:
- ✅ Card icons unified to sage green
- ✅ Descriptions already muted (text-muted)
- ✅ Custom input card redesigned as equal option
- ✅ Credibility tooltip present in HTML
- ✅ "But consider..." already clean (no horizontal lines)

**Last Updated**: 2025-12-30
