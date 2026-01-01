# AI Summary Voice — First Person Fix

Updated all AI prompts to speak directly to the user in second person ("you"/"your") instead of third person ("the user"/"their").

---

## PROBLEM

AI-generated summaries and recommendations were using third-person language, making them feel distant and clinical:

**Before**:
- "Based on the user's values..."
- "Their concerns about..."
- "This aligns with what they said matters most..."

**After**:
- "Based on your values..."
- "Your concerns about..."
- "This aligns with what you said matters most..."

---

## PROMPTS UPDATED

### 1. Comprehensive Analysis Prompt ✅

**Location**: [clarity.js:2718-2755](clarity.js#L2718-L2755)

**Before**:
```javascript
const systemPrompt = `You are a decision coach. Analyze the user's decision and return a comprehensive analysis.

...

"reasoning": "2-3 sentence explanation of why this option wins, based on their specific values and concerns",

...

CRITICAL REQUIREMENTS:
- comparison array must include ALL user's values (${deepDecisionState.values.length} values)
- Use neutral phrasing (no possessives like "your partner")`;

const prompt = `Decision: ${deepDecisionState.reframedQuestion || deepDecisionState.decision}

User's values (in priority order): ${deepDecisionState.values.join(', ')}
Assumptions: ${assumptionsText}
...
Provide a comprehensive analysis.`;
```

**After**:
```javascript
const systemPrompt = `You are a decision coach speaking directly to the person making the decision. Analyze their decision and return a comprehensive analysis.

...

"reasoning": "2-3 sentence explanation of why this option wins, based on YOUR specific values and concerns. Speak directly to the person using 'you' and 'your'.",

...

CRITICAL REQUIREMENTS:
- comparison array must include ALL values (${deepDecisionState.values.length} values)
- Use neutral phrasing (no possessives like "your partner")
- SPEAK DIRECTLY TO THE USER: Use "you" and "your" instead of "the user" or "their"`;

const prompt = `Decision: ${deepDecisionState.reframedQuestion || deepDecisionState.decision}

Values (in priority order): ${deepDecisionState.values.join(', ')}
Assumptions: ${assumptionsText}
...
Provide a comprehensive analysis speaking directly to the person making this decision.`;
```

**Changes**:
- Updated system prompt to say "speaking directly to the person"
- Changed "their specific values" → "YOUR specific values"
- Changed "user's values" → "values"
- Added explicit instruction: "SPEAK DIRECTLY TO THE USER: Use 'you' and 'your'"
- Updated prompt ending: "speaking directly to the person making this decision"

---

### 2. Top Recommendation Prompt ✅

**Location**: [clarity.js:3178-3209](clarity.js#L3178-L3209)

**Before**:
```javascript
const systemPrompt = `You are a decision coach. Analyze which option best aligns with the user's values and return a recommendation.

...

- The whyThisFits bullets should be crisp, scannable reasons referencing their specific concerns and timeline.`;

const prompt = `Decision: ${deepDecisionState.reframedQuestion || deepDecisionState.decision}

Your values (in priority order): ${deepDecisionState.values.join(', ')}
Your assumptions: ${assumptionsText}
...
Which option aligns best with your values? Reference their specific concerns and timeline in the reason.`;
```

**After**:
```javascript
const systemPrompt = `You are a decision coach speaking directly to the person making the decision. Analyze which option best aligns with their values and return a recommendation.

...

- The whyThisFits bullets should be crisp, scannable reasons referencing YOUR specific concerns and timeline.`;

const prompt = `Decision: ${deepDecisionState.reframedQuestion || deepDecisionState.decision}

Values (in priority order): ${deepDecisionState.values.join(', ')}
Assumptions: ${assumptionsText}
...
Which option aligns best with these values? Reference specific concerns and timeline in the reason.`;
```

**Changes**:
- Added "speaking directly to the person making the decision"
- Changed "their specific concerns" → "YOUR specific concerns"
- Changed "Your values" → "Values" (in prompt data)
- Changed "their specific concerns and timeline" → "specific concerns and timeline" (more neutral)

---

### 3. Quick Decision Prompt ✅

**Location**: [clarity.js:970-995](clarity.js#L970-L995)

**Before**:
```javascript
CRITICAL RULES:
- ALWAYS give a specific recommendation based on the actual options in their decision
- Reference the ACTUAL CHOICE from their question
...

Return your answer in this EXACT format:
RECOMMENDATION: [2-4 word specific action from their options]
REASON: [One sentence why, tied to what they said matters. Reference their specific situation.]
CAVEAT: [One short sentence optional caveat or tip.]

const userPrompt = `Decision: "${quickDecisionState.decision}"

What matters to them: ${quickDecisionState.matters}
...
Analyze their decision and give a SPECIFIC recommendation from the options in their question. Reference their actual situation.`;
```

**After**:
```javascript
CRITICAL RULES:
- ALWAYS give a specific recommendation based on the actual options in the decision
- Reference the ACTUAL CHOICE from the question
- SPEAK DIRECTLY TO THE PERSON: Use "you" and "your" throughout
...

Return your answer in this EXACT format:
RECOMMENDATION: [2-4 word specific action from the options]
REASON: [One sentence why, tied to what they said matters. Reference the specific situation using "you" and "your".]
CAVEAT: [One short sentence optional caveat or tip. Keep it brief. Use "you".]

const userPrompt = `Decision: "${quickDecisionState.decision}"

What matters: ${quickDecisionState.matters}
...
Analyze this decision and give a SPECIFIC recommendation from the options in the question. Speak directly to the person using "you" and "your".`;
```

**Changes**:
- Added explicit instruction: "SPEAK DIRECTLY TO THE PERSON: Use 'you' and 'your' throughout"
- Changed "their options" → "the options"
- Changed "their question" → "the question"
- Changed "their specific situation" → "the specific situation"
- Changed "What matters to them" → "What matters"
- Updated REASON format: "using 'you' and 'your'"
- Updated CAVEAT format: "Use 'you'"
- Updated prompt ending: "Speak directly to the person using 'you' and 'your'"

---

### 4. Reframing Prompt ✅

**Location**: [clarity.js:1264-1268](clarity.js#L1264-L1268)

**Before**:
```javascript
Each reframe should:
1. Use specific details from their decision (people, places, choices)
2. Present it as a choice or question about what's at stake
3. Reveal a different dimension (fear vs. desire, growth vs. comfort, trade-offs)
```

**After**:
```javascript
Each reframe should:
1. Use specific details from the decision (people, places, choices)
2. Present it as a choice or question about what's at stake
3. Reveal a different dimension (fear vs. desire, growth vs. comfort, trade-offs)
4. Use "you" and "your" when addressing the person
```

**Changes**:
- Changed "their decision" → "the decision"
- Added rule: "Use 'you' and 'your' when addressing the person"

---

## IMPACT

### Before (Third Person):
```
"Based on the user's values and their concerns about timing, this option
appears to be the stronger choice. It aligns with what they said matters
most and addresses their main challenges."
```

### After (Second Person):
```
"Based on your values and your concerns about timing, this option appears
to be the stronger choice. It aligns with what you said matters most and
addresses your main challenges."
```

---

## USER EXPERIENCE IMPROVEMENTS

### Engagement:
- Feels like a conversation, not a report
- AI speaks TO you, not ABOUT you
- More personal and direct

### Trust:
- Acknowledges the user's agency
- Feels less clinical, more coaching
- Creates stronger connection

### Clarity:
- No ambiguity about who "the user" is
- Direct address is easier to parse
- Feels more immediate and actionable

---

## PROMPTS NOT CHANGED

### Option Extraction Prompt
**Location**: [clarity.js:1614-1625](clarity.js#L1614-L1625)

**Why**: This prompt is about extracting data structure, not generating user-facing text. The mention of "the user's decision" is descriptive, not part of the output.

**Current**:
```javascript
CRITICAL: Use NEUTRAL phrasing. Do NOT add possessives like "your husband", "your wife".
- If the user's decision mentions "my husband", extract as "Leave the relationship"
```

**Decision**: Keep as-is. This is instructions TO the AI, not output FOR the user.

---

### Value Comparison Prompt
**Location**: [clarity.js:3430](clarity.js#L3430)

**Current**:
```javascript
const systemPrompt = `You are helping someone compare decision options against their values.`
```

**Decision**: Keep as-is. "Their values" is fine here as it's describing the relationship between options and values, not addressing the user directly.

---

## TESTING CHECKLIST

### Quick Decision Flow:
- [ ] Recommendation uses "you" and "your"
- [ ] Reason speaks directly to user
- [ ] Caveat uses second person

### Deep Decision Flow:
- [ ] "Why this wins" section uses "you" and "your"
- [ ] Gains/tradeoffs/risks speak directly to user
- [ ] Comparison explanations use second person

### Reframing:
- [ ] Reframed questions use "you" and "your"
- [ ] No third-person references

### Overall:
- [ ] No instances of "the user" in AI responses
- [ ] No instances of "their" when referring to user
- [ ] Consistent second-person voice throughout

---

## FILES MODIFIED

### clarity.js
- **Lines 970-995**: Quick decision prompt (added "you"/"your" instructions) ✨ NEW
- **Lines 1264-1268**: Reframing prompt (added "you"/"your" rule) ✨ NEW
- **Lines 2718-2755**: Comprehensive analysis prompt (second person throughout) ✨ NEW
- **Lines 3178-3209**: Top recommendation prompt (second person throughout) ✨ NEW

---

## STATUS

**Completed**:
- ✅ Comprehensive analysis prompt updated to second person
- ✅ Top recommendation prompt updated to second person
- ✅ Quick decision prompt updated to second person
- ✅ Reframing prompt updated to include "you"/"your" rule
- ✅ All user-facing AI outputs now use second person voice

**Last Updated**: 2025-12-30
