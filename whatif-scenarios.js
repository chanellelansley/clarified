// ============================================
// WHAT-IF SCENARIOS - SENSITIVITY ANALYSIS
// ============================================

// Store what-if data globally
let whatIfData = {
    originalWeights: {},
    optionScores: [],
    originalRecommendation: "",
    valueNames: []
};

// Preset configurations
const WHATIF_PRESETS = {
    'risk-averse': { weight1: 60, weight2: 20, weight3: 20 },
    'ambitious': { weight1: 20, weight2: 60, weight3: 20 },
    'quality': { weight1: 20, weight2: 20, weight3: 60 },
    'balanced': { weight1: 33, weight2: 33, weight3: 34 }
};

// Initialize what-if scenarios when recommendation is generated
function initializeWhatIfScenarios(recommendationData) {
    // Extract cluster weights and option scores from AI response
    // For MVP, we'll use a simplified model based on the top 3 values

    const topValues = deepDecisionState.values.slice(0, 3);
    whatIfData.valueNames = topValues;

    // Default weights (equal distribution)
    whatIfData.originalWeights = {
        weight1: 33,
        weight2: 33,
        weight3: 34
    };

    // Generate mock option scores based on the recommendation
    // In production, this would come from the AI
    whatIfData.optionScores = deepDecisionState.options.map(option => {
        const isRecommended = option === deepDecisionState.recommendation;
        return {
            option: option,
            score1: isRecommended ? 75 + Math.random() * 20 : 50 + Math.random() * 30,
            score2: isRecommended ? 70 + Math.random() * 25 : 45 + Math.random() * 35,
            score3: isRecommended ? 80 + Math.random() * 15 : 55 + Math.random() * 25
        };
    });

    whatIfData.originalRecommendation = deepDecisionState.recommendation;

    // Display current priorities
    displayCurrentPriorities();
}

// Display current priorities
function displayCurrentPriorities() {
    const prioritiesText = document.getElementById('whatif-priorities-text');
    if (!prioritiesText || whatIfData.valueNames.length === 0) return;

    const formattedPriorities = whatIfData.valueNames.map((value, index) => {
        const weight = whatIfData.originalWeights[`weight${index + 1}`];
        return `${capitalizeFirst(value)} ${weight}%`;
    }).join(' · ');

    prioritiesText.textContent = formattedPriorities;
}

// Calculate weighted score for an option
function calculateWeightedScore(optionScore, weights) {
    const total = weights.weight1 + weights.weight2 + weights.weight3;
    return (
        (optionScore.score1 * weights.weight1 / total) +
        (optionScore.score2 * weights.weight2 / total) +
        (optionScore.score3 * weights.weight3 / total)
    );
}

// Calculate scenario results
function calculateScenarioResults(newWeights) {
    // Calculate scores for all options with new weights
    const newScores = whatIfData.optionScores.map(os => {
        const newScore = calculateWeightedScore(os, newWeights);
        const originalScore = calculateWeightedScore(os, whatIfData.originalWeights);
        return {
            option: os.option,
            weighted: newScore,
            change: newScore - originalScore
        };
    });

    // Sort to find new winner
    const sorted = [...newScores].sort((a, b) => b.weighted - a.weighted);

    return {
        newRecommendation: sorted[0].option,
        optionScores: newScores,
        recommendationChanged: sorted[0].option !== whatIfData.originalRecommendation,
        winnerMargin: sorted[0].weighted - (sorted[1]?.weighted || 0)
    };
}

// Apply what-if preset
function applyWhatIfPreset(presetName) {
    if (whatIfData.valueNames.length === 0) {
        console.log('What-if data not initialized');
        return;
    }

    // Remove active class from all buttons
    document.querySelectorAll('.whatif-preset-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Handle reset
    if (presetName === 'reset') {
        document.getElementById('whatif-result').style.display = 'none';
        return;
    }

    // Add active class to clicked button
    const clickedBtn = document.querySelector(`[data-preset="${presetName}"]`);
    if (clickedBtn) clickedBtn.classList.add('active');

    // Get preset weights
    const presetWeights = WHATIF_PRESETS[presetName];
    if (!presetWeights) return;

    // Calculate new results
    const results = calculateScenarioResults(presetWeights);

    // Display results
    displayWhatIfResults(results, presetName);
}

// Display what-if results
function displayWhatIfResults(results, presetName) {
    const resultCard = document.getElementById('whatif-result');
    const newRecEl = document.getElementById('whatif-new-rec');
    const scoreChangesEl = document.getElementById('whatif-score-changes');

    if (!resultCard || !newRecEl || !scoreChangesEl) return;

    // Show result card
    resultCard.style.display = 'block';

    // Update new recommendation text
    if (results.recommendationChanged) {
        newRecEl.innerHTML = `<strong>${results.newRecommendation}</strong> becomes the stronger choice`;
    } else {
        newRecEl.innerHTML = `<strong>${results.newRecommendation}</strong> remains the top recommendation`;
    }

    // Display score changes
    scoreChangesEl.innerHTML = results.optionScores.map(scoreData => {
        const deltaClass = scoreData.change > 2 ? 'positive' :
                          scoreData.change < -2 ? 'negative' : 'neutral';
        const deltaSign = scoreData.change > 0 ? '+' : '';
        const deltaText = `${deltaSign}${Math.round(scoreData.change)} pts`;

        return `
            <div class="whatif-score-item">
                <span class="whatif-score-option">${scoreData.option}</span>
                <span class="whatif-score-delta ${deltaClass}">${deltaText}</span>
            </div>
        `;
    }).join('');

    // Scroll to results
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Make function globally available
window.applyWhatIfPreset = applyWhatIfPreset;
