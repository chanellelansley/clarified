# Timeline Page — Missing Features Restored

Re-added features that were lost when the options/timeline pages were split.

---

## FEATURES ADDED

### 1. "Pick a Date" Option

**5th Timeline Card** [clarity.html:1597-1606](clarity.html#L1597-L1606):

```html
<button class="timeline-card" data-timeline="custom" id="timeline-custom-btn">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
        <circle cx="8" cy="16" r="1" fill="currentColor"></circle>
    </svg>
    <span id="timeline-custom-label">Pick a date</span>
</button>
```

**Date Picker** [clarity.html:1609-1613](clarity.html#L1609-L1613):

```html
<div class="timeline-date-picker" id="timeline-date-picker" style="display: none;">
    <label class="form-label">Choose your deadline</label>
    <input type="date" id="timeline-date-input" class="input" />
</div>
```

**Behavior**:
- Click "Pick a date" → Date picker appears
- Select date → Button label updates to show chosen date (e.g., "Jan 15, 2025")
- Date stored in `deepDecisionState.customDeadline`

**JavaScript** [clarity.js:1771-1788](clarity.js#L1771-L1788):
```javascript
document.getElementById('timeline-date-input')?.addEventListener('change', function() {
    const selectedDate = this.value;
    if (selectedDate) {
        const customLabel = document.getElementById('timeline-custom-label');
        const date = new Date(selectedDate);
        const formattedDate = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        customLabel.textContent = formattedDate;
        deepDecisionState.customDeadline = selectedDate;
    }
});
```

---

### 2. Reminder / Nudge Feature

**Reminder Section** [clarity.html:1615-1656](clarity.html#L1615-L1656):

```html
<div class="timeline-reminder-section" id="timeline-reminder-section" style="display: none;">
    <div class="reminder-header">
        <label class="reminder-checkbox-label">
            <input type="checkbox" id="reminder-enabled" class="reminder-checkbox" />
            <span class="reminder-label-text">Want a gentle nudge?</span>
        </label>
        <p class="reminder-sublabel">Remind me to decide by this date</p>
    </div>

    <div class="reminder-options" id="reminder-options" style="display: none;">
        <!-- Email/Text toggle -->
        <!-- Phone input (if text selected) -->
    </div>
</div>
```

**Features**:
- **Checkbox**: "Want a gentle nudge?" → "Remind me to decide by this date"
- **Method Toggle**: Email (default) / Text
- **Email**: Uses account email (auto-populated, shown in gray text)
- **Text**: Shows phone number input only when text is selected
- **Privacy note**: "We'll only use this for decision reminders"

**Reminder Message Format**:
> "Hey — you wanted to decide about [decision]. Ready to make the call?"

**Data Captured**:
```javascript
deepDecisionState.reminder = {
    enabled: true,
    method: 'email' | 'text',
    phone: '+1 (555) 123-4567' // Only if method === 'text'
}
```

---

## STYLING

### Date Picker [clarity.css:7361-7393](clarity.css#L7361-L7393)

```css
.timeline-date-picker {
    margin-top: var(--spacing-lg);
    padding: var(--spacing-lg);
    background: var(--gray-50);      /* Soft background */
    border: 2px solid var(--gray-200);
    border-radius: var(--radius-card);
}

.timeline-date-picker .input {
    width: 100%;
    padding: var(--spacing-md);
    border: 1px solid var(--gray-200);
    border-radius: var(--radius-md);
    font-family: var(--font-sans);
    font-size: var(--text-body);
    background: white;
    transition: all 200ms ease;
}

.timeline-date-picker .input:focus {
    outline: none;
    border-color: var(--brand-primary);
    box-shadow: 0 0 0 3px var(--brand-soft);
}
```

**Result**: Clean, minimal date input that matches app aesthetic.

---

### Reminder Section [clarity.css:7395-7516](clarity.css#L7395-L7516)

```css
.timeline-reminder-section {
    margin-top: var(--spacing-lg);
    padding: var(--spacing-lg);
    background: white;
    border: 2px solid var(--gray-200);
    border-radius: var(--radius-card);
}

.reminder-checkbox-label {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    cursor: pointer;
}

.reminder-checkbox {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    border: 2px solid var(--gray-300);
    cursor: pointer;
    accent-color: var(--brand-primary);  /* Sage green when checked */
}

.reminder-label-text {
    font-size: var(--text-body);
    font-weight: 500;
    color: var(--text-primary);
}

.reminder-sublabel {
    margin: 4px 0 0 28px;
    font-size: var(--text-sm);
    color: var(--text-muted);  /* Subtle, not pushy */
}
```

**Checkbox Design**:
- Subtle, not pushy
- Sage green accent color when checked
- Clear label hierarchy

---

### Method Toggle Buttons [clarity.css:7443-7481](clarity.css#L7443-L7481)

```css
.reminder-method-toggle {
    display: flex;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-md);
}

.reminder-method-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-md);
    background: white;
    border: 2px solid var(--gray-200);
    border-radius: var(--radius-md);
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 200ms ease;
}

.reminder-method-btn.active {
    background: var(--brand-soft);
    border-color: var(--brand-primary);
    color: var(--brand-primary);
}
```

**Result**: Clean toggle buttons with sage green active state.

---

### Phone Input [clarity.css:7489-7516](clarity.css#L7489-L7516)

```css
.reminder-phone-input {
    margin-top: var(--spacing-md);
}

.reminder-phone-input .input {
    width: 100%;
    padding: var(--spacing-md);
    border: 1px solid var(--gray-200);
    border-radius: var(--radius-md);
    font-family: var(--font-sans);
    font-size: var(--text-body);
    background: white;
    transition: all 200ms ease;
}
```

**Result**: Only shows when "Text" is selected. Matches app input styling.

---

## USER FLOWS

### Flow 1: Pick a Custom Date with Email Reminder

```
User on Timeline page
  ↓
Clicks "Pick a date" card
  ↓
Date picker appears below
  ↓
Reminder section appears: "Want a gentle nudge?"
  ↓
User selects date (e.g., Jan 15, 2025)
  ↓
Card label updates: "Pick a date" → "Jan 15, 2025"
  ↓
User checks "Remind me to decide by this date"
  ↓
Reminder options expand
  ↓
"Email" is selected by default
  ↓
Gray text: "We'll send a reminder to your account email"
  ↓
User clicks Continue
  ↓
Data stored:
{
  timeline: 'custom',
  customDeadline: '2025-01-15',
  reminder: {
    enabled: true,
    method: 'email',
    phone: null
  }
}
```

---

### Flow 2: Pick a Date with Text Reminder

```
User picks "Pick a date"
  ↓
Selects date: Feb 20, 2025
  ↓
Checks "Want a gentle nudge?"
  ↓
Clicks "Text" method
  ↓
Phone input appears: "+1 (555) 123-4567"
  ↓
Note: "We'll only use this for decision reminders"
  ↓
User enters phone number
  ↓
Clicks Continue
  ↓
Data stored:
{
  timeline: 'custom',
  customDeadline: '2025-02-20',
  reminder: {
    enabled: true,
    method: 'text',
    phone: '+15551234567'
  }
}
```

---

### Flow 3: Standard Timeline Option (No Reminder)

```
User selects "This week"
  ↓
Date picker: hidden
Reminder section: hidden
  ↓
User clicks Continue
  ↓
Data stored:
{
  timeline: 'urgent',
  reminder: { enabled: false }
}
```

---

## JAVASCRIPT HANDLERS

### Timeline Card Click [clarity.js:1748-1769](clarity.js#L1748-L1769)

```javascript
document.querySelectorAll('.timeline-card').forEach(card => {
    card.addEventListener('click', function() {
        document.querySelectorAll('.timeline-card').forEach(c => c.classList.remove('selected'));
        this.classList.add('selected');

        const timelineValue = this.dataset.timeline;
        const datePicker = document.getElementById('timeline-date-picker');
        const reminderSection = document.getElementById('timeline-reminder-section');

        if (timelineValue === 'custom') {
            datePicker.style.display = 'block';
            reminderSection.style.display = 'block';
        } else {
            datePicker.style.display = 'none';
            reminderSection.style.display = 'none';
        }
    });
});
```

---

### Reminder Checkbox [clarity.js:1790-1798](clarity.js#L1790-L1798)

```javascript
document.getElementById('reminder-enabled')?.addEventListener('change', function() {
    const reminderOptions = document.getElementById('reminder-options');
    if (this.checked) {
        reminderOptions.style.display = 'block';
    } else {
        reminderOptions.style.display = 'none';
    }
});
```

---

### Method Toggle [clarity.js:1800-1819](clarity.js#L1800-L1819)

```javascript
document.querySelectorAll('.reminder-method-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.reminder-method-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');

        const method = this.dataset.method;
        const emailInfo = document.getElementById('reminder-email-info');
        const phoneInput = document.getElementById('reminder-phone-input');

        if (method === 'email') {
            emailInfo.style.display = 'block';
            phoneInput.style.display = 'none';
        } else {
            emailInfo.style.display = 'none';
            phoneInput.style.display = 'block';
        }
    });
});
```

---

### Continue Button Validation [clarity.js:1861-1904](clarity.js#L1861-L1904)

```javascript
document.getElementById('deep-continue-4')?.addEventListener('click', () => {
    const timeline = document.querySelector('.timeline-card.selected')?.dataset.timeline;

    if (!timeline) {
        alert('Please select a timeline for your decision.');
        return;
    }

    // Validate custom date is selected
    if (timeline === 'custom') {
        const customDate = document.getElementById('timeline-date-input').value;
        if (!customDate) {
            alert('Please select a date for your deadline.');
            return;
        }
        deepDecisionState.customDeadline = customDate;
    }

    // Capture reminder preferences
    const reminderEnabled = document.getElementById('reminder-enabled')?.checked;
    if (reminderEnabled) {
        const reminderMethod = document.querySelector('.reminder-method-btn.active')?.dataset.method;
        const reminderPhone = document.getElementById('reminder-phone')?.value;

        deepDecisionState.reminder = {
            enabled: true,
            method: reminderMethod,
            phone: reminderMethod === 'text' ? reminderPhone : null
        };
    } else {
        deepDecisionState.reminder = { enabled: false };
    }

    deepDecisionState.timeline = timeline;
    showPage('deep-5');
});
```

---

## RE-ENGAGEMENT STRATEGY

### Reminder Trigger
On the deadline date, Clarified sends a reminder:

**Email Subject**: "Time to decide: [decision]"

**Message**:
> Hey — you wanted to decide about [decision]. Ready to make the call?
>
> [View Decision] button → Takes user back to their decision context

**Text Message**:
> Hey — you wanted to decide about [decision]. Ready to make the call? [link]

### Benefits:
- **Re-engagement**: Brings users back to the app
- **Follow-through**: Helps users actually make decisions, not just think about them
- **Trust**: Shows Clarified cares about outcomes, not just inputs
- **Accountability**: Gentle nudge without being pushy

---

## DATA STRUCTURE

### deepDecisionState Updates

```javascript
{
  // ... existing fields
  timeline: 'urgent' | 'soon' | 'flexible' | 'open' | 'custom',
  customDeadline: '2025-01-15', // ISO date string (only if timeline === 'custom')
  reminder: {
    enabled: true | false,
    method: 'email' | 'text',
    phone: '+15551234567' // Only if method === 'text'
  }
}
```

---

## BACKEND REQUIREMENTS (Future Implementation)

### 1. Store Reminder Preferences

When decision is saved, also store:
```sql
CREATE TABLE decision_reminders (
  id UUID PRIMARY KEY,
  decision_id UUID REFERENCES decisions(id),
  user_id UUID REFERENCES users(id),
  deadline_date DATE,
  reminder_method VARCHAR(10), -- 'email' or 'text'
  reminder_phone VARCHAR(20),  -- Only if method = 'text'
  sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP
);
```

---

### 2. Scheduled Job (Cron/Lambda)

**Daily job** (runs every morning):
```javascript
// Pseudo-code
const today = new Date();
const remindersToSend = await db.query(`
  SELECT * FROM decision_reminders
  WHERE deadline_date = $1
    AND sent = FALSE
`, [today]);

for (const reminder of remindersToSend) {
  const decision = await getDecision(reminder.decision_id);
  const user = await getUser(reminder.user_id);

  if (reminder.reminder_method === 'email') {
    await sendEmail({
      to: user.email,
      subject: `Time to decide: ${decision.question}`,
      body: `Hey — you wanted to decide about ${decision.question}. Ready to make the call?`,
      cta: { text: 'View Decision', url: `https://clarified.app/decisions/${decision.id}` }
    });
  } else {
    await sendSMS({
      to: reminder.reminder_phone,
      message: `Hey — you wanted to decide about ${decision.question}. Ready to make the call? https://clarified.app/d/${decision.id}`
    });
  }

  // Mark as sent
  await db.query(`UPDATE decision_reminders SET sent = TRUE WHERE id = $1`, [reminder.id]);
}
```

---

### 3. Email Template (Resend/SendGrid)

```html
<h2>Time to decide</h2>
<p>Hey — you wanted to decide about <strong>{{ decision.question }}</strong>.</p>
<p>Ready to make the call?</p>
<a href="{{ decision_url }}" style="background: #418F6F; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
  View Decision
</a>
```

---

### 4. SMS Template (Twilio)

```
Hey — you wanted to decide about {{ decision.question }}. Ready to make the call? {{ short_url }}
```

---

## FILES MODIFIED

### clarity.html
- **Lines 1597-1606**: Added 5th timeline card ("Pick a date")
- **Lines 1609-1613**: Date picker section
- **Lines 1615-1656**: Reminder section (checkbox, toggle, phone input)

### clarity.css
- **Lines 7361-7393**: Date picker styling
- **Lines 7395-7434**: Reminder section base styling
- **Lines 7436-7481**: Reminder options (toggle buttons, email info)
- **Lines 7489-7516**: Phone input styling

### clarity.js
- **Lines 1755-1767**: Show/hide date picker and reminder section
- **Lines 1771-1788**: Date picker change handler
- **Lines 1790-1798**: Reminder checkbox handler
- **Lines 1800-1819**: Reminder method toggle handler
- **Lines 1870-1878**: Validate custom date selection
- **Lines 1888-1901**: Capture reminder preferences

---

## STATUS

**Completed**:
- ✅ 5th timeline card: "Pick a date"
- ✅ Date picker (shows on custom selection)
- ✅ Date updates card label when selected
- ✅ Reminder section (checkbox + toggle)
- ✅ Email/Text method toggle
- ✅ Phone input (only shows for text)
- ✅ Clean, minimal styling matching app aesthetic
- ✅ JavaScript handlers for all interactions
- ✅ Data validation (custom date required if selected)
- ✅ Data capture in deepDecisionState

**Future Work** (Backend):
- ⏳ Database schema for reminders
- ⏳ Scheduled job to send reminders
- ⏳ Email/SMS templates
- ⏳ Reminder delivery tracking

**Last Updated**: 2025-12-30
