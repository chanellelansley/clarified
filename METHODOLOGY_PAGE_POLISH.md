# Methodology Page — Polish Pass

Visual refinement updates to make the methodology page more elegant and professional.

---

## CHANGES APPLIED

### 1. Typography — Serif Font for Headings

**Updated all headings to use Newsreader serif font:**

- **Added font import** [clarity.html:11](clarity.html#L11)
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600&family=Newsreader:wght@400;500;600&display=swap" rel="stylesheet">
  ```

- **Main title** [clarity.css:8699-8706](clarity.css#L8699-L8706)
  ```css
  .methodology-title {
      font-family: 'Newsreader', Georgia, serif;
      font-weight: 500;
  }
  ```

- **Section titles** [clarity.css:8721-8728](clarity.css#L8721-L8728)
  ```css
  .methodology-section-title {
      font-family: 'Newsreader', Georgia, serif;
      font-weight: 500;
  }
  ```

- **Technique titles (h3)** [clarity.css:8800-8806](clarity.css#L8800-L8806)
  ```css
  .technique-title {
      font-family: 'Newsreader', Georgia, serif;
      font-weight: 500;
  }
  ```

- **CTA title** [clarity.css:8847-8853](clarity.css#L8847-L8853)
  ```css
  .methodology-cta-title {
      font-family: 'Newsreader', Georgia, serif;
      font-weight: 500;
  }
  ```

---

### 2. Numbered Circles (1, 2, 3, 4, 5)

**Updated styling** [clarity.css:8780-8794](clarity.css#L8780-L8794):

```css
.technique-number {
    background: #F0F9F6;  /* Soft sage green background */
    color: #418F6F;        /* Sage green text */
    border: none;          /* No border */
}
```

**Before**: Light background with border
**After**: Soft sage green background, no border, clean look

---

### 3. Source Citations

**Updated styling** [clarity.css:8815-8820](clarity.css#L8815-L8820):

```css
.technique-citation {
    font-size: 13px;       /* Exact 13px */
    color: #9CA3AF;        /* Gray color */
    font-style: italic;    /* Already italic */
}
```

**Result**: Muted, smaller, and more refined academic citation style

---

### 4. Research Tags/Pills

**Updated institution tags** [clarity.css:8829-8838](clarity.css#L8829-L8838):

```css
.institution {
    background: #F0F9F6;   /* Soft sage green */
    color: #418F6F;        /* Sage green text */
    border: none;          /* No border */
    padding: 8px 16px;     /* Exact padding */
    border-radius: 8px;    /* Exact border radius */
}
```

**Tags now display**:
- "Nobel Prize winners (Kahneman, Tversky)"
- "Harvard Business Review"
- "Behavioral Economics Labs"
- "Decision Science Journals"

**Result**: Matching numbered circles, clean sage green aesthetic

---

### 5. Spacing

**Hero section** [clarity.css:8693-8697](clarity.css#L8693-L8697):
```css
.methodology-hero {
    padding-top: 80px;       /* Exact 80px */
    margin-bottom: 48px;     /* Exact 48px */
}
```

**Section cards** [clarity.css:8714-8719](clarity.css#L8714-L8719):
```css
.methodology-section {
    padding: 40px;           /* Minimum 40px padding */
    margin-bottom: 48px;     /* Exact 48px between sections */
}
```

**CTA section** [clarity.css:8840-8845](clarity.css#L8840-L8845):
```css
.methodology-cta-section {
    margin-top: 48px;        /* Exact 48px spacing */
}
```

**Mobile adjustments** [clarity.css:8869-8872](clarity.css#L8869-L8872):
```css
.methodology-section {
    padding: 32px 24px;      /* Responsive padding */
    margin-bottom: 32px;     /* Tighter spacing on mobile */
}
```

---

### 6. Background Consistency

**Page background** [clarity.css:8687-8689](clarity.css#L8687-L8689):
```css
#page-methodology {
    background: #FAFAFA;     /* Off-white page background */
}
```

**Section cards** [clarity.css:8716](clarity.css#L8716):
```css
.methodology-section {
    background: #FFFFFF;     /* Pure white cards */
}
```

**Result**: Clean contrast between off-white page background and white content cards

---

## VISUAL SUMMARY

### Before:
- Sans-serif headings (Plus Jakarta Sans)
- Inconsistent spacing
- Generic styling on numbered circles
- Citations blended with body text
- Research tags with borders

### After:
- ✅ Elegant serif headings (Newsreader)
- ✅ Consistent 48px spacing between sections
- ✅ Soft sage green numbered circles (#F0F9F6 background)
- ✅ Muted gray italic citations (13px, #9CA3AF)
- ✅ Clean research tags with sage green aesthetic
- ✅ White cards on off-white background (#FAFAFA)
- ✅ Minimum 40px padding on all cards

---

## FILES MODIFIED

### clarity.html
- **Line 11**: Added Newsreader font import

### clarity.css
- **Lines 8687-8689**: Added page background (#FAFAFA)
- **Lines 8693-8697**: Hero section spacing (80px top, 48px bottom)
- **Lines 8699-8706**: Main title serif font
- **Lines 8714-8719**: Section cards (white bg, 40px padding, 48px margin)
- **Lines 8721-8728**: Section title serif font
- **Lines 8780-8794**: Numbered circles styling
- **Lines 8800-8806**: Technique title serif font
- **Lines 8815-8820**: Citation styling (13px, #9CA3AF)
- **Lines 8829-8838**: Research tags styling (#F0F9F6 background)
- **Lines 8840-8845**: CTA section spacing
- **Lines 8847-8853**: CTA title serif font
- **Lines 8869-8872**: Mobile section padding

---

## DESIGN PRINCIPLES APPLIED

1. **Typography hierarchy**: Serif for headings creates elegance and authority
2. **Color consistency**: Sage green (#418F6F) and soft backgrounds (#F0F9F6) throughout
3. **Whitespace**: Generous padding and consistent spacing creates breathing room
4. **Visual hierarchy**: Muted citations don't compete with main content
5. **Clean aesthetics**: Removed borders, used subtle backgrounds instead

---

## STATUS

**Completed**:
- ✅ All headings use Newsreader serif font (h1, h2, h3)
- ✅ Numbered circles: #F0F9F6 background, #418F6F color, no border
- ✅ Citations: 13px, #9CA3AF gray, italic
- ✅ Research tags: #F0F9F6 background, 8px/16px padding, 8px radius
- ✅ Hero padding: 80px top
- ✅ Section cards: 40px minimum padding
- ✅ Section spacing: 48px margin-bottom
- ✅ Page background: #FAFAFA
- ✅ Card backgrounds: #FFFFFF
- ✅ Mobile responsive adjustments

**Last Updated**: 2025-12-30
