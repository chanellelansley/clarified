// ============================================
// Decision Clarity App - Premium Experience
// Step-by-step flow with Claude AI integration
// ============================================

// State management
const state = {
    currentStep: 1,
    decision: '',
    reframedQuestion: '',
    urgency: '',
    values: { future: '', losses: '' },
    alternatives: [],
    assumptions: '',
    biases: '',
    reversibility: '',
    gutResponse: '',
    conversationHistory: []
};

// DOM Elements
const steps = document.querySelectorAll('.step');
const thinkingOverlay = document.getElementById('thinking-overlay');

// ============================================
// Navigation & Transitions
// ============================================

function showThinking() {
    thinkingOverlay.classList.add('active');
}

function hideThinking() {
    thinkingOverlay.classList.remove('active');
}

function goToStep(stepNumber) {
    // Fade out current step
    const currentStepEl = document.querySelector('.step.active');
    if (currentStepEl) {
        currentStepEl.style.opacity = '0';
        currentStepEl.style.transform = 'translateY(-20px)';

        setTimeout(() => {
            currentStepEl.classList.remove('active');

            // Show new step
            const nextStepEl = document.getElementById(`step-${stepNumber}`);
            if (nextStepEl) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                nextStepEl.classList.add('active');
                state.currentStep = stepNumber;
            }
        }, 400);
    }
}

// ============================================
// Claude API Integration
// ============================================

async function callClaude(prompt, systemInstructions) {
    try {
        const response = await fetch('http://localhost:3000/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                system: systemInstructions,
                messages: [
                    ...state.conversationHistory,
                    { role: 'user', content: prompt }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        const assistantMessage = data.content[0].text;

        // Update conversation history
        state.conversationHistory.push(
            { role: 'user', content: prompt },
            { role: 'assistant', content: assistantMessage }
        );

        return assistantMessage;
    } catch (error) {
        console.error('Error calling Claude:', error);
        throw error;
    }
}

// ============================================
// Step 1: Initial Question
// ============================================

document.getElementById('continue-step-1')?.addEventListener('click', async () => {
    const decisionInput = document.getElementById('decision-input');
    state.decision = decisionInput.value.trim();

    if (!state.decision) {
        decisionInput.focus();
        return;
    }

    showThinking();

    try {
        // Call Claude to generate reframes
        const systemPrompt = `You are a thoughtful decision coach. The user has shared a decision they're facing.

Generate 3 alternative ways to frame their question that might reveal what they're really asking. Be specific to their situation, not generic. Each reframe should:
- Dig deeper into what might really be at stake
- Shift perspective slightly
- Be concise (one sentence each)

Return ONLY a JSON array of strings, nothing else. Example format:
["reframe 1", "reframe 2", "reframe 3"]`;

        const response = await callClaude(
            `The decision I'm facing: "${state.decision}"\n\nWhat are 3 alternative ways to frame this question?`,
            systemPrompt
        );

        // Parse the reframes
        let reframes;
        try {
            reframes = JSON.parse(response);
        } catch {
            // If Claude didn't return pure JSON, extract it
            const jsonMatch = response.match(/\[.*\]/s);
            reframes = jsonMatch ? JSON.parse(jsonMatch[0]) : [
                "What am I really afraid of losing here?",
                "What would make this decision feel obvious?",
                "What would I tell my best friend to do?"
            ];
        }

        // Populate step 2 with reframes
        const reframeOptions = document.getElementById('reframe-options');
        reframeOptions.innerHTML = '';

        reframes.forEach((reframe, index) => {
            const card = document.createElement('button');
            card.className = 'option-card';
            card.dataset.reframe = reframe;
            card.innerHTML = `<p>${reframe}</p>`;
            card.addEventListener('click', () => selectReframe(reframe));
            reframeOptions.appendChild(card);
        });

        hideThinking();
        goToStep(2);
    } catch (error) {
        hideThinking();
        alert('Something went wrong. Please check your server connection.');
    }
});

// Voice input placeholder
document.getElementById('voice-btn')?.addEventListener('click', () => {
    alert('Voice input coming soon!');
});

// ============================================
// Step 2: Reframing
// ============================================

function selectReframe(reframe) {
    state.reframedQuestion = reframe;

    // Visual feedback
    document.querySelectorAll('#reframe-options .option-card').forEach(card => {
        card.classList.remove('selected');
    });
    event.target.closest('.option-card').classList.add('selected');

    // Auto-advance after a moment
    setTimeout(() => {
        goToStep(3);
    }, 800);
}

// Custom reframe
document.getElementById('custom-reframe')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const customReframe = e.target.value.trim();
        if (customReframe) {
            state.reframedQuestion = customReframe;
            goToStep(3);
        }
    }
});

// ============================================
// Step 3: Urgency
// ============================================

document.getElementById('continue-step-3')?.addEventListener('click', () => {
    const urgencyInput = document.getElementById('urgency-input');
    state.urgency = urgencyInput.value.trim();

    if (!state.urgency) {
        urgencyInput.focus();
        return;
    }

    // Generate reflection
    generateReflection();
});

// ============================================
// Step 4: Reflection
// ============================================

async function generateReflection() {
    showThinking();

    try {
        const systemPrompt = `You are a thoughtful decision coach reflecting back what you've heard. Be warm, specific, and human. Summarize in 2-3 sentences what seems to be at the heart of their decision, including:
- The core question
- What's creating urgency
- What seems to be at stake

Write in second person ("you"). Be conversational, not clinical.`;

        const prompt = `Here's what I've shared:
- Original decision: "${state.decision}"
- Reframed as: "${state.reframedQuestion}"
- What's making this urgent: "${state.urgency}"

Reflect back what you're hearing.`;

        const reflection = await callClaude(prompt, systemPrompt);

        document.getElementById('reflection-content').innerHTML = `<p>${reflection}</p>`;

        hideThinking();
        goToStep(4);
    } catch (error) {
        hideThinking();
        alert('Something went wrong. Please try again.');
    }
}

document.getElementById('confirm-reflection')?.addEventListener('click', () => {
    goToStep(5);
});

document.getElementById('adjust-reflection')?.addEventListener('click', () => {
    const adjustment = prompt('What would you like to adjust?');
    if (adjustment) {
        // Could regenerate with feedback, for now just continue
        goToStep(5);
    }
});

// ============================================
// Step 5: Values
// ============================================

document.getElementById('continue-step-5')?.addEventListener('click', () => {
    const futureValue = document.getElementById('values-input-1').value.trim();
    const lossValue = document.getElementById('values-input-2').value.trim();

    if (!futureValue || !lossValue) {
        if (!futureValue) document.getElementById('values-input-1').focus();
        else document.getElementById('values-input-2').focus();
        return;
    }

    state.values = { future: futureValue, losses: lossValue };

    // Generate alternatives
    generateAlternatives();
});

// ============================================
// Step 6: Alternatives
// ============================================

async function generateAlternatives() {
    showThinking();

    try {
        const systemPrompt = `You are a thoughtful decision coach helping someone see all their options. Based on what they've shared, suggest 2-3 alternatives they might not have considered. Could be variations, middle paths, or creative third options.

Return ONLY a JSON array of strings. Each should be a concise option (5-8 words max).`;

        const prompt = `Based on this decision context:
- Question: "${state.reframedQuestion}"
- What matters: "${state.values.future}"
- What they'd hate to lose: "${state.values.losses}"

What are 2-3 alternatives they might not have considered?`;

        const response = await callClaude(prompt, systemPrompt);

        let alternatives;
        try {
            alternatives = JSON.parse(response);
        } catch {
            const jsonMatch = response.match(/\[.*\]/s);
            alternatives = jsonMatch ? JSON.parse(jsonMatch[0]) : [
                "Try it part-time first",
                "Delay the decision 3 months",
                "Do the opposite of what you planned"
            ];
        }

        state.alternatives = alternatives;

        // Populate alternatives
        const alternativesOptions = document.getElementById('alternatives-options');
        alternativesOptions.innerHTML = '';

        alternatives.forEach((alt, index) => {
            const card = document.createElement('button');
            card.className = 'option-card selected';
            card.dataset.alternative = alt;
            card.innerHTML = `<p>${alt}</p>`;
            card.addEventListener('click', function() {
                this.classList.toggle('selected');
            });
            alternativesOptions.appendChild(card);
        });

        hideThinking();
        goToStep(6);
    } catch (error) {
        hideThinking();
        alert('Something went wrong. Please try again.');
    }
}

document.getElementById('continue-step-6')?.addEventListener('click', () => {
    // Collect selected alternatives
    const selected = Array.from(document.querySelectorAll('#alternatives-options .option-card.selected'))
        .map(card => card.dataset.alternative);

    state.alternatives = selected;
    goToStep(7);
});

// Add alternative
document.getElementById('add-alternative')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const newAlt = e.target.value.trim();
        if (newAlt) {
            const card = document.createElement('button');
            card.className = 'option-card selected';
            card.dataset.alternative = newAlt;
            card.innerHTML = `<p>${newAlt}</p>`;
            card.addEventListener('click', function() {
                this.classList.toggle('selected');
            });
            document.getElementById('alternatives-options').appendChild(card);
            e.target.value = '';
        }
    }
});

// ============================================
// Step 7: Assumptions
// ============================================

document.getElementById('continue-step-7')?.addEventListener('click', () => {
    state.assumptions = document.getElementById('assumptions-input').value.trim();

    if (!state.assumptions) {
        document.getElementById('assumptions-input').focus();
        return;
    }

    goToStep(8);
});

// ============================================
// Step 8: Bias Check
// ============================================

document.getElementById('continue-step-8')?.addEventListener('click', () => {
    state.biases = document.getElementById('bias-input').value.trim();

    if (!state.biases) {
        document.getElementById('bias-input').focus();
        return;
    }

    goToStep(9);
});

// ============================================
// Step 9: Reversibility
// ============================================

document.querySelectorAll('.reversibility-options .option-card').forEach(card => {
    card.addEventListener('click', () => {
        state.reversibility = card.dataset.reversibility;

        // Visual feedback
        document.querySelectorAll('.reversibility-options .option-card').forEach(c => {
            c.classList.remove('selected');
        });
        card.classList.add('selected');

        // Auto-advance
        setTimeout(() => {
            generateSummary();
        }, 800);
    });
});

// ============================================
// Step 10: Summary
// ============================================

async function generateSummary() {
    showThinking();

    try {
        const systemPrompt = `You are summarizing a decision-making conversation. Create a clear, organized summary that captures:
- The core question
- Their values (what matters, what they'd hate to lose)
- Key tensions or assumptions
- The options they're considering

Be concise but complete. Use clear headings. Write in second person. Make it feel thoughtful and considered.`;

        const prompt = `Summarize this decision journey:

**The Question:** ${state.reframedQuestion}

**Values:**
- A year from now: ${state.values.future}
- Can't lose: ${state.values.losses}

**Options:** ${state.alternatives.join(', ')}

**Assumptions:** ${state.assumptions}

**External influences/fears:** ${state.biases}

**Reversibility:** ${state.reversibility}

**Urgency:** ${state.urgency}

Create a thoughtful summary that captures the full picture.`;

        const summary = await callClaude(prompt, systemPrompt);

        document.getElementById('summary-content').innerHTML = summary.replace(/\n/g, '<br><br>');

        hideThinking();
        goToStep(10);
    } catch (error) {
        hideThinking();
        alert('Something went wrong. Please try again.');
    }
}

document.getElementById('confirm-summary')?.addEventListener('click', () => {
    generateRecommendation();
});

document.getElementById('adjust-summary')?.addEventListener('click', () => {
    const adjustment = prompt('What needs adjusting?');
    if (adjustment) {
        // Could regenerate, for now just continue
        generateRecommendation();
    }
});

// ============================================
// Step 11: Recommendation
// ============================================

async function generateRecommendation() {
    showThinking();

    try {
        const systemPrompt = `You are a thoughtful decision coach making a recommendation. Based on everything they've shared:

1. Suggest which path seems to fit best and why
2. Be specific to their values and constraints
3. Acknowledge the tradeoffs clearly
4. Write in warm, human language
5. End by asking what their gut says

Structure:
- 2-3 sentences on which direction fits
- 1-2 sentences on the main tradeoff
- End with: "What does your gut say when you read this?"

Be direct but gentle. This is a recommendation, not a command.`;

        const prompt = `Based on everything we've discussed, what recommendation would you make?

Context:
- Question: ${state.reframedQuestion}
- Values: ${state.values.future} / Can't lose: ${state.values.losses}
- Options: ${state.alternatives.join(', ')}
- Assumptions: ${state.assumptions}
- Fears: ${state.biases}
- Reversibility: ${state.reversibility}`;

        const recommendation = await callClaude(prompt, systemPrompt);

        document.getElementById('recommendation-content').innerHTML = `<p>${recommendation.replace(/\n/g, '<br><br>')}</p>`;

        hideThinking();
        goToStep(11);
    } catch (error) {
        hideThinking();
        alert('Something went wrong. Please try again.');
    }
}

document.getElementById('continue-step-11')?.addEventListener('click', () => {
    state.gutResponse = document.getElementById('gut-response').value.trim();
    goToStep(12);
});

// ============================================
// Step 12: Next Steps
// ============================================

document.querySelectorAll('.next-steps-options .option-card').forEach(card => {
    card.addEventListener('click', () => {
        const action = card.dataset.action;

        switch (action) {
            case 'stress-test':
                alert('Stress-testing feature coming soon!');
                break;
            case 'sleep':
                alert('Email export coming soon!');
                break;
            case 'share':
                alert('Sharing feature coming soon!');
                break;
        }
    });
});

document.getElementById('finish')?.addEventListener('click', () => {
    if (confirm('Ready to make your decision?')) {
        alert('Thank you for using Clarity. Trust yourself.');
        // Could save/export the conversation here
    }
});

// ============================================
// Initialize
// ============================================

// Auto-focus first input
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('decision-input')?.focus();
});
