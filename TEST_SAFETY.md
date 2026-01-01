# Safety Screening Test Plan

## How to Test

1. **Open the app** in a browser
2. **Open DevTools Console** (F12 or Cmd+Option+I)
3. **Test the following inputs**

## Test Cases

### ✅ SHOULD BLOCK IMMEDIATELY (Crisis Modal Should Show)

Test these in the Quick Decision or Deep Decision input:

1. **"I've been thinking about ending my life"**
   - Expected console output:
     ```
     [SAFETY] Screening input: i've been thinking about ending my life
     [SAFETY] ⚠️ FLAGGED: crisis keyword: ending my life block: true
     [SAFETY] Screening result: {flagged: true, category: 'crisis', ...}
     [SAFETY] 🛑 BLOCKING - Showing modal: showCrisisModal
     [SAFETY] 🚨 Showing crisis modal
     [QUICK/DEEP FLOW] Screening returned: false
     [QUICK/DEEP FLOW] 🛑 BLOCKED - Not continuing to next page
     ```
   - Expected UI: **Crisis modal appears IMMEDIATELY** with 988 resources
   - Expected: **NO page navigation, NO AI processing**

2. **"I want to die"**
   - Should match keyword: "want to die"
   - Should show crisis modal immediately

3. **"Should I kill myself?"**
   - Should match keyword: "kill myself"
   - Should show crisis modal immediately

4. **"I'm thinking about killing myself"**
   - Should match keyword: "killing myself"
   - Should show crisis modal immediately

### ✅ SHOULD ALLOW WITH DISCLAIMER (Medical)

5. **"Should I stop taking my medication?"**
   - Expected: Matches "stop taking"
   - Medical disclaimer modal shows
   - User can click "Continue anyway"
   - Flow continues with disclaimer banner

6. **"Should I quit my meds?"**
   - Expected: Matches "quit my meds"
   - Medical disclaimer modal shows

7. **"Can I change my dosage?"**
   - Expected: Matches "change my dosage"
   - Medical disclaimer modal shows

### ✅ SHOULD ALLOW WITH DISCLAIMER (Financial)

8. **"Should I invest my money in crypto?"**
   - Expected: Matches "invest my money" or "crypto"
   - Financial disclaimer modal shows

9. **"Should I sell my stock?"**
   - Expected: Matches "sell my stock"
   - Financial disclaimer modal shows

### ✅ SHOULD ALLOW WITH DISCLAIMER (Legal)

10. **"Should I sign this contract?"**
    - Expected: Matches "sign this contract"
    - Legal disclaimer modal shows

11. **"Should I sue my landlord?"**
    - Expected: Matches "sue my"
    - Legal disclaimer modal shows

### ✅ SHOULD ALLOW (No Flags)

12. **"Should I go to the gym tonight?"**
   - Expected console output:
     ```
     [SAFETY] Screening input: should i go to the gym tonight?
     [SAFETY] ✓ No flags detected
     [QUICK/DEEP FLOW] ✓ Continuing to quick-2
     ```
   - Expected: Normal flow, no modal

## What SUCCESS Looks Like

### For Crisis Input ("ending my life"):

1. **User types crisis phrase** and clicks Continue
2. **Console shows**: `[SAFETY] ⚠️ FLAGGED: crisis`
3. **Console shows**: `[SAFETY] 🛑 BLOCKING`
4. **Console shows**: `🛑 BLOCKED - Not continuing to next page`
5. **Crisis modal appears** with heart icon, support resources (988, text 741741)
6. **Page does NOT navigate** to next step
7. **NO AI processing** happens
8. **User clicks "I understand"** → Returns to /decisions page

### What FAILURE Looks Like

❌ User sees loading spinner
❌ User sees AI response
❌ User progresses through multiple flow steps
❌ Safety message appears AFTER results
❌ Console shows "Continuing to quick-2/deep-2"

## Debugging

If screening isn't working:

1. **Check console for errors** - Modal element might not exist
2. **Verify modal HTML exists** - Search HTML for `id="crisis-modal"`
3. **Check CSS** - `.modal.active` should have `display: flex`
4. **Test keyword detection** - Run this in console:
   ```javascript
   screenUserInput("I've been thinking about ending my life")
   ```
   Should return: `{flagged: true, category: 'crisis', block: true, ...}`

## Current Implementation

- **Screening happens at**: Lines 820 (Quick) and 1178 (Deep)
- **BEFORE**: `showPage()` navigation
- **BEFORE**: Any `generateReframes()` or AI calls
- **Returns `false`**: Stops flow completely
- **Modal shows**: Immediate, synchronous display

## Keywords Being Detected

### Crisis (BLOCKING):
- suicide, suicidal
- kill myself, killing myself
- end my life, ending my life
- want to die, wanting to die
- better off dead
- no reason to live
- hurt myself, hurting myself
- self-harm, self harm
- cutting myself, cut myself
- take my own life, taking my own life

### Harm to Others (BLOCKING):
- kill them, killing them
- hurt them, hurting them
- attack, attacking
- violence, violent
- get revenge, getting revenge
- beat them up, beating them up

### Medical (DISCLAIMER - Non-blocking):
- stop taking, stop my medication, stop medication
- quit my meds, quit meds, off my meds, off meds
- change my dosage, change dosage, adjust my dose, adjust dose
- stop my prescription, stop prescription
- diagnose, diagnosis, diagnostic
- medical treatment, treatment plan
- stop therapy, quit therapy, stop my therapy
- prescription, prescribe
- should i take, should i stop taking
- drug interaction, medication interaction
- go off my, coming off my, weaning off

### Financial (DISCLAIMER - Non-blocking):
- invest my savings, invest my money, invest in
- put money in, put my money
- stock, stocks, crypto, cryptocurrency, bitcoin
- financial advisor, retirement fund, investment advice
- should i buy shares, should i invest, buy stock
- trading, day trading, options trading
- 401k, ira, roth ira
- mutual fund, etf, index fund
- sell my stock, sell my shares, cash out my

### Legal (DISCLAIMER - Non-blocking):
- sign this contract, sign the contract, sign a contract
- sue them, sue my, file a lawsuit
- legal action, take legal action
- lawsuit, lawyer, attorney, legal advice
- custody, child custody, custody battle
- prenup, prenuptial, divorce settlement, divorce lawyer
- will and testament, estate planning
- contract, lease agreement, sign a lease
- legal rights, legal issue, legal problem
- restraining order, court case, going to court

### Illegal (BLOCKING):
- illegal, break the law, breaking the law
- smuggle, smuggling
- steal, stealing, theft, shoplift, shoplifting
- fraud, scam, scamming
- tax evasion, evade taxes, cheat on taxes
- hide from police, run from police, evade police
- drug dealing, sell drugs, selling drugs
- fake documents, forge, forged, forgery

### Minors (BLOCKING):
- dating a minor, date a minor, dating someone underage
- relationship with teenager, relationship with minor
- underage, under age
- they are 17/16/15/14/13
- she is 17/16/15, he is 17/16/15
- 17 year old, 16 year old, 15 year old
- high school student, high schooler
