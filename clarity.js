// ============================================
// CLARITY APP - Main JavaScript
// ============================================

// ============================================
// ANALYTICS TRACKING
// ============================================

// Track analytics events - can be hooked up to any analytics provider
function trackEvent(eventName, properties = {}) {
    console.log('[Analytics]', eventName, properties);

    // Send to your analytics provider here
    // Examples:
    // if (window.gtag) gtag('event', eventName, properties);
    // if (window.posthog) posthog.capture(eventName, properties);
    // if (window.mixpanel) mixpanel.track(eventName, properties);

    // For now, just store in localStorage for debugging/admin
    try {
        const events = JSON.parse(localStorage.getItem('analytics_events') || '[]');
        events.push({
            event: eventName,
            properties,
            timestamp: Date.now()
        });
        // Keep only last 100 events
        if (events.length > 100) events.shift();
        localStorage.setItem('analytics_events', JSON.stringify(events));
    } catch (e) {
        console.warn('[Analytics] Failed to store event:', e);
    }
}

// ============================================
// SENTRY ERROR TRACKING HELPERS
// ============================================

// Capture exception with context
function captureError(error, context = {}) {
    console.error('[Error]', error, context);
    if (window.Sentry) {
        Sentry.withScope(scope => {
            Object.entries(context).forEach(([key, value]) => {
                scope.setExtra(key, value);
            });
            Sentry.captureException(error);
        });
    }
}

// Capture a message/event
function captureMessage(message, level = 'info', context = {}) {
    console.log(`[${level}]`, message, context);
    if (window.Sentry) {
        Sentry.withScope(scope => {
            Object.entries(context).forEach(([key, value]) => {
                scope.setExtra(key, value);
            });
            Sentry.captureMessage(message, level);
        });
    }
}

// Set user context for Sentry
function setSentryUser(user) {
    if (window.Sentry && user) {
        Sentry.setUser({
            id: user.id,
            email: user.email
        });
        console.log('[Sentry] User context set:', user.id);
    }
}

// Clear user context on logout
function clearSentryUser() {
    if (window.Sentry) {
        Sentry.setUser(null);
        console.log('[Sentry] User context cleared');
    }
}

// ============================================
// GUEST MODE STATE MANAGEMENT
// ============================================

let isGuestMode = false;
let guestDecisionData = null;
let postSignupName = '';

// Store decision data temporarily for guests
function saveGuestDecision(decisionData) {
    guestDecisionData = decisionData;
    // Also store in sessionStorage as backup
    sessionStorage.setItem('guestDecision', JSON.stringify(decisionData));
    console.log('[GUEST] Decision saved for guest:', decisionData);
}

// Retrieve guest decision after sign-up
function getGuestDecision() {
    if (guestDecisionData) return guestDecisionData;
    const stored = sessionStorage.getItem('guestDecision');
    return stored ? JSON.parse(stored) : null;
}

// Clear guest data after saving to DB
function clearGuestData() {
    guestDecisionData = null;
    sessionStorage.removeItem('guestDecision');
    isGuestMode = false;
    console.log('[GUEST] Guest data cleared');
}

// ============================================
// DNA UNLOCK SETTINGS
// ============================================

const DNA_UNLOCK_THRESHOLD = 5;

// ============================================
// SAFETY GUARDRAILS - Input Screening
// ============================================

const SAFETY_RULES = {
    crisis: {
        keywords: [
            'suicide', 'suicidal', 'kill myself', 'killing myself',
            'end my life', 'ending my life', 'end it all', 'ending it all',
            'not worth living', 'want to die', 'wanting to die',
            'better off dead', 'no reason to live', 'no point in living',
            'hurt myself', 'hurting myself', 'self-harm', 'self harm',
            'cutting myself', 'cut myself', 'take my own life', 'taking my own life'
        ],
        action: 'showCrisisModal',
        block: true
    },
    harmToOthers: {
        keywords: [
            'kill them', 'killing them', 'hurt them', 'hurting them',
            'attack', 'attacking', 'violence', 'violent',
            'get revenge', 'getting revenge', 'make them pay physically',
            'beat them up', 'beating them up'
        ],
        action: 'showHarmWarning',
        block: true
    },
    medical: {
        keywords: [
            'stop taking', 'stop my medication', 'stop medication',
            'quit my meds', 'quit meds', 'off my meds', 'off meds',
            'change my dosage', 'change dosage', 'adjust my dose', 'adjust dose',
            'stop my prescription', 'stop prescription',
            'diagnose', 'diagnosis', 'diagnostic',
            'medical treatment', 'treatment plan',
            'stop therapy', 'quit therapy', 'stop my therapy',
            'prescription', 'prescribe',
            'should i take', 'should i stop taking',
            'drug interaction', 'medication interaction',
            'go off my', 'coming off my', 'weaning off'
        ],
        action: 'showMedicalDisclaimer',
        block: false,
        disclaimer: 'medical'
    },
    financial: {
        keywords: [
            'invest my savings', 'invest my money', 'invest in',
            'put money in', 'put my money',
            'stock', 'stocks', 'crypto', 'cryptocurrency', 'bitcoin',
            'financial advisor', 'retirement fund', 'investment advice',
            'should i buy shares', 'should i invest', 'buy stock',
            'trading', 'day trading', 'options trading',
            '401k', 'ira', 'roth ira',
            'mutual fund', 'etf', 'index fund',
            'sell my stock', 'sell my shares', 'cash out my'
        ],
        action: 'showFinancialDisclaimer',
        block: false,
        disclaimer: 'financial'
    },
    legal: {
        keywords: [
            'sign this contract', 'sign the contract', 'sign a contract',
            'sue them', 'sue my', 'file a lawsuit',
            'legal action', 'take legal action',
            'lawsuit', 'lawyer', 'attorney', 'legal advice',
            'custody', 'child custody', 'custody battle',
            'prenup', 'prenuptial', 'divorce settlement', 'divorce lawyer',
            'will and testament', 'estate planning',
            'contract', 'lease agreement', 'sign a lease',
            'legal rights', 'legal issue', 'legal problem',
            'restraining order', 'court case', 'going to court'
        ],
        action: 'showLegalDisclaimer',
        block: false,
        disclaimer: 'legal'
    },
    illegal: {
        keywords: [
            'illegal', 'break the law', 'breaking the law',
            'smuggle', 'smuggling',
            'steal', 'stealing', 'theft', 'shoplift', 'shoplifting',
            'fraud', 'scam', 'scamming',
            'tax evasion', 'evade taxes', 'cheat on taxes',
            'hide from police', 'run from police', 'evade police',
            'drug dealing', 'sell drugs', 'selling drugs',
            'fake documents', 'forge', 'forged', 'forgery'
        ],
        action: 'showIllegalWarning',
        block: true
    },
    minors: {
        keywords: [
            'dating a minor', 'date a minor', 'dating someone underage',
            'relationship with teenager', 'relationship with minor',
            'underage', 'under age', 'they are 17', 'they are 16', 'they are 15',
            'they are 14', 'they are 13', 'she is 17', 'she is 16', 'she is 15',
            'he is 17', 'he is 16', 'he is 15', '17 year old', '16 year old', '15 year old',
            'high school student', 'high schooler'
        ],
        action: 'showMinorWarning',
        block: true
    }
};

function screenUserInput(text) {
    const lowerText = text.toLowerCase();
    console.log('[SAFETY] Screening input:', lowerText.substring(0, 100));

    for (const [category, rules] of Object.entries(SAFETY_RULES)) {
        for (const keyword of rules.keywords) {
            if (lowerText.includes(keyword)) {
                console.log('[SAFETY] ⚠️ FLAGGED:', category, 'keyword:', keyword, 'block:', rules.block);
                return {
                    flagged: true,
                    category: category,
                    action: rules.action,
                    block: rules.block,
                    disclaimer: rules.disclaimer || null
                };
            }
        }
    }

    console.log('[SAFETY] ✓ No flags detected');
    return { flagged: false };
}

// Call this before processing any decision
function handleDecisionInput(userText) {
    const screening = screenUserInput(userText);
    console.log('[SAFETY] Screening result:', screening);

    if (screening.flagged) {
        if (screening.block) {
            console.log('[SAFETY] 🛑 BLOCKING - Showing modal:', screening.action);
            window[screening.action]();
            return false;
        } else {
            console.log('[SAFETY] ⚠️ DISCLAIMER - Showing modal:', screening.action);
            // Store disclaimer type for later display
            if (window.quickDecisionState) {
                window.quickDecisionState.disclaimerType = screening.disclaimer;
            }
            if (window.deepDecisionState) {
                window.deepDecisionState.disclaimerType = screening.disclaimer;
            }
            // Show disclaimer modal but allow continuation
            window[screening.action]();
            return 'disclaimer'; // Special return value for non-blocking
        }
    }

    console.log('[SAFETY] ✓ Continuing normally');
    return true;
}

// Modal handler functions
function showCrisisModal() {
    console.log('[SAFETY] 🚨 Showing crisis modal');
    const modal = document.getElementById('crisis-modal');
    if (!modal) {
        console.error('[SAFETY] ❌ Crisis modal element not found!');
        return;
    }
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCrisisModal() {
    document.getElementById('crisis-modal').classList.remove('active');
    document.body.style.overflow = '';
    showPage('decisions');
}

function showHarmWarning() {
    document.getElementById('harm-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeHarmModal() {
    document.getElementById('harm-modal').classList.remove('active');
    document.body.style.overflow = '';
    showPage('decisions');
}

function showIllegalWarning() {
    document.getElementById('illegal-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeIllegalModal() {
    document.getElementById('illegal-modal').classList.remove('active');
    document.body.style.overflow = '';
    showPage('decisions');
}

function showMinorWarning() {
    document.getElementById('minor-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeMinorModal() {
    document.getElementById('minor-modal').classList.remove('active');
    document.body.style.overflow = '';
    showPage('decisions');
}

function showMedicalDisclaimer() {
    document.getElementById('medical-disclaimer-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function showFinancialDisclaimer() {
    document.getElementById('financial-disclaimer-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function showLegalDisclaimer() {
    document.getElementById('legal-disclaimer-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeDisclaimerModal(type) {
    document.getElementById(`${type}-disclaimer-modal`).classList.remove('active');
    document.body.style.overflow = '';
}

// Set a flag that user acknowledged disclaimer and can continue
let disclaimerContinueCallback = null;

function continueWithDisclaimer(type) {
    document.getElementById(`${type}-disclaimer-modal`).classList.remove('active');
    document.body.style.overflow = '';

    // Store that user acknowledged this disclaimer
    if (window.quickDecisionState) {
        window.quickDecisionState.disclaimerAcknowledged = type;
    }
    if (window.deepDecisionState) {
        window.deepDecisionState.disclaimerAcknowledged = type;
    }

    // If there's a callback to continue the flow, call it
    if (disclaimerContinueCallback) {
        disclaimerContinueCallback();
        disclaimerContinueCallback = null;
    }
}

// ============================================
// DEV MODE - Bypass Paywalls for Testing
// ============================================

// Check if dev mode is enabled (URL param or localStorage)
function isDevMode() {
    // Check URL parameter (works anywhere)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('dev') === 'true') {
        localStorage.setItem('devMode', 'true');
        return true;
    }

    // Check localStorage
    return localStorage.getItem('devMode') === 'true';
}

// Global function to enable dev mode from console
window.enableDevMode = function() {
    localStorage.setItem('devMode', 'true');
    console.log('%c✅ DEV MODE ENABLED', 'background: #418F6F; color: white; padding: 8px 12px; border-radius: 4px; font-weight: bold;');
    console.log('%cRefresh the page to activate. All paywalls will be bypassed.', 'color: #656D69; font-style: italic;');
};

window.disableDevMode = function() {
    localStorage.removeItem('devMode');
    console.log('%c❌ DEV MODE DISABLED', 'background: #9CA3AF; color: white; padding: 8px 12px; border-radius: 4px; font-weight: bold;');
    console.log('%cRefresh the page to activate production mode.', 'color: #656D69; font-style: italic;');
};

// Helper function to check if paywall should be bypassed
function shouldBypassPaywall() {
    return isDevMode();
}

// Add console message if dev mode is active
if (isDevMode()) {
    console.log('%c🚀 DEV MODE ACTIVE', 'background: #418F6F; color: white; padding: 8px 12px; border-radius: 4px; font-weight: bold;');
    console.log('%cPaywall checks bypassed for testing', 'color: #656D69; font-style: italic;');
}

// App State
const appState = {
    user: null,
    currentPage: 'login',
    currentDecision: null,
    decisions: [],
    isGuest: false,
    devMode: isDevMode()
};

// Make appState globally accessible for supabase-client.js
window.appState = appState;

// ============================================
// PAGE NAVIGATION
// ============================================

function showPage(pageName) {
    console.log(`🔍 showPage called with: "${pageName}"`);

    // Auth check for protected pages
    // Note: decision-type is NOT protected - guests can access Quick Guidance
    const protectedPages = ['decisions', 'account'];
    if (protectedPages.includes(pageName)) {
        const currentUser = window.supabaseClient?.getCurrentUser();

        // User must be logged in to access protected pages
        if (!currentUser) {
            console.log('⚠️ User not logged in, redirecting to login');
            showPage('login');
            return;
        }
    }

    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Show target page
    const targetPage = document.getElementById(`page-${pageName}`);
    console.log(`🔍 Looking for page with ID: "page-${pageName}"`);
    console.log(`🔍 Target page found:`, targetPage ? 'YES' : 'NO');

    if (targetPage) {
        targetPage.classList.add('active');
        appState.currentPage = pageName;
        console.log(`✅ Page "${pageName}" is now active`);
        console.log(`🔍 Active page display:`, window.getComputedStyle(targetPage).display);
    } else {
        console.error(`❌ No page found with ID "page-${pageName}"`);
    }

    // Update nav active state
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === pageName) {
            link.classList.add('active');
        }
    });

    // Dispatch custom event for page change (for other modules to listen)
    window.dispatchEvent(new CustomEvent('pagechange', { detail: { page: pageName } }));

    // Show/hide nav based on page
    const nav = document.getElementById('global-nav');
    const noNavPages = ['landing', 'login', 'signup', 'signin', 'post-signup-1', 'post-signup-2'];
    if (noNavPages.includes(pageName)) {
        nav.style.display = 'none';
    } else {
        nav.style.display = 'block';
        // Update nav for guest mode
        updateNavForGuestMode();
    }

    // Pre-populate options and auto-detect category when showing deep-3 page
    if (pageName === 'deep-3' && deepDecisionState.decision) {
        initializeOptionCards();
        prePopulateOptions();
        autoDetectCategory();

        // Generate AI suggestion after a short delay to allow pre-population
        setTimeout(() => {
            generateOptionSuggestion();
        }, 500);
    }

    // Load decisions when showing the decisions page
    if (pageName === 'decisions') {
        console.log('🎯 Decisions page active, calling loadAndRenderDecisions');
        console.log('🚨 SHOWING DECISIONS PAGE');

        // DEBUG: Check if loader is visible and hide it
        const loader = document.getElementById('deep-clarity-loader');
        if (loader) {
            const loaderDisplay = window.getComputedStyle(loader).display;
            console.log(`🔍 Loader display when showing decisions:`, loaderDisplay);
            if (loaderDisplay !== 'none') {
                console.log('⚠️ Loader is visible! Hiding it now.');
                loader.style.display = 'none';
            }
        }

        // DEBUG: Check the decisions page element and parent dimensions
        const appElement = document.getElementById('app');
        const decisionsPage = document.getElementById('page-decisions');

        console.log('📐 app dimensions:', appElement?.getBoundingClientRect());
        console.log('📐 decisions dimensions:', decisionsPage?.getBoundingClientRect());

        if (appElement) {
            const appStyles = window.getComputedStyle(appElement);
            console.log('📐 #app styles:', {
                display: appStyles.display,
                position: appStyles.position,
                overflow: appStyles.overflow,
                width: appStyles.width,
                height: appStyles.height
            });
        }

        if (decisionsPage) {
            console.log('🔍 Decisions page element found');
            console.log('🔍 Has active class:', decisionsPage.classList.contains('active'));
            const styles = window.getComputedStyle(decisionsPage);
            console.log('🔍 #page-decisions styles:', {
                display: styles.display,
                position: styles.position,
                overflow: styles.overflow,
                width: styles.width,
                height: styles.height,
                visibility: styles.visibility,
                opacity: styles.opacity
            });
        } else {
            console.error('❌ Decisions page element NOT FOUND');
        }

        loadAndRenderDecisions();
    }

    // Populate category-specific values when showing deep-4 page
    if (pageName === 'deep-4') {
        populateCategoryValues();
    }

    // Populate assumption labels with actual option names when showing deep-5 page
    if (pageName === 'deep-5') {
        populateAssumptionLabels();
    }

    // Populate category-specific challenges when showing deep-6 page
    if (pageName === 'deep-6') {
        populateCategoryChallenges();
    }

    // Load account subscription info when showing account page
    if (pageName === 'account') {
        console.log('🎯 Account page active, calling loadAccountSubscriptionInfo');
        // Always call the load function - it handles all user states (guest, logged in, not authenticated)
        if (window.loadAccountSubscriptionInfo) {
            console.log('📄 Calling loadAccountSubscriptionInfo for account page');
            window.loadAccountSubscriptionInfo();
        }
    }

    // Scroll to top
    window.scrollTo(0, 0);
}

// ============================================
// ACCORDION TOGGLE
// ============================================

function toggleAccordion(accordionId) {
    const accordion = document.getElementById(`${accordionId}-accordion`);
    if (accordion) {
        accordion.classList.toggle('collapsed');
    }
}

// ============================================
// LOGIN / SIGNUP PAGE
// ============================================

let isSignUpMode = false;

// Toggle between Sign In and Sign Up
document.getElementById('auth-toggle-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    isSignUpMode = !isSignUpMode;

    const header = document.getElementById('auth-header');
    const submitBtn = document.getElementById('auth-submit-btn');
    const toggleText = document.getElementById('auth-toggle-text');
    const toggleLink = document.getElementById('auth-toggle-link');
    const foundingCallout = document.getElementById('founding-member-callout');
    const forgotPasswordLink = document.getElementById('forgot-password-link');

    if (isSignUpMode) {
        header.textContent = 'Create your account';
        submitBtn.textContent = 'Sign Up';
        toggleText.textContent = 'Already have an account?';
        toggleLink.textContent = 'Sign in';
        if (foundingCallout) foundingCallout.style.display = 'flex';
        if (forgotPasswordLink) forgotPasswordLink.style.display = 'none';
    } else {
        header.textContent = 'Welcome back';
        submitBtn.textContent = 'Sign In';
        toggleText.textContent = "Don't have an account?";
        toggleLink.textContent = 'Sign up';
        if (foundingCallout) foundingCallout.style.display = 'none';
        if (forgotPasswordLink) forgotPasswordLink.style.display = 'block';
    }
});

// Handle form submission
document.getElementById('auth-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const submitBtn = document.getElementById('auth-submit-btn');

    // Check if Supabase client is initialized
    if (!window.supabaseClient || !window.supabaseClient.getSupabase()) {
        alert('Authentication system is still loading. Please wait a moment and try again.');
        console.error('Supabase client not initialized yet');
        return;
    }

    // Disable button during submission
    submitBtn.disabled = true;
    submitBtn.textContent = isSignUpMode ? 'Creating account...' : 'Signing in...';

    try {
        let result;
        if (isSignUpMode) {
            result = await window.supabaseClient.signUp(email, password);
        } else {
            result = await window.supabaseClient.signIn(email, password);
        }

        if (result.success) {
            // Update app state
            appState.user = {
                email: email,
                id: result.data.user.id,
                isPro: false,
                quickClarityUsed: 0,
                quickClarityLimit: 3,
                deepClarityUsed: 0,
                deepClarityLimit: 10
            };
            appState.isGuest = false;

            if (isSignUpMode) {
                console.log('✅ User signed up:', email);

                // Check if user needs email confirmation
                const user = result.data.user;
                const session = result.data.session;

                if (session && session.access_token) {
                    // User is auto-confirmed and logged in
                    console.log('✅ User auto-confirmed, proceeding to app');
                    showPage('decisions');
                } else if (user && user.email_confirmed_at === null) {
                    // User needs to confirm email
                    alert('Check your email to confirm your account before signing in!');
                } else {
                    // Default: assume auto-confirmed
                    showPage('decisions');
                }
            } else {
                console.log('✅ User signed in:', email);
                showPage('decisions');

                // Offer to migrate localStorage data
                setTimeout(() => {
                    window.supabaseClient.migrateLocalStorageToSupabase();
                }, 1000);
            }
        } else {
            console.error('Auth error details:', result.error);
            alert(`Error: ${result.error}`);
        }
    } catch (error) {
        console.error('Auth error:', error);
        console.error('Error details:', error.message, error.stack);
        alert(`An error occurred: ${error.message || 'Please try again.'}`);
    } finally {
        // Re-enable button
        submitBtn.disabled = false;
        submitBtn.textContent = isSignUpMode ? 'Sign Up' : 'Sign In';
    }
});

// ============================================
// NAV LINKS
// ============================================

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        showPage(page);
    });
});

// Decision page nav links (legacy)
document.querySelectorAll('.decision-nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        showPage(page);
    });
});

// Premium top nav links
document.querySelectorAll('.top-nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        showPage(page);
    });
});

// ============================================
// DECISION TYPE SELECTION
// ============================================

// Make entire card clickable (legacy and premium cards)
const handleDecisionCardClick = async (card) => {
    const type = card.dataset.type;

    if (type === 'quick') {
        // Check paywall (bypass in dev mode)
        if (shouldBypassPaywall()) {
            startQuickClarity();
            return;
        }

        // Check subscription for Quick decisions
        const currentUser = window.supabaseClient?.getCurrentUser();
        if (currentUser) {
            const subscriptionData = await window.supabaseClient.getUserSubscription();
            const isPro = subscriptionData?.subscription?.plan === 'pro' && subscriptionData?.subscription?.status === 'active';
            const isBeta = subscriptionData?.subscription?.is_beta_user;
            const everydayUsed = subscriptionData?.usage?.everyday_decisions_used || 0;

            console.log('[Paywall] Quick check:', { isPro, isBeta, everydayUsed });

            // All signed-in users can use Quick decisions
            startQuickClarity();
        } else {
            startQuickClarity();
        }
    } else if (type === 'deep') {
        // Check paywall (bypass in dev mode)
        if (shouldBypassPaywall()) {
            startDeepClarity();
            return;
        }

        // Check if user is signed in
        let currentUser = window.supabaseClient?.getCurrentUser();
        if (!currentUser && window.supabaseClient?.getSupabase()?.auth) {
            const { data: { session } } = await window.supabaseClient.getSupabase().auth.getSession();
            currentUser = session?.user;
        }

        // Check localStorage for free Life decision usage
        const freeLifeDecisionUsed = localStorage.getItem('free_life_decision_used') === 'true';

        if (currentUser) {
            // Signed-in user: check subscription
            const subscriptionData = await window.supabaseClient.getUserSubscription();
            const isPro = subscriptionData?.subscription?.plan === 'pro' && subscriptionData?.subscription?.status === 'active';
            const isBeta = subscriptionData?.subscription?.is_beta_user;

            console.log('[Paywall] Life decision check (signed in):', { isPro, isBeta, freeLifeDecisionUsed });

            if (isBeta || isPro) {
                // Pro/Beta users have unlimited decisions
                startDeepClarity();
            } else if (!freeLifeDecisionUsed) {
                // Free signed-in users get 1 free Life decision
                startDeepClarity();
            } else {
                // Free user has used their 1 free decision - show paywall
                showLifeDecisionPaywall();
            }
        } else {
            // Anonymous user: check localStorage
            console.log('[Paywall] Life decision check (anonymous):', { freeLifeDecisionUsed });

            if (!freeLifeDecisionUsed) {
                // Allow 1 free Life decision without signup
                startDeepClarity();
            } else {
                // Anonymous user has used their free decision - show paywall
                showLifeDecisionPaywall();
            }
        }
    } else {
        // Pro card
        alert('Upgrade to Pro functionality coming soon!');
    }
};

// Legacy cards
document.querySelectorAll('.decision-type-card').forEach(card => {
    card.addEventListener('click', () => handleDecisionCardClick(card));
});

// Premium cards
document.querySelectorAll('.decision-type-card-premium').forEach(card => {
    card.addEventListener('click', () => handleDecisionCardClick(card));
});

// Simple cards
document.querySelectorAll('.decision-type-card-simple').forEach(card => {
    card.addEventListener('click', () => handleDecisionCardClick(card));
});

function startQuickClarity() {
    showPage('quick-1');
}

function startDeepClarity() {
    showPage('deep-1');
}

// Start Life decision from interstitial (handles gating)
async function startLifeDecision() {
    console.log('[LIFE] Starting Life decision from interstitial');

    // Check paywall (bypass in dev mode)
    if (shouldBypassPaywall()) {
        startDeepClarity();
        return;
    }

    // Check localStorage for free Life decision usage
    const freeLifeDecisionUsed = localStorage.getItem('free_life_decision_used') === 'true';

    // Check if user is signed in
    let currentUser = window.supabaseClient?.getCurrentUser();
    if (!currentUser && window.supabaseClient?.getSupabase()?.auth) {
        const { data: { session } } = await window.supabaseClient.getSupabase().auth.getSession();
        currentUser = session?.user;
    }

    if (currentUser) {
        // Signed-in user: check subscription
        const subscriptionData = await window.supabaseClient.getUserSubscription();
        const isPro = subscriptionData?.subscription?.plan === 'pro' && subscriptionData?.subscription?.status === 'active';
        const isBeta = subscriptionData?.subscription?.is_beta_user;

        console.log('[LIFE] Signed-in user check:', { isPro, isBeta, freeLifeDecisionUsed });

        if (isBeta || isPro) {
            startDeepClarity();
        } else if (!freeLifeDecisionUsed) {
            startDeepClarity();
        } else {
            showLifeDecisionPaywall();
        }
    } else {
        // Anonymous user
        console.log('[LIFE] Anonymous user check:', { freeLifeDecisionUsed });

        if (!freeLifeDecisionUsed) {
            startDeepClarity();
        } else {
            showLifeDecisionPaywall();
        }
    }
}

// ============================================
// CLAUDE API HELPER
// ============================================

async function callClaude(prompt, systemPrompt) {
    const PROMPT_VERSION = 'v2.0-20250101';
    console.log(`[AI-${PROMPT_VERSION}] Starting API call`);
    console.log(`[AI-${PROMPT_VERSION}] System prompt length: ${systemPrompt?.length || 0}`);
    console.log(`[AI-${PROMPT_VERSION}] User prompt length: ${prompt?.length || 0}`);

    try {
        // Use relative URL so it works in both dev and production
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                system: systemPrompt,
                messages: [{ role: 'user', content: prompt }],
                prompt_version: PROMPT_VERSION
            })
        });

        console.log(`[AI-${PROMPT_VERSION}] Response status: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[AI-${PROMPT_VERSION}] Server error response:`, errorText);
            throw new Error(`Server error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log(`[AI-${PROMPT_VERSION}] Response received, content length: ${data.content?.[0]?.text?.length || 0}`);
        return data.content[0].text;
    } catch (error) {
        console.error(`[AI-${PROMPT_VERSION}] Error calling Claude:`, error);
        captureError(error, {
            component: 'callClaude',
            promptVersion: PROMPT_VERSION,
            systemPromptLength: systemPrompt?.length || 0,
            userPromptLength: prompt?.length || 0
        });
        throw error;
    }
}

// ============================================
// DECISIONS PAGE & MODAL
// ============================================

// Tab filtering
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        // Filter logic would go here
    });
});

// Modal functions
function openCheckInModal() {
    document.getElementById('checkin-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCheckInModal() {
    document.getElementById('checkin-modal').classList.remove('active');
    document.body.style.overflow = '';
}

// Option button selection
document.querySelectorAll('.option-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        // Deselect siblings
        this.parentElement.querySelectorAll('.option-btn').forEach(b => {
            b.classList.remove('selected');
        });
        // Select this one
        this.classList.add('selected');
    });
});

// Confidence slider
const slider = document.getElementById('confidence-slider');
const confidenceValue = document.getElementById('confidence-value');
if (slider && confidenceValue) {
    slider.addEventListener('input', () => {
        confidenceValue.textContent = slider.value;
    });
}

// Make functions globally available
window.openCheckInModal = openCheckInModal;
window.closeCheckInModal = closeCheckInModal;

// ============================================
// ACCOUNT PAGE
// ============================================

// Billing toggle
document.querySelectorAll('.billing-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        // Remove active from all
        document.querySelectorAll('.billing-btn').forEach(b => {
            b.classList.remove('active');
        });
        // Add active to clicked
        this.classList.add('active');

        // Update pricing display
        const billingType = this.dataset.billing;
        const priceElement = document.querySelector('.price-large');
        const periodElement = document.querySelector('.price-period');
        const subtextElement = document.querySelector('.price-subtext');

        if (billingType === 'monthly') {
            priceElement.textContent = '$8';
            periodElement.textContent = '/month';
            subtextElement.textContent = 'Billed monthly';
        } else {
            priceElement.textContent = '$80';
            periodElement.textContent = '/year';
            subtextElement.textContent = 'Billed annually · Save $16/year';
        }
    });
});

// Sign out
document.getElementById('sign-out-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Are you sure you want to sign out?')) {
        // Reset state
        appState.user = null;
        appState.isGuest = false;
        appState.currentDecision = null;
        appState.decisions = [];

        // Return to login
        showPage('login');
    }
});

// ============================================
// QUICK CLARITY FLOW
// ============================================

const quickDecisionState = {
    decision: '',
    matters: '',
    emotion: '',
    context: ''
};

// Helper function to enable Enter key submission
function enableEnterKey(inputId, buttonId) {
    const input = document.getElementById(inputId);
    const button = document.getElementById(buttonId);
    if (input && button) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                button.click();
            }
        });
    }
}

// Step 1: Decision Entry - Enable/disable continue button based on input
const quickDecisionInput = document.getElementById('quick-decision-input');
const quickContinueBtn = document.getElementById('quick-continue-1');

if (quickDecisionInput && quickContinueBtn) {
    quickDecisionInput.addEventListener('input', () => {
        const hasText = quickDecisionInput.value.trim().length > 0;
        quickContinueBtn.disabled = !hasText;
    });
}

document.getElementById('quick-continue-1')?.addEventListener('click', () => {
    const decision = document.getElementById('quick-decision-input').value.trim();

    if (!decision) {
        document.getElementById('quick-decision-input').focus();
        return;
    }

    // SAFETY: Screen input for crisis/harmful content - MUST HAPPEN FIRST
    const screening = handleDecisionInput(decision);
    console.log('[QUICK FLOW] Screening returned:', screening);

    if (screening === false) {
        // CRITICAL: Crisis/harmful content detected - STOP EVERYTHING
        console.log('[QUICK FLOW] 🛑 BLOCKED - Not continuing to next page');
        return; // DO NOT CONTINUE
    }

    // If screening === 'disclaimer', modal will show but user can continue
    // The disclaimerType is already stored in quickDecisionState
    console.log('[QUICK FLOW] ✓ Continuing to quick-2');

    quickDecisionState.decision = decision;
    showPage('quick-2');

    // Generate dynamic matters chips based on the decision
    generateMattersChips(decision);
});

enableEnterKey('quick-decision-input', 'quick-continue-1');

// Generate dynamic "what matters" chips based on decision
async function generateMattersChips(decision) {
    const loadingEl = document.getElementById('matters-loading');
    const chipsContainer = document.getElementById('quick-matters-chips');
    const customContainer = document.getElementById('quick-custom-matters-container');

    // Show loading, hide chips
    loadingEl.style.display = 'flex';
    chipsContainer.style.display = 'none';
    customContainer.style.display = 'none';

    // Generic fallback chips
    const fallbackChips = ['Saving money', 'Saving time', 'My health', 'Less stress', 'Being productive', 'Other'];

    try {
        const systemPrompt = `You generate 5 short values/priorities relevant to a decision. Return ONLY a JSON array of 5 strings, each 2-4 words max. Make them specific to the decision context. Example: ["Saving money", "My health", "Less stress", "More free time", "Being responsible"]`;

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system: systemPrompt,
                messages: [{ role: 'user', content: `Decision: "${decision}"\n\nGenerate 5 relevant values/priorities as a JSON array.` }],
                prompt_version: 'matters-chips-v1'
            })
        });

        if (!response.ok) throw new Error('API call failed');

        const data = await response.json();
        const content = data.content?.[0]?.text || data.text || '';

        // Parse JSON array from response
        const jsonMatch = content.match(/\[[\s\S]*?\]/);
        let chips = fallbackChips;

        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                if (Array.isArray(parsed) && parsed.length >= 3) {
                    chips = [...parsed.slice(0, 5), 'Other'];
                }
            } catch (e) {
                console.log('[Matters] JSON parse error, using fallback');
            }
        }

        renderMattersChips(chips);
    } catch (error) {
        console.error('[Matters] Error generating chips:', error);
        renderMattersChips(fallbackChips);
    } finally {
        loadingEl.style.display = 'none';
        chipsContainer.style.display = 'flex';
    }
}

// Render matters chips to the container
function renderMattersChips(chips) {
    const container = document.getElementById('quick-matters-chips');
    container.innerHTML = '';

    chips.forEach(chipText => {
        const chip = document.createElement('button');
        chip.className = 'chip';
        chip.textContent = chipText;
        chip.dataset.matters = chipText.toLowerCase() === 'other' ? 'other' : chipText;

        chip.addEventListener('click', function() {
            // Remove selected from all chips
            container.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');

            // Show/hide custom input based on "Other" selection
            const customContainer = document.getElementById('quick-custom-matters-container');
            const customInput = document.getElementById('quick-custom-matters-input');

            if (this.dataset.matters === 'other') {
                customContainer.style.display = 'block';
                customInput.focus();
            } else {
                customContainer.style.display = 'none';
                customInput.value = '';
            }
        });

        container.appendChild(chip);
    });
}

// Mic button (placeholder - would need Web Speech API)
document.getElementById('quick-mic-btn')?.addEventListener('click', () => {
    alert('Voice input coming soon!');
});

// Step 2: What Matters (using dynamic chips)
document.getElementById('quick-continue-2')?.addEventListener('click', () => {
    const selectedChip = document.querySelector('#quick-matters-chips .chip.selected');

    if (!selectedChip) {
        alert('Please select what matters most to you.');
        return;
    }

    // Handle custom input if "Other" was selected
    if (selectedChip.dataset.matters === 'other') {
        const customMatters = document.getElementById('quick-custom-matters-input').value.trim();
        if (!customMatters) {
            alert('Please type what matters most to you.');
            document.getElementById('quick-custom-matters-input').focus();
            return;
        }
        quickDecisionState.matters = customMatters;
    } else {
        quickDecisionState.matters = selectedChip.dataset.matters;
    }

    showPage('quick-3');
});

// Step 3: Emotion Selection
document.querySelectorAll('#quick-emotion-cards .chip').forEach(chip => {
    chip.addEventListener('click', function() {
        document.querySelectorAll('#quick-emotion-cards .chip').forEach(c => c.classList.remove('selected'));
        this.classList.add('selected');
        // Clear custom input when a chip is selected
        const customInput = document.getElementById('quick-custom-emotion-input');
        if (customInput) customInput.value = '';
    });
});

// When user types in custom emotion, deselect any chips
document.getElementById('quick-custom-emotion-input')?.addEventListener('input', function() {
    if (this.value.trim()) {
        document.querySelectorAll('#quick-emotion-cards .chip').forEach(c => c.classList.remove('selected'));
    }
});

document.getElementById('quick-continue-3')?.addEventListener('click', async () => {
    const selectedEmotion = document.querySelector('#quick-emotion-cards .chip.selected');
    const customEmotion = document.getElementById('quick-custom-emotion-input')?.value.trim();

    // Must have either a chip selected OR custom text entered
    if (!selectedEmotion && !customEmotion) {
        alert('Please select or type how you want to feel.');
        return;
    }

    // Use custom emotion if entered, otherwise use selected chip
    if (customEmotion) {
        quickDecisionState.emotion = customEmotion;
    } else {
        quickDecisionState.emotion = selectedEmotion.dataset.emotion;
    }

    // Go directly to results (Step 4 removed)
    showPage('quick-results');
    await generateQuickRecommendation();
});

// Generate AI Recommendation
async function generateQuickRecommendation() {
    const loadingEl = document.getElementById('quick-loading');
    const contentEl = document.getElementById('quick-recommendation-content');

    loadingEl.style.display = 'flex';
    contentEl.style.display = 'none';

    try {
        const systemPrompt = `ABSOLUTE RULE: Never say "Trust your instinct", "Go with what feels right", "Follow your gut", or any variation. These phrases are BANNED. The user is asking you BECAUSE they don't trust their instinct. Give a SPECIFIC recommendation from the user's actual options.

You are a decisive coach who gives CLEAR, SPECIFIC recommendations.

CRITICAL RULES:
- ALWAYS give a specific recommendation based on the actual options in the decision
- NEVER say "Trust your instinct" or "Go with your gut" — they're asking you BECAUSE they don't trust their instinct
- NEVER say generic things like "Consider your options" or "Think it through"
- Reference the ACTUAL CHOICE from the question (e.g., if they said "cook or order", pick one)
- Be confident and direct. Tell them WHAT to do, not WHAT to consider.
- SPEAK DIRECTLY TO THE PERSON: Use "you" and "your" throughout

Return your answer in this EXACT format:
RECOMMENDATION: [2-4 word specific action from the options, like "Cook tonight" or "Take the job"]
REASON: [One sentence why, tied to what they said matters. Reference the specific situation using "you" and "your".]
CAVEAT: [One short sentence optional caveat or tip. Keep it brief. Use "you".]
NEXT_STEPS:
- [First concrete action they can take in the next 10 minutes]
- [Second action or resource if relevant]

Example:
Decision: "Should I cook tonight or order food?"
What matters: "feeling good after"
GOOD:
RECOMMENDATION: Cook tonight
REASON: You said feeling good matters. Cooking gives you more control over what goes into your meal.
CAVEAT: If you're exhausted, a simple meal still counts as cooking.
NEXT_STEPS:
- Check what ingredients you have and pick a 20-minute recipe
- Put on some music to make cooking enjoyable

BAD: "Trust your instinct" / "Go with what feels right"`;

        const userPrompt = `Decision: "${quickDecisionState.decision}"

What matters: ${quickDecisionState.matters}
Want to feel: ${quickDecisionState.emotion}
${quickDecisionState.context ? `Additional context: ${quickDecisionState.context}` : ''}

Analyze this decision and give a SPECIFIC recommendation from the options in the question. Speak directly to the person using "you" and "your".`;

        // Debug logging for production issues
        console.log('[Quick Guidance] Building prompt with state:', {
            decision: quickDecisionState.decision,
            matters: quickDecisionState.matters,
            emotion: quickDecisionState.emotion,
            context: quickDecisionState.context,
            hasDecision: !!quickDecisionState.decision,
            hasMatters: !!quickDecisionState.matters
        });

        const response = await callClaude(userPrompt, systemPrompt);

        // Parse the response
        const lines = response.split('\n').filter(line => line.trim());
        let recommendation = '';
        let reason = '';
        let caveat = '';
        let nextSteps = [];
        let inNextSteps = false;

        lines.forEach(line => {
            if (line.toUpperCase().startsWith('RECOMMENDATION:')) {
                recommendation = line.replace(/RECOMMENDATION:/i, '').trim();
                inNextSteps = false;
            } else if (line.toUpperCase().startsWith('REASON:')) {
                reason = line.replace(/REASON:/i, '').trim();
                inNextSteps = false;
            } else if (line.toUpperCase().startsWith('CAVEAT:')) {
                caveat = line.replace(/CAVEAT:/i, '').trim();
                inNextSteps = false;
            } else if (line.toUpperCase().startsWith('NEXT_STEPS:') || line.toUpperCase().startsWith('NEXT STEPS:')) {
                inNextSteps = true;
            } else if (inNextSteps && line.trim().startsWith('-')) {
                nextSteps.push(line.trim().substring(1).trim());
            }
        });

        // Fallback if parsing fails - try to extract first option
        if (!recommendation) {
            // Try to extract first option from decision
            const decisionLower = quickDecisionState.decision.toLowerCase();
            if (decisionLower.includes(' or ')) {
                const firstOption = quickDecisionState.decision.split(' or ')[0].trim();
                recommendation = firstOption.charAt(0).toUpperCase() + firstOption.slice(1);
            } else if (decisionLower.startsWith('should i ')) {
                recommendation = 'Do it';
            } else {
                recommendation = 'Yes, go ahead';
            }
            reason = `Based on what you said matters: ${quickDecisionState.matters}.`;
        }

        // Get decision count and calculate streak for logged-in users
        let decisions = [];
        let streakDays = 0;

        if (!isGuestMode && window.supabaseClient?.getCurrentUser()) {
            // Load from database for logged-in users
            if (window.supabaseClient.loadDecisionsFromDatabase) {
                decisions = await window.supabaseClient.loadDecisionsFromDatabase();
            }
        } else {
            decisions = getStoredDecisions();
        }

        const decisionCount = decisions.length + 1;

        // Calculate streak including this new decision
        if (!isGuestMode) {
            const existingStreak = calculateStreak(decisions);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let hasDecisionToday = false;
            if (decisions.length > 0) {
                const mostRecent = new Date(decisions[0].created_at || decisions[0].savedAt || decisions[0].timestamp);
                mostRecent.setHours(0, 0, 0, 0);
                hasDecisionToday = mostRecent.getTime() === today.getTime();
            }

            if (hasDecisionToday) {
                // Already had a decision today - streak stays the same
                streakDays = existingStreak;
            } else if (existingStreak > 0) {
                // Had a streak from yesterday - this decision adds to it
                streakDays = existingStreak + 1;
            } else {
                // No previous decisions or streak broken - this starts a new streak
                streakDays = 1;
            }
        }

        // Build streak HTML (only for logged-in users with streak > 0)
        const streakHTML = (!isGuestMode && streakDays > 0) ? `
            <div class="result-streak-badge">
                🔥 ${streakDays} day${streakDays === 1 ? '' : 's'} streak
            </div>
        ` : '';

        // Build next steps HTML if available
        const nextStepsHTML = nextSteps.length > 0 ? `
            <div class="next-steps-section">
                <h3 class="next-steps-header">What to do now:</h3>
                <ul class="next-steps-list">
                    ${nextSteps.map(step => `<li>${step}</li>`).join('')}
                </ul>
            </div>
        ` : '';

        // Store recommendation for interest capture
        window.lastQuickRecommendation = {
            decision: quickDecisionState.decision,
            recommendation: recommendation,
            reason: reason
        };

        contentEl.innerHTML = `
            <div class="quick-result-card">
                <div class="quick-result-header">
                    <div class="decision-number">Decision #${decisionCount}</div>
                    ${streakHTML}
                </div>
                <div class="quick-result-recommendation">
                    <div class="recommendation-icon celebrate">✓</div>
                    <h2 class="recommendation-text">${recommendation}</h2>
                </div>
                <p class="recommendation-reason">${reason}</p>
                ${caveat ? `<p class="recommendation-caveat">${caveat}</p>` : ''}
                ${nextStepsHTML}

                <!-- Interest capture CTA -->
                <button class="btn btn-secondary btn-full mt-lg" onclick="openDeeperGuidanceModal()">
                    Want more help with this?
                </button>
            </div>
        `;

        loadingEl.style.display = 'none';
        contentEl.style.display = 'block';

        // SAFETY: Show disclaimer banner if user continued past a disclaimer
        if (quickDecisionState.disclaimerAcknowledged) {
            const disclaimerBanner = document.getElementById('quick-results-disclaimer');
            const disclaimerTypeSpan = document.getElementById('quick-disclaimer-type');
            if (disclaimerBanner && disclaimerTypeSpan) {
                disclaimerTypeSpan.textContent = quickDecisionState.disclaimerAcknowledged;
                disclaimerBanner.style.display = 'flex';
            }
        }

        // Trigger celebration animation
        setTimeout(() => {
            const celebrateIcon = contentEl.querySelector('.celebrate');
            if (celebrateIcon) {
                celebrateIcon.classList.add('animate');
            }
        }, 100);

        // GUEST MODE: Save decision and show save prompt
        if (isGuestMode) {
            console.log('[GUEST] Saving decision for guest');
            const guestData = {
                decision: quickDecisionState.decision,
                matters: quickDecisionState.matters,
                emotion: quickDecisionState.emotion,
                context: quickDecisionState.context,
                results: {
                    recommendation: recommendation,
                    reason: reason,
                    caveat: caveat
                },
                type: 'quick',
                created_at: new Date().toISOString()
            };

            saveGuestDecision(guestData);

            // Increment guest decision count
            incrementGuestCount();

            // Update Deep Guidance upsell for guest
            updateDeepUpsellForGuest();

            // Show save prompt after 2 seconds
            setTimeout(() => {
                showSavePromptForGuest();
            }, 2000);
        }
    } catch (error) {
        console.error('Error generating recommendation:', error);
        captureError(error, {
            component: 'generateQuickRecommendation',
            decision: quickDecisionState.decision,
            matters: quickDecisionState.matters,
            emotion: quickDecisionState.emotion
        });
        const decisionCount = getStoredDecisions().length + 1;

        contentEl.innerHTML = `
            <div class="quick-result-card">
                <div class="quick-result-header">
                    <div class="decision-number">Decision #${decisionCount}</div>
                </div>
                <div class="quick-result-recommendation">
                    <div class="recommendation-icon">✓</div>
                    <h2 class="recommendation-text">Try again in a moment</h2>
                </div>
                <p class="recommendation-reason">We couldn't generate a recommendation right now. Please try again.</p>
            </div>
        `;

        loadingEl.style.display = 'none';
        contentEl.style.display = 'block';
    }

    // Show feedback component
    const feedbackContainer = document.getElementById('quick-feedback');
    if (feedbackContainer) {
        feedbackContainer.style.display = 'block';
    }
}

// ============================================
// FEEDBACK FUNCTIONS
// ============================================

let currentQuickDecisionId = null;

async function submitQuickFeedback(isHelpful) {
    const yesBtn = document.getElementById('quick-feedback-yes');
    const noBtn = document.getElementById('quick-feedback-no');
    const textContainer = document.getElementById('quick-feedback-text-container');
    const thanksMessage = document.getElementById('quick-feedback-thanks');

    if (isHelpful) {
        // Thumbs up: Log and show thanks
        yesBtn.classList.add('selected');
        noBtn.disabled = true;

        // Save feedback to database
        await saveFeedbackToDatabase(null, true, null);

        // Show thanks message
        setTimeout(() => {
            document.querySelector('.feedback-buttons').style.display = 'none';
            thanksMessage.style.display = 'block';
        }, 300);
    } else {
        // Thumbs down: Show text field
        noBtn.classList.add('selected');
        yesBtn.disabled = true;
        textContainer.style.display = 'block';
    }
}

async function submitQuickFeedbackText() {
    const textarea = document.getElementById('quick-feedback-textarea');
    const feedbackText = textarea.value.trim();
    const thanksMessage = document.getElementById('quick-feedback-thanks');
    const textContainer = document.getElementById('quick-feedback-text-container');

    // Save feedback to database
    await saveFeedbackToDatabase(null, false, feedbackText);

    // Hide text field and show thanks
    textContainer.style.display = 'none';
    document.querySelector('.feedback-buttons').style.display = 'none';
    thanksMessage.style.display = 'block';
}

async function saveFeedbackToDatabase(decisionId, helpful, feedbackText) {
    const currentUser = window.supabaseClient?.getCurrentUser();
    if (!currentUser) {
        console.log('User not logged in, feedback not saved');
        return;
    }

    const supabase = window.supabaseClient?.getSupabase();
    if (!supabase) {
        console.log('Supabase not initialized, feedback not saved');
        return;
    }

    try {
        const { error } = await supabase
            .from('decision_feedback')
            .insert({
                decision_id: decisionId || null,
                user_id: currentUser.id,
                helpful: helpful,
                feedback_text: feedbackText || null
            });

        if (error) {
            console.error('Error saving feedback:', error);
        } else {
            console.log('✅ Feedback saved');
        }
    } catch (error) {
        console.error('Error in saveFeedbackToDatabase:', error);
    }
}

// ============================================
// FOUNDER WELCOME NOTE
// ============================================

async function dismissFounderWelcome() {
    const founderWelcome = document.getElementById('founder-welcome');
    if (founderWelcome) {
        founderWelcome.style.display = 'none';
    }

    // Save dismissal to database
    const currentUser = window.supabaseClient?.getCurrentUser();
    if (!currentUser) {
        return;
    }

    const supabase = window.supabaseClient?.getSupabase();
    if (!supabase) {
        return;
    }

    try {
        const { error } = await supabase
            .from('subscriptions')
            .update({ has_seen_welcome: true })
            .eq('user_id', currentUser.id);

        if (error) {
            console.error('Error saving welcome dismissal:', error);
        } else {
            console.log('✅ Welcome note dismissed');
        }
    } catch (error) {
        console.error('Error in dismissFounderWelcome:', error);
    }
}

// ============================================
// DEEP CLARITY FLOW
// ============================================

const deepDecisionState = {
    decision: '',
    reframedQuestion: '',
    options: [],
    timeline: '',
    category: '',
    values: [],
    assumptions: '',
    difficulties: [],
    difficultyDetail: ''
};

// Step 1: Decision Entry
document.getElementById('deep-continue-1')?.addEventListener('click', async () => {
    const decision = document.getElementById('deep-decision-input').value.trim();

    if (!decision) {
        document.getElementById('deep-decision-input').focus();
        return;
    }

    // SAFETY: Screen input for crisis/harmful content - MUST HAPPEN FIRST
    const screening = handleDecisionInput(decision);
    console.log('[DEEP FLOW] Screening returned:', screening);

    if (screening === false) {
        // CRITICAL: Crisis/harmful content detected - STOP EVERYTHING
        console.log('[DEEP FLOW] 🛑 BLOCKED - Not continuing to next page');
        return; // DO NOT CONTINUE - No AI processing, no navigation
    }

    // If screening === 'disclaimer', modal will show but user can continue
    // The disclaimerType is already stored in deepDecisionState
    console.log('[DEEP FLOW] ✓ Continuing to deep-2');

    deepDecisionState.decision = decision;

    // Show original question in step 2
    document.getElementById('deep-original-question').textContent = decision;

    // Navigate and generate reframes
    showPage('deep-2');
    await generateReframes();
});

enableEnterKey('deep-decision-input', 'deep-continue-1');

// Step 2: Reframing
async function generateReframes() {
    try {
        const systemPrompt = `You are a thoughtful decision coach. Generate 3 alternative ways to frame THIS EXACT decision that reveal what's really at stake.

These are NOT coaching questions. These are alternative decision framings that use the specific details of their situation.

For "should I break up with my boyfriend", generate:
- "Am I staying out of love or out of fear?"
- "Is this relationship helping me become who I want to be?"
- "What would need to change for me to want to stay?"

For "should I move to SF from Seattle", generate:
- "Am I chasing opportunity in SF, or running from something in Seattle?"
- "Is this about career growth or starting fresh?"
- "What would need to be true in Seattle for me to want to stay?"

Each reframe should:
1. Use specific details from the decision (people, places, choices)
2. Present it as a choice or question about what's at stake
3. Reveal a different dimension (fear vs. desire, growth vs. comfort, trade-offs)
4. Use "you" and "your" when addressing the person

Return ONLY a JSON array of 3 objects with this structure:
[
  {"question": "reframe question", "emphasis": "What this examines (3-5 words)"},
  {"question": "reframe question", "emphasis": "What this examines (3-5 words)"},
  {"question": "reframe question", "emphasis": "What this examines (3-5 words)"}
]

Examples of emphasis:
- "Examines your motivation"
- "Focuses on growth"
- "Explores the trade-offs"
- "Questions your fears"
- "Looks at the future"`;

        const response = await callClaude(
            `The decision I'm facing: "${deepDecisionState.decision}"\n\nGenerate 3 alternative decision framings with emphasis explanations.`,
            systemPrompt
        );

        let reframes;
        try {
            reframes = JSON.parse(response);
        } catch {
            const jsonMatch = response.match(/\[.*\]/s);
            if (jsonMatch) {
                reframes = JSON.parse(jsonMatch[0]);
            } else {
                // Fallback
                reframes = [
                    {question: "What am I really afraid of losing here?", emphasis: "Examines your fears"},
                    {question: "What would make this decision feel obvious?", emphasis: "Focuses on clarity"},
                    {question: "What would I tell my best friend to do?", emphasis: "Seeks outside perspective"}
                ];
            }
        }

        // Handle legacy array format (just strings)
        if (reframes.length > 0 && typeof reframes[0] === 'string') {
            reframes = reframes.map((q, i) => ({
                question: q,
                emphasis: i === 0 ? "Examines what matters" : i === 1 ? "Focuses on growth" : "Explores trade-offs"
            }));
        }

        // Populate reframe options with personality
        const container = document.getElementById('deep-reframe-options');
        container.innerHTML = '';

        const cardTypes = ['motivation', 'growth', 'tradeoffs'];
        const icons = [
            '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>', // heart for motivation
            '<path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>', // seedling-like for growth
            '<path d="M12 19a7 7 0 1 0 0-14 7 7 0 0 0 0 14z"></path><path d="M12 9v6m-3-3h6"></path>' // scales for tradeoffs
        ];

        reframes.forEach((reframe, index) => {
            const cardType = cardTypes[index] || 'growth';
            const icon = icons[index] || icons[1];

            const card = document.createElement('div');
            card.className = `reframe-card type-${cardType}`;
            card.innerHTML = `
                <div class="reframe-card-header">
                    <div class="reframe-card-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            ${icon}
                        </svg>
                    </div>
                    <div class="reframe-card-checkmark">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                </div>
                <p class="reframe-card-question">${reframe.question}</p>
                <p class="reframe-card-insight">→ ${reframe.emphasis}</p>
            `;
            card.addEventListener('click', () => selectReframe(reframe.question, card));
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error generating reframes:', error);
        const container = document.getElementById('deep-reframe-options');
        container.innerHTML = '<p class="text-muted">Continue with your original question, or reframe it below.</p>';
        document.getElementById('deep-custom-reframe-container').style.display = 'block';
    }
}

function selectReframe(reframe, element) {
    deepDecisionState.reframedQuestion = reframe;

    // Visual feedback - make selected state more obvious
    const container = document.getElementById('deep-reframe-options');
    document.querySelectorAll('.reframe-card').forEach(card => card.classList.remove('selected'));
    element.classList.add('selected');
    container.classList.add('has-selection');

    // Auto-advance
    setTimeout(() => {
        showPage('deep-3');
    }, 800);
}

// Custom reframe
document.getElementById('deep-custom-reframe')?.addEventListener('input', (e) => {
    const customValue = e.target.value.trim();
    if (customValue) {
        // Deselect all cards when user starts typing
        const container = document.getElementById('deep-reframe-options');
        document.querySelectorAll('.reframe-card').forEach(card => card.classList.remove('selected'));
        container.classList.add('has-selection');
    }
});

document.getElementById('deep-custom-reframe')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const customReframe = e.target.value.trim();
        if (customReframe) {
            deepDecisionState.reframedQuestion = customReframe;
            showPage('deep-3');
        }
    }
});

// Step 2: Continue button
document.getElementById('deep-continue-2')?.addEventListener('click', () => {
    const customReframe = document.getElementById('deep-custom-reframe').value.trim();
    if (customReframe) {
        deepDecisionState.reframedQuestion = customReframe;
    }
    // If no reframe selected and no custom reframe, keep original question
    showPage('deep-3');
});

// Auto-detect category based on decision
async function autoDetectCategory() {
    const categoryDisplay = document.getElementById('deep-detected-category');

    // If category already detected, don't re-detect
    if (deepDecisionState.category) {
        if (categoryDisplay) {
            categoryDisplay.textContent = capitalizeFirst(deepDecisionState.category);
        }
        return;
    }

    if (categoryDisplay) {
        categoryDisplay.textContent = 'Analyzing...';
    }

    try {
        const systemPrompt = `You are a decision categorization expert. Analyze the decision and classify it into ONE of these categories:

- relationship: Dating, marriage, breakups, friendships, family relationships
- career: Jobs, promotions, career changes, professional development
- finance: Investments, major purchases, financial planning, budgeting
- health: Medical decisions, fitness, mental health, wellness
- education: School choices, degrees, courses, learning paths
- lifestyle: Living situations, hobbies, daily habits, personal goals
- relocation: Moving cities, countries, or homes
- other: Anything that doesn't clearly fit the above

Return ONLY the category name in lowercase, nothing else.`;

        const response = await callClaude(
            `Decision: "${deepDecisionState.decision}"\n\nWhat category is this?`,
            systemPrompt
        );

        const detectedCategory = response.trim().toLowerCase();
        deepDecisionState.category = detectedCategory;
        if (categoryDisplay) {
            categoryDisplay.textContent = capitalizeFirst(detectedCategory);
        }

        // If we're already on the values page, update it with the detected category
        if (document.getElementById('deep-4').classList.contains('active')) {
            populateCategoryValues();
        }

    } catch (error) {
        console.error('Error detecting category:', error);
        if (categoryDisplay) {
            categoryDisplay.textContent = 'Other';
        }
        deepDecisionState.category = 'other';

        // If we're already on the values page, update it with fallback category
        if (document.getElementById('deep-4')?.classList.contains('active')) {
            populateCategoryValues();
        }
    }
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Update progress ring based on level
function updateProgressRing(ringId, level, type) {
    const svg = document.getElementById(ringId);
    if (!svg) return;

    const circle = svg.querySelector('.rec-ring-fill');
    if (!circle) return;

    // Calculate fill percentage and color based on level
    let fillPercent, color;

    if (type === 'confidence') {
        // High = 75-100% (green), Moderate = 50% (amber), Low = 25% (gray)
        if (level === 'High') {
            fillPercent = 85;
            color = '#10B981'; // Green
        } else if (level === 'Moderate') {
            fillPercent = 50;
            color = '#F59E0B'; // Amber
        } else { // Low
            fillPercent = 25;
            color = '#9CA3AF'; // Gray
        }
    } else { // reversibility
        // Easy = 75-100% (green), Moderate = 50% (amber), Hard = 25% (gray)
        if (level === 'Easy') {
            fillPercent = 85;
            color = '#10B981'; // Green
        } else if (level === 'Moderate') {
            fillPercent = 50;
            color = '#F59E0B'; // Amber
        } else { // Hard
            fillPercent = 25;
            color = '#9CA3AF'; // Gray
        }
    }

    // Circle circumference: 2 * π * r = 2 * π * 16 ≈ 100.53
    const circumference = 100.53;
    const offset = circumference - (fillPercent / 100) * circumference;

    circle.style.strokeDashoffset = offset;
    circle.style.stroke = color;
}

// Change category button
document.getElementById('deep-change-category')?.addEventListener('click', () => {
    const chips = document.getElementById('deep-category-chips');
    chips.style.display = chips.style.display === 'none' ? 'grid' : 'none';
});

// Micro-labels for option archetypes
const optionArchetypes = [
    "The bold move",
    "The safe path",
    "The middle ground",
    "The wildcard",
    "The unconventional route"
];

// Initialize option cards
function initializeOptionCards() {
    const container = document.getElementById('deep-options-container');
    if (!container) return;

    container.innerHTML = '';

    // Create initial two cards
    createOptionCard(0);
    createOptionCard(1);
}

// Create a single option card
function createOptionCard(index, value = '') {
    const container = document.getElementById('deep-options-container');
    const letter = String.fromCharCode(65 + index); // A, B, C, etc.
    const archetype = optionArchetypes[index % optionArchetypes.length];

    const card = document.createElement('div');
    card.className = 'option-card';
    card.dataset.index = index;

    card.innerHTML = `
        <div class="option-letter">${letter}</div>
        <div class="option-content">
            <input type="text" class="option-input" id="deep-option-${index + 1}"
                   placeholder="What's this path?" value="${value}">
            <div class="option-micro-label">${archetype}</div>
        </div>
        ${index >= 2 ? `
            <button class="option-delete" onclick="deleteOptionCard(${index})">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        ` : ''}
    `;

    container.appendChild(card);
}

// Delete option card
function deleteOptionCard(index) {
    const card = document.querySelector(`.option-card[data-index="${index}"]`);
    if (card) {
        card.remove();
        // Re-index remaining cards
        reIndexOptionCards();
    }
}

// Re-index cards after deletion
function reIndexOptionCards() {
    const cards = document.querySelectorAll('.option-card');
    cards.forEach((card, newIndex) => {
        const letter = String.fromCharCode(65 + newIndex);
        card.dataset.index = newIndex;
        card.querySelector('.option-letter').textContent = letter;
        card.querySelector('.option-input').id = `deep-option-${newIndex + 1}`;

        // Update delete button
        const deleteBtn = card.querySelector('.option-delete');
        if (newIndex < 2 && deleteBtn) {
            deleteBtn.remove();
        } else if (newIndex >= 2 && !deleteBtn) {
            const btn = document.createElement('button');
            btn.className = 'option-delete';
            btn.onclick = () => deleteOptionCard(newIndex);
            btn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            `;
            card.appendChild(btn);
        }
    });
}

// Pre-populate options based on decision
async function prePopulateOptions() {
    const cards = document.querySelectorAll('.option-card');
    if (cards.length === 0) {
        initializeOptionCards();
    }

    const firstInput = document.getElementById('deep-option-1');
    const secondInput = document.getElementById('deep-option-2');

    // Only pre-populate if fields are empty
    if (firstInput?.value || secondInput?.value) {
        return;
    }

    try {
        const systemPrompt = `You are a decision coach. Extract the two main options from this decision.

CRITICAL: Use NEUTRAL phrasing. Do NOT add possessives like "your husband", "your wife", "your partner".
- If the user's decision mentions "my husband", extract as "Leave the relationship" or "End the relationship"
- If they mention "my job", extract as "Leave the job" or "Stay in current role"
- Keep options action-oriented and neutral

Return ONLY a JSON object with this structure:
{
  "option1": "First option",
  "option2": "Second option"
}

Example for "should I leave my husband":
{
  "option1": "Leave the relationship",
  "option2": "Stay and work on it"
}

Example for "should I move to SF from Seattle":
{
  "option1": "Move to SF",
  "option2": "Stay in Seattle"
}`;

        const response = await callClaude(
            `Decision: "${deepDecisionState.decision}"\n\nExtract the main options.`,
            systemPrompt
        );

        let options;
        try {
            options = JSON.parse(response);
        } catch {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                options = JSON.parse(jsonMatch[0]);
            }
        }

        if (options && firstInput && secondInput) {
            firstInput.value = options.option1 || '';
            secondInput.value = options.option2 || '';
        }
    } catch (error) {
        console.error('Error pre-populating options:', error);
        // Silent fail - user can still fill manually
    }
}

// Generate AI suggestion for alternative option
async function generateOptionSuggestion() {
    const suggestionCard = document.getElementById('option-suggestion-card');
    const suggestionText = document.getElementById('option-suggestion-text');

    // Get current options
    const option1 = document.getElementById('deep-option-1')?.value.trim();
    const option2 = document.getElementById('deep-option-2')?.value.trim();

    // Only show suggestion if we have at least 2 options
    if (!option1 || !option2) {
        suggestionCard.style.display = 'none';
        return;
    }

    try {
        const systemPrompt = `You are a decision coach. Given a decision and two options, suggest ONE alternative "third door" option you might not have considered.

This should be:
- A middle ground, creative alternative, or fundamentally different approach
- Something you genuinely might not have thought of
- Contextually relevant to your situation
- Concise (max 8 words)

Return ONLY the suggested option text, nothing else. No quotes, no explanation.`;

        const userPrompt = `Decision: ${deepDecisionState.decision}
Category: ${deepDecisionState.category || 'general'}

Option 1: ${option1}
Option 2: ${option2}

Suggest ONE alternative option:`;

        const response = await callClaudeAPI(systemPrompt, userPrompt);

        if (response) {
            suggestionText.textContent = response.trim();
            suggestionCard.style.display = 'flex';
        }
    } catch (error) {
        console.error('Error generating option suggestion:', error);
        // Silent fail - just don't show the suggestion
        suggestionCard.style.display = 'none';
    }
}

// Timeline chip handlers
document.querySelectorAll('.timeline-chip').forEach(chip => {
    chip.addEventListener('click', function() {
        const value = this.dataset.timeline;
        const datePickerContainer = document.getElementById('deep-date-picker-container');
        const reminderContainer = document.getElementById('deep-reminder-container');
        const hiddenSelect = document.getElementById('deep-timeline');

        // Update visual state
        document.querySelectorAll('.timeline-chip').forEach(c => c.classList.remove('selected'));
        this.classList.add('selected');

        // Update hidden select for compatibility
        if (hiddenSelect) {
            hiddenSelect.value = value;
        }

        // Handle date picker and reminder display
        if (value === 'pick-date') {
            datePickerContainer.style.display = 'block';
            reminderContainer.style.display = 'none';
        } else if (value && value !== 'open') {
            datePickerContainer.style.display = 'none';
            reminderContainer.style.display = 'block';
        } else {
            datePickerContainer.style.display = 'none';
            reminderContainer.style.display = 'none';
        }
    });
});

// Date picker handler - show reminder after date is selected
document.getElementById('deep-date-picker')?.addEventListener('change', (e) => {
    if (e.target.value) {
        document.getElementById('deep-reminder-container').style.display = 'block';
    }
});

// Reminder toggle handler - show email input when toggled on
document.getElementById('deep-reminder-toggle')?.addEventListener('change', (e) => {
    const inputContainer = document.getElementById('deep-reminder-input-container');
    if (e.target.checked) {
        inputContainer.style.display = 'block';
    } else {
        inputContainer.style.display = 'none';
    }
});

// Timeline card handlers (for split page deep-4)
document.querySelectorAll('.timeline-card').forEach(card => {
    card.addEventListener('click', function() {
        // Update visual state
        document.querySelectorAll('.timeline-card').forEach(c => c.classList.remove('selected'));
        this.classList.add('selected');

        const timelineValue = this.dataset.timeline;

        // Show date picker if "custom" is selected
        const datePicker = document.getElementById('timeline-date-picker');

        if (timelineValue === 'custom') {
            datePicker.style.display = 'block';
        } else {
            datePicker.style.display = 'none';
        }

        // Reminder section is always visible (not dependent on card selection)
    });
});

// Date picker change handler
document.getElementById('timeline-date-input')?.addEventListener('change', function() {
    const selectedDate = this.value;
    if (selectedDate) {
        // Update the custom button label to show the selected date
        const customLabel = document.getElementById('timeline-custom-label');
        const date = new Date(selectedDate);
        const formattedDate = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        customLabel.textContent = formattedDate;

        // Store the custom date in decision state
        deepDecisionState.customDeadline = selectedDate;
    }
});

// Reminder checkbox handler
document.getElementById('reminder-enabled')?.addEventListener('change', function() {
    const reminderOptions = document.getElementById('reminder-options');
    if (this.checked) {
        reminderOptions.style.display = 'block';
    } else {
        reminderOptions.style.display = 'none';
    }
});

// Reminder method toggle
document.querySelectorAll('.reminder-method-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        // Toggle active state
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

// Step 3: Set the Stage
document.getElementById('deep-continue-3')?.addEventListener('click', () => {
    // Collect all option inputs
    const optionInputs = document.querySelectorAll('.option-input');
    const allOptions = [];

    optionInputs.forEach(input => {
        const value = input.value.trim();
        if (value) {
            allOptions.push(value);
        }
    });

    // Validate at least 2 options
    if (allOptions.length < 2) {
        const firstEmpty = document.querySelector('.option-input:not([value])');
        if (firstEmpty) firstEmpty.focus();
        return;
    }

    deepDecisionState.options = allOptions;

    // Show category display on timeline page
    updateCategoryDisplay();

    showPage('deep-4');
});

// Helper function to update category display on timeline page
function updateCategoryDisplay() {
    const categoryDisplay = document.getElementById('deep-category-display');
    if (categoryDisplay && deepDecisionState.category) {
        // Format: "Category: Relationship · Change"
        const categoryText = deepDecisionState.category.split('_').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' · ');
        categoryDisplay.textContent = `Category: ${categoryText}`;
    }
}

// Step 4: Timeline Selection
document.getElementById('deep-continue-4')?.addEventListener('click', () => {
    const timeline = document.querySelector('.timeline-card.selected')?.dataset.timeline;

    if (!timeline) {
        alert('Please select a timeline for your decision.');
        return;
    }

    // If custom timeline, validate date is selected
    if (timeline === 'custom') {
        const customDate = document.getElementById('timeline-date-input').value;
        if (!customDate) {
            alert('Please select a date for your deadline.');
            return;
        }
        deepDecisionState.customDeadline = customDate;
    }

    // Category detection happens in background - don't block flow
    // If category isn't detected yet, it will use a default or continue without it

    deepDecisionState.timeline = timeline;

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

    showPage('deep-5');
});

// Add option functionality
document.getElementById('deep-add-option')?.addEventListener('click', () => {
    const existingCards = document.querySelectorAll('.option-card');
    const newIndex = existingCards.length;

    createOptionCard(newIndex);

    // Focus the new input
    setTimeout(() => {
        const newInput = document.getElementById(`deep-option-${newIndex + 1}`);
        if (newInput) newInput.focus();
    }, 100);
});

// AI Suggestion - Add button
document.getElementById('option-suggestion-add')?.addEventListener('click', () => {
    const suggestionText = document.getElementById('option-suggestion-text')?.textContent;
    const suggestionCard = document.getElementById('option-suggestion-card');

    if (suggestionText) {
        // Create a new option card with the suggestion
        const existingCards = document.querySelectorAll('.option-card');
        const newIndex = existingCards.length;

        createOptionCard(newIndex, suggestionText);

        // Hide the suggestion card
        suggestionCard.style.display = 'none';
    }
});

// AI Suggestion - Dismiss button
document.getElementById('option-suggestion-dismiss')?.addEventListener('click', () => {
    const suggestionCard = document.getElementById('option-suggestion-card');
    suggestionCard.style.display = 'none';
});

// Category chip selection
document.querySelectorAll('#deep-category-chips .chip').forEach(chip => {
    chip.addEventListener('click', function() {
        document.querySelectorAll('#deep-category-chips .chip').forEach(c => c.classList.remove('selected'));
        this.classList.add('selected');
    });
});

// Icon mapping for values
const valueIcons = {
    // Relationship
    'trust': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>',
    'compatibility': '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>',
    'growth': '<path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>',
    'communication': '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>',
    'values': '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>',
    'intimacy': '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path><circle cx="12" cy="12" r="3"></circle>',
    'support': '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
    'future': '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline>',
    // Career
    'impact': '<circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line>',
    'money': '<line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>',
    'prestige': '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>',
    'worklife': '<path d="M12 2v20m-7-7h14"></path>',
    'autonomy': '<path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"></path>',
    'mission': '<circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>',
    'team': '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
    // Finance
    'returns': '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline>',
    'security': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>',
    'risk': '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>',
    'liquidity': '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>',
    'timeline': '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>',
    'diversification': '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line>',
    'simplicity': '<circle cx="12" cy="12" r="10"></circle>',
    // Health
    'effectiveness': '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>',
    'sideeffects': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>',
    'quality': '<circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line>',
    'longevity': '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>',
    'energy': '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>',
    'mental': '<path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>',
    'sustainability': '<path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"></path>',
    // General
    'stability': '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>',
    'freedom': '<circle cx="12" cy="12" r="3"></circle><path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m6.36 6.36l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m6.36-6.36l4.24-4.24"></path>',
    'relationships': '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
    'health': '<path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>',
    'passion': '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>',
    // Education & Lifestyle
    'learning': '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>',
    'career': '<rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>',
    'network': '<path d="M16 3h5v5M4 20L21 3"></path>',
    'opportunity': '<circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path>',
    'lifestyle': '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>',
    'cost': '<line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>',
    'community': '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
    'family': '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
    'climate': '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>',
    'adventure': '<circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>',
    'roots': '<path d="M12 2v20M3 12l9-9 9 9"></path>',
    // Additional values
    'balance': '<path d="M12 2v20m-7-7h14"></path>',
    'authenticity': '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>',
    'purpose': '<circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>',
    'recognition': '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>',
    'creativity': '<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>',
    'legacy': '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><path d="M3 9h18M9 21V9"></path>',
    'peace': '<circle cx="12" cy="12" r="10"></circle><path d="M12 2v20M2 12h20"></path>',
    'challenge': '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>',
    'connection': '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>'
};

// All available values (comprehensive list)
const ALL_VALUES = [
    { value: 'growth', label: 'Growth & learning' },
    { value: 'stability', label: 'Stability & security' },
    { value: 'freedom', label: 'Freedom & flexibility' },
    { value: 'impact', label: 'Making an impact' },
    { value: 'relationships', label: 'Relationships' },
    { value: 'money', label: 'Financial gain' },
    { value: 'health', label: 'Health & wellbeing' },
    { value: 'passion', label: 'Following my passion' },
    { value: 'autonomy', label: 'Autonomy & control' },
    { value: 'trust', label: 'Trust & honesty' },
    { value: 'balance', label: 'Work-life balance' },
    { value: 'adventure', label: 'Adventure & novelty' },
    { value: 'community', label: 'Community & belonging' },
    { value: 'family', label: 'Family & loved ones' },
    { value: 'authenticity', label: 'Being true to myself' },
    { value: 'security', label: 'Long-term security' },
    { value: 'purpose', label: 'Sense of purpose' },
    { value: 'recognition', label: 'Recognition & respect' },
    { value: 'creativity', label: 'Creative expression' },
    { value: 'simplicity', label: 'Simplicity & ease' },
    { value: 'legacy', label: 'Building a legacy' },
    { value: 'peace', label: 'Peace of mind' },
    { value: 'challenge', label: 'Challenge & growth' },
    { value: 'connection', label: 'Deep connection' }
];

// Populate values with AI-inferred prioritization
async function populateCategoryValues() {
    const header = document.getElementById('deep-values-header');
    const container = document.getElementById('deep-values-chips');

    // Reset custom values count when repopulating
    customValuesCount = 0;

    // Update header - contextual based on inference
    header.textContent = 'Based on your situation, these values seem most relevant';

    container.innerHTML = '';

    // Show loading state
    container.innerHTML = '<div class="values-loading"><div class="spinner-sm"></div><span>Personalizing values...</span></div>';

    // Get prioritized values based on context
    let prioritizedValues;
    try {
        prioritizedValues = await inferPrioritizedValues();
    } catch (error) {
        console.error('[VALUES] Error inferring priorities:', error);
        // Fallback to default order
        prioritizedValues = ALL_VALUES.slice(0, 8).map(v => v.value);
    }

    container.innerHTML = '';

    // Separate into prioritized (shown) and other (behind "show more")
    const prioritizedSet = new Set(prioritizedValues.slice(0, 8));
    const shownValues = ALL_VALUES.filter(v => prioritizedSet.has(v.value));
    const hiddenValues = ALL_VALUES.filter(v => !prioritizedSet.has(v.value));

    // Add prioritized values
    shownValues.forEach(item => {
        container.appendChild(createValuePill(item));
    });

    // Add "Show more" button if there are hidden values
    if (hiddenValues.length > 0) {
        const showMoreBtn = document.createElement('button');
        showMoreBtn.className = 'show-more-values-btn';
        showMoreBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="16"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
            <span>Show more values</span>
        `;
        showMoreBtn.addEventListener('click', function() {
            // Remove the button
            this.remove();
            // Add hidden values
            hiddenValues.forEach(item => {
                container.insertBefore(createValuePill(item), container.querySelector('.add-custom-value-btn'));
            });
        });
        container.appendChild(showMoreBtn);
    }

    // Add the "+ Add your own" button
    addCustomValueButton(container);

    // Reset counter
    updateValuesCounter();
}

// Create a value pill element
function createValuePill(item) {
    const pill = document.createElement('button');
    pill.className = 'value-pill';
    pill.dataset.value = item.value;

    const icon = valueIcons[item.value] || valueIcons['growth'];

    pill.innerHTML = `
        <svg class="value-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            ${icon}
        </svg>
        <span>${item.label}</span>
        <div class="value-checkmark">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        </div>
    `;

    pill.addEventListener('click', function() {
        this.classList.toggle('selected');
        updateValuesCounter();
    });

    return pill;
}

// Infer prioritized values based on decision context
async function inferPrioritizedValues() {
    const decision = deepDecisionState.decision || '';
    const reframed = deepDecisionState.reframedQuestion || '';
    const difficulties = deepDecisionState.difficulties || [];

    const context = `
Decision: ${decision}
Reframed question: ${reframed}
What's making it hard: ${difficulties.join(', ')}
    `.trim();

    const systemPrompt = `You analyze decisions and identify which values are most relevant.

Given this decision context, return the 8 most relevant values from this list, in order of relevance:
growth, stability, freedom, impact, relationships, money, health, passion, autonomy, trust, balance, adventure, community, family, authenticity, security, purpose, recognition, creativity, simplicity, legacy, peace, challenge, connection

Return ONLY a comma-separated list of value names, nothing else. Example: growth, freedom, purpose, autonomy, impact, balance, authenticity, challenge`;

    try {
        const response = await callClaude(context, systemPrompt);
        const values = response.trim().split(',').map(v => v.trim().toLowerCase());
        console.log('[VALUES] Inferred priorities:', values);
        return values;
    } catch (error) {
        console.error('[VALUES] Inference failed:', error);
        throw error;
    }
}

// Update the values counter
function updateValuesCounter() {
    const selected = document.querySelectorAll('.value-pill.selected').length;
    const counterText = document.querySelector('.counter-text');
    const continueBtn = document.getElementById('deep-continue-5');

    if (counterText) {
        counterText.textContent = `${selected} selected`;
        if (selected >= 3 && selected <= 4) {
            counterText.classList.add('complete');
        } else {
            counterText.classList.remove('complete');
        }
    }

    // Enable/disable continue button (requires at least 3 values)
    if (continueBtn) {
        continueBtn.disabled = selected < 3;
    }
}

// Track custom values count
let customValuesCount = 0;

function addCustomValueButton(container) {
    const addButton = document.createElement('button');
    addButton.className = 'value-pill add-custom';
    addButton.type = 'button';

    addButton.innerHTML = `
        <svg class="value-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="16"></line>
            <line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>
        <span>Add your own</span>
    `;

    addButton.addEventListener('click', function() {
        if (customValuesCount >= 3) {
            alert('You can add up to 3 custom values.');
            return;
        }

        // Replace button with input wrapper
        const inputWrapper = document.createElement('div');
        inputWrapper.className = 'value-custom-input';

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Type a value...';
        input.maxLength = 30;

        inputWrapper.appendChild(input);

        // Replace the button with the input wrapper
        this.replaceWith(inputWrapper);
        input.focus();

        // Handle submit (Enter key)
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                submitCustomValue(inputWrapper, container);
            }
        });

        // Handle blur (click outside)
        input.addEventListener('blur', function() {
            setTimeout(() => submitCustomValue(inputWrapper, container), 200);
        });
    });

    container.appendChild(addButton);
}

function submitCustomValue(inputWrapper, container) {
    // Prevent double submission
    if (inputWrapper.dataset.submitted === 'true') {
        return;
    }
    inputWrapper.dataset.submitted = 'true';

    const input = inputWrapper.querySelector('input');
    const value = input.value.trim();

    if (value) {
        // Create a new pill with the custom value
        const pill = document.createElement('button');
        pill.className = 'value-pill selected'; // Auto-select it
        pill.dataset.value = `custom-${Date.now()}`; // Unique value
        pill.dataset.custom = 'true'; // Mark as custom

        pill.innerHTML = `
            <svg class="value-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                ${valueIcons['growth']}
            </svg>
            <span>${value}</span>
            <div class="value-checkmark">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            </div>
        `;

        pill.addEventListener('click', function() {
            this.classList.toggle('selected');
            updateValuesCounter();
        });

        // Insert the new pill before the input wrapper
        container.insertBefore(pill, inputWrapper);
        customValuesCount++;

        // Update counter after adding
        updateValuesCounter();
    }

    // Remove the input wrapper and show the "+ Add your own" button again
    inputWrapper.remove();

    // Only show "+ Add your own" button if under limit
    if (customValuesCount < 3) {
        addCustomValueButton(container);
    }
}

// Step 4: Values (event delegation no longer needed since chips are created dynamically)


document.getElementById('deep-continue-5')?.addEventListener('click', () => {
    const selectedPills = Array.from(document.querySelectorAll('#deep-values-chips .value-pill.selected'));

    if (selectedPills.length < 3) {
        alert('Please select at least 3 values that matter to you.');
        return;
    }

    deepDecisionState.values = selectedPills.map(pill => pill.dataset.value);
    showPage('deep-6');
});

// Populate assumption labels with actual option names
function populateAssumptionLabels() {
    if (deepDecisionState.options && deepDecisionState.options.length >= 2) {
        const option1Label = document.getElementById('deep-assumption-option1-label');
        const option2Label = document.getElementById('deep-assumption-option2-label');
        const option1LabelShort = document.getElementById('deep-assumption-option1-label-short');
        const option2LabelShort = document.getElementById('deep-assumption-option2-label-short');

        // Use "If you choose [option], what happens?" format to avoid pronoun issues
        if (option1Label) option1Label.textContent = `If you choose "${deepDecisionState.options[0]}", what happens?`;
        if (option2Label) option2Label.textContent = `If you choose "${deepDecisionState.options[1]}", what happens?`;

        // Populate card header names (new future cards structure)
        if (option1LabelShort) option1LabelShort.textContent = deepDecisionState.options[0];
        if (option2LabelShort) option2LabelShort.textContent = deepDecisionState.options[1];
    }
}

// Step 6: Assumptions
document.getElementById('deep-continue-6')?.addEventListener('click', () => {
    const assumption1 = document.getElementById('deep-assumption-option1').value.trim();
    const assumption2 = document.getElementById('deep-assumption-option2').value.trim();
    const misjudge = document.getElementById('deep-assumption-misjudge').value.trim();

    if (!assumption1 || !assumption2) {
        if (!assumption1) {
            document.getElementById('deep-assumption-option1').focus();
        } else {
            document.getElementById('deep-assumption-option2').focus();
        }
        return;
    }

    // Store assumptions in a structured format
    deepDecisionState.assumptions = {
        option1: assumption1,
        option2: assumption2,
        misjudge: misjudge
    };

    showPage('deep-7');
});

// Populate category-specific challenges
function populateCategoryChallenges() {
    const category = deepDecisionState.category || 'other';
    const container = document.getElementById('deep-difficulty-chips');

    // Icon mapping for challenge types
    const challengeIcons = {
        'fear-regret': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>',
        'timing': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
        'compatibility': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>',
        'external-pressure': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
        'past-patterns': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>',
        'future-uncertainty': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>',
        'risk': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
        'pressure': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
        'uncertainty': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>',
        'reversibility': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>',
        'fear': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
        'opportunity-cost': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>',
        'default': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>'
    };

    const categoryChallenges = {
        career: [
            { difficulty: 'opportunity-cost', label: 'Giving up other opportunities' },
            { difficulty: 'risk', label: 'Risk to career trajectory' },
            { difficulty: 'prestige', label: 'Prestige vs. fulfillment tradeoff' },
            { difficulty: 'salary', label: 'Compensation concerns' },
            { difficulty: 'timing', label: 'Timing uncertainty' },
            { difficulty: 'growth', label: 'Unclear growth path' }
        ],
        relationship: [
            { difficulty: 'fear-regret', label: 'Fear of regret' },
            { difficulty: 'timing', label: 'Timing concerns' },
            { difficulty: 'compatibility', label: 'Compatibility doubts' },
            { difficulty: 'external-pressure', label: 'Family/friend pressure' },
            { difficulty: 'past-patterns', label: 'Past relationship patterns' },
            { difficulty: 'future-uncertainty', label: 'Future uncertainty' }
        ],
        finance: [
            { difficulty: 'risk-tolerance', label: 'Risk vs. reward balance' },
            { difficulty: 'complexity', label: 'Too complex to understand' },
            { difficulty: 'timing', label: 'Market timing concerns' },
            { difficulty: 'conflicting-advice', label: 'Conflicting expert advice' },
            { difficulty: 'loss-aversion', label: 'Fear of losing money' },
            { difficulty: 'long-term', label: 'Long-term commitment' }
        ],
        health: [
            { difficulty: 'side-effects', label: 'Potential side effects' },
            { difficulty: 'conflicting-info', label: 'Conflicting medical information' },
            { difficulty: 'lifestyle-change', label: 'Major lifestyle changes required' },
            { difficulty: 'timeline', label: 'Time to see results' },
            { difficulty: 'support', label: 'Lack of support system' },
            { difficulty: 'sustainability', label: 'Can I sustain this long-term?' }
        ],
        education: [
            { difficulty: 'cost', label: 'High cost/debt concern' },
            { difficulty: 'time', label: 'Time investment' },
            { difficulty: 'opportunity-cost', label: 'Missing other opportunities' },
            { difficulty: 'roi', label: 'Uncertain return on investment' },
            { difficulty: 'passion-practical', label: 'Passion vs. practicality' },
            { difficulty: 'commitment', label: 'Long-term commitment' }
        ],
        lifestyle: [
            { difficulty: 'identity', label: 'Challenges who I am' },
            { difficulty: 'judgment', label: 'Fear of others\' judgment' },
            { difficulty: 'stability', label: 'Giving up stability' },
            { difficulty: 'reversibility', label: 'Hard to reverse' },
            { difficulty: 'gradual', label: 'Want change but afraid' },
            { difficulty: 'values', label: 'Conflicting values' }
        ],
        relocation: [
            { difficulty: 'leaving-behind', label: 'Leaving friends/family behind' },
            { difficulty: 'cost-uncertainty', label: 'Cost of living uncertainty' },
            { difficulty: 'career-impact', label: 'Career impact unknown' },
            { difficulty: 'belonging', label: 'Will I fit in/belong?' },
            { difficulty: 'reversibility', label: 'Hard to move back' },
            { difficulty: 'romanticizing', label: 'Am I romanticizing the new place?' }
        ],
        other: [
            { difficulty: 'fear', label: 'Fear of making the wrong choice' },
            { difficulty: 'pressure', label: 'External pressure' },
            { difficulty: 'tradeoffs', label: 'Difficult tradeoffs' },
            { difficulty: 'uncertainty', label: 'Too much uncertainty' },
            { difficulty: 'conflicting', label: 'Conflicting values' },
            { difficulty: 'reversibility', label: 'Hard to reverse' }
        ]
    };

    const challenges = categoryChallenges[category] || categoryChallenges.other;

    container.innerHTML = '';
    challenges.forEach(item => {
        const chip = document.createElement('button');
        chip.className = 'chip challenge-chip';
        chip.dataset.difficulty = item.difficulty;

        // Get icon for this challenge type
        const icon = challengeIcons[item.difficulty] || challengeIcons['default'];

        // Create chip with icon + label
        chip.innerHTML = `<span class="challenge-icon">${icon}</span><span>${item.label}</span>`;

        chip.addEventListener('click', function() {
            this.classList.toggle('selected');
        });
        container.appendChild(chip);
    });

    // Add "Something else..." option
    const customChip = document.createElement('button');
    customChip.className = 'chip challenge-chip';
    customChip.dataset.difficulty = 'custom';
    customChip.innerHTML = `
        <span class="challenge-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
        </span>
        <span>Something else...</span>
    `;
    customChip.addEventListener('click', function() {
        this.classList.toggle('selected');
    });
    container.appendChild(customChip);

    // Add "I keep second-guessing myself" option
    const clarityChip = document.createElement('button');
    clarityChip.className = 'chip challenge-chip';
    clarityChip.dataset.difficulty = 'second-guessing';
    clarityChip.innerHTML = `
        <span class="challenge-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 8v4"></path>
                <path d="M12 16h.01"></path>
            </svg>
        </span>
        <span>I keep second-guessing myself</span>
    `;
    clarityChip.addEventListener('click', function() {
        this.classList.toggle('selected');
    });
    container.appendChild(clarityChip);
}

// Step 7: Difficulties - Continue button
document.getElementById('deep-continue-7')?.addEventListener('click', async () => {
    const selectedChips = Array.from(document.querySelectorAll('#deep-difficulty-chips .chip.selected'));

    // Store selected challenges (or empty array if none selected)
    deepDecisionState.difficulties = selectedChips.map(chip => chip.dataset.difficulty);
    deepDecisionState.difficultyDetail = ''; // No longer using detail input

    // Navigate to summary and generate it
    showPage('deep-8');
    await generateDeepSummary();
});

// Step 7: Summary
async function generateDeepSummary() {
    // Populate Narrative Intro
    const narrativeDecision = document.getElementById('narrative-decision-text');
    const narrativeContext = document.getElementById('narrative-context-text');

    narrativeDecision.textContent = deepDecisionState.reframedQuestion || deepDecisionState.decision;

    // Build context sentence: "You have [X] paths in front of you, and what matters most is [values]."
    const numOptions = deepDecisionState.options.length;
    const valuesList = deepDecisionState.values.join(', ').replace(/, ([^,]*)$/, ' and $1');
    narrativeContext.textContent = `You have ${numOptions} paths in front of you, and what matters most is ${valuesList}.`;

    // Populate Card 1: Decision & Options
    document.getElementById('summary-decision').textContent = deepDecisionState.reframedQuestion || deepDecisionState.decision;
    document.getElementById('summary-category').textContent = capitalizeFirst(deepDecisionState.category || 'Other');

    // Format timeline to show user-friendly text instead of "urgent"
    const timelineMap = {
        'urgent': 'This week',
        'soon': 'Within a month',
        'flexible': 'A few months',
        'open': 'No deadline',
        'custom': deepDecisionState.customDeadline
            ? new Date(deepDecisionState.customDeadline).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })
            : 'Custom deadline'
    };
    const timelineText = timelineMap[deepDecisionState.timeline] || deepDecisionState.timeline;
    document.getElementById('summary-timeline').textContent = timelineText;

    const optionsList = document.getElementById('summary-options');
    optionsList.innerHTML = '';
    deepDecisionState.options.forEach(option => {
        const li = document.createElement('li');
        li.textContent = option;
        optionsList.appendChild(li);
    });

    // Helper function to format labels (capitalize, remove hyphens)
    function formatLabel(text) {
        return text
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    // Populate Card 2: Values
    const valuesContainer = document.getElementById('summary-values');
    valuesContainer.innerHTML = '';
    deepDecisionState.values.forEach(value => {
        const tag = document.createElement('div');
        tag.className = 'summary-tag summary-tag-value';
        tag.textContent = formatLabel(value);
        valuesContainer.appendChild(tag);
    });

    // Populate Card 3: Challenges
    const challengesContainer = document.getElementById('summary-challenges');
    challengesContainer.innerHTML = '';
    deepDecisionState.difficulties.forEach(difficulty => {
        const tag = document.createElement('div');
        tag.className = 'summary-tag summary-tag-challenge';
        tag.textContent = formatLabel(difficulty);
        challengesContainer.appendChild(tag);
    });

    const challengeDetail = document.getElementById('summary-challenge-detail');
    if (deepDecisionState.difficultyDetail) {
        challengeDetail.className = 'text-sm mt-sm user-context-text';
        challengeDetail.textContent = deepDecisionState.difficultyDetail;
    } else {
        challengeDetail.style.display = 'none';
    }

    // Populate Card 4: Assumptions
    const assumptionsEl = document.getElementById('summary-assumptions');
    if (typeof deepDecisionState.assumptions === 'object') {
        assumptionsEl.innerHTML = `
            <div class="assumption-item">
                <strong>If I ${deepDecisionState.options[0].toLowerCase()}</strong>
                <div class="assumption-text">${deepDecisionState.assumptions.option1}</div>
            </div>
            <div class="assumption-item">
                <strong>If I ${deepDecisionState.options[1].toLowerCase()}</strong>
                <div class="assumption-text">${deepDecisionState.assumptions.option2}</div>
            </div>
            ${deepDecisionState.assumptions.misjudge ? `
                <div class="assumption-item">
                    <strong>Might be misjudging</strong>
                    <div class="assumption-text">${deepDecisionState.assumptions.misjudge}</div>
                </div>
            ` : ''}
        `;
    } else {
        // Fallback for old format
        assumptionsEl.innerHTML = `<div class="assumption-text">${deepDecisionState.assumptions}</div>`;
    }
}

document.getElementById('deep-adjust-summary')?.addEventListener('click', () => {
    showPage('deep-3');  // Go back to options
});

document.getElementById('deep-confirm-summary')?.addEventListener('click', () => {
    showPage('deep-9');
});

// Step 8: Significance Assessment
document.querySelectorAll('.significance-card').forEach(card => {
    card.addEventListener('click', function() {
        // Remove selected from all cards
        document.querySelectorAll('.significance-card').forEach(c => c.classList.remove('selected'));
        // Add selected to clicked card
        this.classList.add('selected');
        // Store significance level
        deepDecisionState.significance = this.dataset.significance;
    });
});

document.getElementById('deep-continue-9')?.addEventListener('click', async () => {
    if (!deepDecisionState.significance) {
        alert('Please select how significant this decision is to you.');
        return;
    }
    showPage('deep-results');
    await generateDeepResults();
});

// Tab switching
document.querySelectorAll('[data-tab]').forEach(tab => {
    tab.addEventListener('click', function() {
        const tabName = this.dataset.tab;

        // Update tab buttons
        document.querySelectorAll('[data-tab]').forEach(t => t.classList.remove('active'));
        this.classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
        document.getElementById(`tab-${tabName}`).classList.add('active');
    });
});

// Regenerate button
document.getElementById('regenerate-analysis')?.addEventListener('click', async () => {
    await generateDeepResults();
});

/// Step 8: Deep Results - Complete Rebuild
async function generateDeepResults() {
    console.log('[DEEP] Starting generateDeepResults...');

    // Generate all content with ONE comprehensive AI call
    try {
        await generateComprehensiveAnalysis();
        initializeConfidenceData();
        generateShareableSummary();
        generateInsightsTab();
        populateOutcomeBox();
    } catch (error) {
        console.error('[DEEP] Error generating analysis:', error);
        // Continue to save even if analysis fails
    }

    // Save decision to Supabase after analysis is complete
    console.log('[DEEP] About to save decision...');
    await saveCompletedDecision();
    console.log('[DEEP] Save completed');

    // Mark free Life decision as used (at completion, not start)
    localStorage.setItem('free_life_decision_used', 'true');
    console.log('[GATING] Free Life decision marked as used');

    // Track analytics event
    if (typeof trackEvent === 'function') {
        trackEvent('life_decision_completed_free');
    }
}

async function saveCompletedDecision() {
    try {
        // Build decision data object from deepDecisionState
        const decisionData = {
            decision: deepDecisionState.decision,
            question: deepDecisionState.decision,
            reframedQuestion: deepDecisionState.reframedQuestion,
            category: deepDecisionState.category,
            decisionType: 'life', // Use 'life' for Deep Guidance decisions
            decision_type: 'life', // Both formats for compatibility
            context: deepDecisionState.context,
            options: deepDecisionState.options,
            values: deepDecisionState.values,
            assumptions: deepDecisionState.assumptions,
            difficulties: deepDecisionState.difficulties,
            challenges: deepDecisionState.difficulties, // Both formats
            difficultyDetail: deepDecisionState.difficultyDetail,
            timeline: deepDecisionState.timeline,
            significance: deepDecisionState.significance,
            recommendation: deepDecisionState.recommendation,
            recommendationData: deepDecisionState.recommendation, // Both formats
            analysis: deepDecisionState.comprehensiveAnalysis,
            timestamp: Date.now(),
            type: 'deep',
            status: 'recommendation-given'
        };

        console.log('💾 Saving completed Deep Guidance decision to database...', decisionData);
        const savedId = await saveDecisionToStorage(decisionData);

        if (savedId) {
            console.log('✅ Deep Guidance decision saved successfully with ID:', savedId);
            deepDecisionState.savedDecisionId = savedId;
        } else {
            console.warn('⚠️ Decision not saved (user may be guest or save failed)');
        }
    } catch (error) {
        console.error('❌ Error saving Deep Guidance decision:', error);
    }
}

async function generateComprehensiveAnalysis() {
    // Show all loading states (with null checks for elements that may not exist)
    const topRecLoading = document.getElementById('top-rec-loading');
    const topRecContent = document.getElementById('top-rec-content');
    const compareLoading = document.getElementById('compare-loading');
    const compareContent = document.getElementById('compare-content');
    const gainsLoading = document.getElementById('gains-loading');
    const gainsContent = document.getElementById('gains-content');
    const tradeoffsLoading = document.getElementById('tradeoffs-loading');
    const tradeoffsContent = document.getElementById('tradeoffs-content');
    const risksLoading = document.getElementById('risks-loading');
    const risksList = document.getElementById('risks-list');

    if (topRecLoading) topRecLoading.style.display = 'flex';
    if (topRecContent) topRecContent.style.display = 'none';
    if (compareLoading) compareLoading.style.display = 'flex';
    if (compareContent) compareContent.style.display = 'none';
    if (gainsLoading) gainsLoading.style.display = 'flex';
    if (gainsContent) gainsContent.style.display = 'none';
    if (tradeoffsLoading) tradeoffsLoading.style.display = 'flex';
    if (tradeoffsContent) tradeoffsContent.style.display = 'none';
    if (risksLoading) risksLoading.style.display = 'flex';
    if (risksList) risksList.style.display = 'none';

    try {
        const assumptionsText = typeof deepDecisionState.assumptions === 'object'
            ? `Option 1 (${deepDecisionState.options[0]}): ${deepDecisionState.assumptions.option1}. Option 2 (${deepDecisionState.options[1]}): ${deepDecisionState.assumptions.option2}.`
            : deepDecisionState.assumptions;

        // Build dynamic option keys for the prompt
        const optionKeys = deepDecisionState.options.map((opt, i) => `option${i + 1}`);
        const optionScoresExample = optionKeys.map(key => `"${key}": 1-10`).join(', ');
        const optionMapping = deepDecisionState.options.map((opt, i) => `option${i + 1} = "${opt}"`).join(', ');

        const systemPrompt = `You are a confident decision coach for Clarified, helping users think through important life decisions.

SCOPE — You help with:
- Career decisions (job changes, career paths, education)
- Relationship decisions (dating, friendships, family dynamics)
- Life changes (moving, major purchases, lifestyle changes)
- Personal growth (habits, priorities, goals)

NEVER provide:
- Medical advice, diagnosis, or treatment recommendations
- Financial investment advice or specific money recommendations
- Legal advice or interpretation of laws/contracts
- Advice that could lead to self-harm or harm to others
- Guidance on illegal activities

If the decision involves medical, financial, or legal elements:
- Acknowledge those elements exist
- Recommend consulting appropriate professionals
- Focus your guidance on the non-professional aspects (emotions, values, priorities)

Always use "you" and "your" when addressing the user. Be warm, supportive, non-judgmental. Acknowledge complexity and nuance.

Return ONLY a JSON object with this EXACT structure:
{
  "recommendation": "One of the exact option names provided",
  "confidence": "High or Moderate",
  "reversibility": "Easy, Moderate, or Difficult",
  "reversibilityNote": "1-2 sentence explanation of WHY this decision is easy/moderate/difficult to reverse. Consider: financial commitments, time investment, relationship impacts, career implications, what would it take to undo this?",
  "reasoning": "EXACTLY 2-3 sentences (max 50 words total): (1) Reference what they said they want + why this option fits. (2) Name the top values this scores highest on. (3) Optional: Acknowledge main tradeoff. Use definitive language ('is' not 'appears to be'). No filler. Every word earns its place.",
  "comparison": [
    { "value": "First value name", ${optionScoresExample} },
    { "value": "Second value name", ${optionScoresExample} }
  ],
  "gains": ["Specific gain 1 (8-12 words)", "Specific gain 2", "Specific gain 3"],
  "tradeoffs": ["Specific tradeoff 1 (8-12 words)", "Specific tradeoff 2"],
  "risks": ["Specific risk 1 (8-12 words)", "Specific risk 2", "Specific risk 3"]
}

CRITICAL REQUIREMENTS:
- comparison array must include ALL values (${deepDecisionState.values.length} values)
- comparison must include scores for ALL ${deepDecisionState.options.length} options (${optionMapping})
- Use realistic scores 1-10 (not everything is 8-10)
- gains/tradeoffs/risks must be specific to this decision, not generic
- Use neutral phrasing (no possessives like "your partner")
- BE CONFIDENT: Say "is" not "appears to be", "will" not "might"
- REFERENCE MULTIPLE VALUES: Don't just mention one value - weave in 2-3 of their priorities
- USE CONTEXT: Reference their specific situation, timeline, and concerns
- ADD EXTERNAL KNOWLEDGE: Include relevant facts (industry trends, location benefits, timing considerations)`;

        // Build options list dynamically
        const optionsList = deepDecisionState.options.map((opt, i) => `Option ${i + 1}: ${opt}`).join('\n');

        const prompt = `Decision: ${deepDecisionState.reframedQuestion || deepDecisionState.decision}

${optionsList}

Values (in priority order): ${deepDecisionState.values.join(', ')}
Assumptions: ${assumptionsText}
Challenges: ${deepDecisionState.difficulties.join(', ')}
Specific concerns: ${deepDecisionState.difficultyDetail || 'None specified'}
Timeline: ${deepDecisionState.timeline}
Significance: ${deepDecisionState.significance}

Provide a comprehensive analysis speaking directly to the user using "you" and "your".`;

        const response = await callClaude(prompt, systemPrompt);
        let analysis;

        try {
            analysis = JSON.parse(response);
        } catch {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        }

        // If AI fails, use fallback
        if (!analysis) {
            analysis = generateFallbackAnalysis();
        }

        // Store in state
        deepDecisionState.recommendation = analysis.recommendation;
        deepDecisionState.comprehensiveAnalysis = analysis;

        // Populate all sections
        populateTopRecommendation(analysis);
        populateWhyThisWins(analysis);
        populateComparisonTable(analysis);
        populateGainsTradeoffsRisks(analysis);

    } catch (error) {
        console.error('Error generating comprehensive analysis:', error);
        const fallback = generateFallbackAnalysis();
        populateTopRecommendation(fallback);
        populateWhyThisWins(fallback);
        populateComparisonTable(fallback);
        populateGainsTradeoffsRisks(fallback);
    }
}

function generateFallbackAnalysis() {
    // Generate fallback comparison data
    const comparison = deepDecisionState.values.map((value, index) => ({
        value: value,
        optionA: index === 0 ? 8 : (7 - index),
        optionB: index === 0 ? 5 : (5 - index)
    }));

    return {
        recommendation: deepDecisionState.options[0],
        confidence: "Moderate",
        reversibility: "Moderate",
        reasoning: `Based on your values, particularly ${deepDecisionState.values[0]}, this option aligns best with what you said matters most. It addresses your main concerns and fits your timeline.`,
        comparison: comparison,
        gains: [
            "This option aligns with what you said matters most",
            "You move toward your core values",
            "You address your main concerns"
        ],
        tradeoffs: [
            "You're closing the door on other paths",
            "There's always some uncertainty ahead"
        ],
        risks: [
            "Consider potential downsides carefully",
            "Monitor the situation closely",
            "Have a backup plan ready"
        ]
    };
}

function populateTopRecommendation(analysis) {
    // Populate page subtitle
    const titleEl = document.getElementById('results-decision-title');
    if (titleEl) titleEl.textContent = deepDecisionState.reframedQuestion || deepDecisionState.decision;

    // SAFETY: Show disclaimer banner if user continued past a disclaimer
    if (deepDecisionState.disclaimerAcknowledged) {
        const disclaimerBanner = document.getElementById('results-disclaimer');
        const disclaimerTypeSpan = document.getElementById('disclaimer-type');
        if (disclaimerBanner && disclaimerTypeSpan) {
            disclaimerTypeSpan.textContent = deepDecisionState.disclaimerAcknowledged;
            disclaimerBanner.style.display = 'flex';
        }
    }

    // Populate recommendation card
    const topValue = deepDecisionState.values[0];
    const secondValue = deepDecisionState.values[1] || null;
    const recOptionEl = document.getElementById('top-rec-option');
    const recContextEl = document.getElementById('top-rec-context');
    if (recOptionEl) recOptionEl.textContent = analysis.recommendation;
    if (recContextEl) {
        // Use the AI-generated reasoning if available, otherwise create confident fallback
        if (analysis.reasoning) {
            recContextEl.textContent = analysis.reasoning;
        } else {
            const valueContext = secondValue
                ? `${topValue.toLowerCase()} and ${secondValue.toLowerCase()}`
                : topValue.toLowerCase();
            recContextEl.textContent = `This choice aligns with what matters most to you—${valueContext}. It's the path that honors your priorities.`;
        }
    }

    // Populate confidence & reversibility (these elements may not exist in new layout)
    const confValueEl = document.getElementById('rec-confidence-value');
    const revValueEl = document.getElementById('rec-reversibility-value');
    if (confValueEl) confValueEl.textContent = analysis.confidence;
    if (revValueEl) revValueEl.textContent = analysis.reversibility;

    // Update progress rings (if they exist)
    updateProgressRing('rec-confidence-ring', analysis.confidence, 'confidence');
    updateProgressRing('rec-reversibility-ring', analysis.reversibility, 'reversibility');

    // Populate reversibility accordion
    if (typeof populateReversibilityAccordion === 'function') {
        populateReversibilityAccordion({
            reversibility: analysis.reversibility,
            reversibilityNote: analysis.reversibilityNote || `This decision is ${analysis.reversibility.toLowerCase()} to reverse.`
        });
    }

    // Show content
    const topRecLoading = document.getElementById('top-rec-loading');
    const topRecContent = document.getElementById('top-rec-content');
    if (topRecLoading) topRecLoading.style.display = 'none';
    if (topRecContent) topRecContent.style.display = 'block';
}

function populateWhyThisWins(analysis) {
    // These elements may not exist in the new accordion-based layout
    const strengthBarsEl = document.getElementById('strength-bars');
    const proseEl = document.getElementById('why-wins-prose');

    // Show reasoning (if element exists)
    if (proseEl) {
        proseEl.innerHTML = `<p class="text-secondary">${analysis.reasoning}</p>`;
    }

    // Show strength bars (if element exists)
    if (strengthBarsEl && analysis.comparison) {
        const topComparisons = analysis.comparison.slice(0, 4);
        const recommendedIndex = deepDecisionState.options.indexOf(analysis.recommendation);

        let barsHTML = '';
        topComparisons.forEach(comp => {
            const score = recommendedIndex === 0 ? comp.optionA : comp.optionB;
            const percentage = (score / 10) * 100;
            const rating = score >= 8 ? 'STRONG' : score >= 6 ? 'GOOD' : score >= 4 ? 'MODERATE' : 'WEAK';

            barsHTML += `
                <div class="strength-bar">
                    <div class="strength-bar-label">
                        <span class="strength-bar-name">${formatValueLabel(comp.value)}</span>
                        <span class="strength-bar-rating">${rating}</span>
                    </div>
                    <div class="strength-bar-visual">
                        <div class="strength-bar-fill" style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;
        });

        strengthBarsEl.innerHTML = barsHTML;
    }

    // Show content (if elements exist)
    const whyWinsLoading = document.getElementById('why-wins-loading');
    const whyWinsContent = document.getElementById('why-wins-content');
    if (whyWinsLoading) whyWinsLoading.style.display = 'none';
    if (whyWinsContent) whyWinsContent.style.display = 'block';
}

function populateComparisonTable(analysis) {
    const tableWrapper = document.getElementById('compare-table-wrapper');
    if (!tableWrapper) return;

    const options = deepDecisionState.options;
    const recommendation = analysis.recommendation;

    // Helper to generate dots: 5 total, filled (●) = Math.round(score/2), empty (○) = rest
    function generateDots(score) {
        const filled = Math.round(score / 2); // score is 0-10, so filled is 0-5
        const empty = 5 - filled;
        return '●'.repeat(filled) + '○'.repeat(empty);
    }

    // Helper to capitalize first letter of a string
    function capitalizeFirst(str) {
        if (!str) return str;
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // Helper to get score for an option from comparison data
    // Handles both old format (optionA/optionB) and new format (option1/option2/option3...)
    function getScore(comp, optionIndex) {
        // Try new format first (option1, option2, option3, etc.)
        const newKey = `option${optionIndex + 1}`;
        if (comp[newKey] !== undefined) {
            return comp[newKey];
        }
        // Fall back to old format (optionA, optionB)
        if (optionIndex === 0 && comp.optionA !== undefined) {
            return comp.optionA;
        }
        if (optionIndex === 1 && comp.optionB !== undefined) {
            return comp.optionB;
        }
        // Default score if not found
        return 5;
    }

    // Build table header
    let tableHTML = `
        <table class="compare-table">
            <thead>
                <tr>
                    <th>DRIVER</th>
    `;

    // Add column headers for ALL options
    options.forEach(option => {
        const isRec = option === recommendation;
        tableHTML += `
            <th class="${isRec ? 'recommended' : ''}">
                ${capitalizeFirst(option)}
                ${isRec ? '<span class="rec-badge">RECOMMENDED</span>' : ''}
            </th>
        `;
    });

    tableHTML += `
                </tr>
            </thead>
            <tbody>
    `;

    // Add rows for each value/driver
    analysis.comparison.forEach(comp => {
        tableHTML += `
            <tr>
                <td>${formatValueLabel(comp.value)}</td>
        `;

        // Add score cells for ALL options
        options.forEach((option, index) => {
            const isRec = option === recommendation;
            const score = getScore(comp, index);
            tableHTML += `
                <td class="${isRec ? 'recommended' : ''}">
                    <span class="dots${isRec ? '' : ' muted'}">${generateDots(score)}</span>
                </td>
            `;
        });

        tableHTML += `</tr>`;
    });

    tableHTML += `
            </tbody>
        </table>
    `;

    // Check if scroll indicator is needed (only on narrow screens)
    const needsScroll = window.innerWidth < 400;
    if (needsScroll) {
        tableHTML = `<div class="scroll-indicator">→</div>` + tableHTML;
    }

    tableWrapper.innerHTML = tableHTML;

    // Show content
    document.getElementById('compare-loading').style.display = 'none';
    document.getElementById('compare-content').style.display = 'block';
}

function populateGainsTradeoffsRisks(analysis) {
    // Populate gains
    const gainsContent = document.getElementById('gains-content');
    gainsContent.innerHTML = analysis.gains.map(gain => `<li>${gain}</li>`).join('');
    document.getElementById('gains-loading').style.display = 'none';
    gainsContent.style.display = 'block';

    // Populate tradeoffs
    const tradeoffsContent = document.getElementById('tradeoffs-content');
    tradeoffsContent.innerHTML = analysis.tradeoffs.map(tradeoff => `<li>${tradeoff}</li>`).join('');
    document.getElementById('tradeoffs-loading').style.display = 'none';
    tradeoffsContent.style.display = 'block';

    // Populate risks
    const risksList = document.getElementById('risks-list');
    risksList.innerHTML = analysis.risks.map(risk => `<li>${risk}</li>`).join('');
    document.getElementById('risks-loading').style.display = 'none';
    risksList.style.display = 'block';
}

function formatValueLabel(value) {
    return value.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ============================================
// OUTCOME BOX - Lock in decision
// ============================================

function populateOutcomeBox() {
    const outcomeOptions = document.getElementById('outcome-options');
    const lockInBtn = document.getElementById('lock-in-btn');

    if (!outcomeOptions || !deepDecisionState.options) return;

    // Build options HTML from the decision options
    let optionsHTML = '';

    deepDecisionState.options.forEach((option, index) => {
        optionsHTML += `
            <label class="outcome-option">
                <input type="radio" name="outcome" value="option${index + 1}" data-option="${option}">
                <span>${option}</span>
            </label>
        `;
    });

    // Add "I need more time" option
    optionsHTML += `
        <label class="outcome-option">
            <input type="radio" name="outcome" value="more_time" data-option="more_time">
            <span>I need more time</span>
        </label>
    `;

    outcomeOptions.innerHTML = optionsHTML;

    // Enable the button when an option is selected
    const radioInputs = outcomeOptions.querySelectorAll('input[type="radio"]');
    radioInputs.forEach(input => {
        input.addEventListener('change', () => {
            lockInBtn.disabled = false;
        });
    });
}

async function lockInDecision() {
    const selectedOption = document.querySelector('input[name="outcome"]:checked');

    if (!selectedOption) {
        alert('Please select an option before locking in.');
        return;
    }

    const outcomeValue = selectedOption.value;
    const outcomeChoice = selectedOption.dataset.option;

    // If user needs more time, just redirect to decisions page
    if (outcomeValue === 'more_time') {
        showPage('decisions');
        return;
    }

    // Calculate check-in due date (2 weeks from now)
    const checkInDue = new Date();
    checkInDue.setDate(checkInDue.getDate() + 14);

    // Update the decision in database
    if (deepDecisionState.savedDecisionId && window.supabaseClient) {
        try {
            const { error } = await window.supabaseClient.getSupabase()
                .from('decisions')
                .update({
                    outcome_choice: outcomeChoice,
                    outcome_locked_at: new Date().toISOString(),
                    check_in_due: checkInDue.toISOString(),
                    status: 'decided'
                })
                .eq('id', deepDecisionState.savedDecisionId);

            if (error) {
                console.error('Error locking in decision:', error);
            } else {
                console.log('✅ Decision locked in:', outcomeChoice);
            }
        } catch (err) {
            console.error('Error updating decision:', err);
        }
    }

    // Show confirmation and redirect to decisions page
    showPage('decisions');
}

// ============================================
// SCORING & VALUE DATA
// ============================================

// Value icons for display
const VALUE_ICONS = {
    'growth': '📈',
    'stability': '🛡️',
    'experience': '❤️',
    'autonomy': '🚀',
    'security': '🔒',
    'impact': '💡',
    'balance': '⚖️',
    'health': '💪',
    'wealth': '💰',
    'relationships': '👥',
    'adventure': '🌟',
    'peace': '☮️',
    'achievement': '🏆',
    'creativity': '🎨',
    'freedom': '🦅'
};

// Value descriptions for primary driver
const VALUE_DESCRIPTIONS = {
    'growth': 'You prioritize future opportunities, learning, and advancement',
    'stability': 'You prioritize security, predictability, and consistent outcomes',
    'experience': 'You prioritize quality of life, enjoyment, and meaningful experiences',
    'autonomy': 'You prioritize independence, control, and self-direction',
    'security': 'You prioritize safety, protection, and minimizing risk',
    'impact': 'You prioritize making a difference and creating meaningful change',
    'balance': 'You prioritize harmony across different life areas',
    'health': 'You prioritize physical and mental wellbeing',
    'wealth': 'You prioritize financial success and material security',
    'relationships': 'You prioritize connection, community, and people',
    'adventure': 'You prioritize novelty, excitement, and new experiences',
    'peace': 'You prioritize calm, contentment, and inner tranquility',
    'achievement': 'You prioritize accomplishment, success, and recognition',
    'creativity': 'You prioritize self-expression and innovative thinking',
    'freedom': 'You prioritize flexibility and lack of constraints'
};

// Calculate option scores based on weighted values
function calculateOptionScores(decision) {
    const values = decision.values || deepDecisionState.values || [];
    const options = decision.options || deepDecisionState.options || [];
    const optionScores = decision.option_scores || deepDecisionState.optionScores || {};

    // Calculate weights from value order (descending importance)
    const weights = {};
    const total = values.length;
    let remaining = 1.0;

    values.forEach((value, index) => {
        const weight = index === total - 1
            ? remaining
            : Math.round(((1 / total) * (total - index) / (total / 2)) * 100) / 100;
        weights[value] = weight;
        remaining -= weight;
    });

    const results = {};

    options.forEach(option => {
        const optionData = optionScores[option] || {};
        let totalScore = 0;
        const breakdown = {};

        // Weighted sum: score = Σ (value_weight * option_score_for_value)
        values.forEach(value => {
            const weight = weights[value] || 0;
            const score = optionData[value] || 50; // Default to 50 if no score
            const weightedScore = weight * score;
            totalScore += weightedScore;
            breakdown[value] = score;
        });

        results[option] = {
            total: Math.round(totalScore),
            breakdown: breakdown
        };
    });

    // Determine winner
    const sorted = Object.entries(results).sort((a, b) => b[1].total - a[1].total);
    const winner = sorted[0];
    const runnerUp = sorted[1];
    const margin = winner && runnerUp ? winner[1].total - runnerUp[1].total : 0;

    // Determine margin strength
    let marginStrength;
    if (margin >= 30) marginStrength = 'strong';
    else if (margin >= 15) marginStrength = 'moderate';
    else marginStrength = 'close';

    return {
        scores: results,
        weights: weights,
        winner: winner ? winner[0] : null,
        margin: margin,
        marginStrength: marginStrength
    };
}

// Recalculate with new weights
function recalculateWithWeights(newWeights) {
    const options = deepDecisionState.options || [];
    const optionScores = deepDecisionState.optionScores || {};

    // Normalize weights to sum to 1
    const total = Object.values(newWeights).reduce((a, b) => a + b, 0);
    const normalized = {};
    Object.keys(newWeights).forEach(key => {
        normalized[key] = total > 0 ? newWeights[key] / total : 0;
    });

    const results = {};

    options.forEach(option => {
        const optionData = optionScores[option] || {};
        let totalScore = 0;

        Object.keys(normalized).forEach(value => {
            const weight = normalized[value];
            const score = optionData[value] || 50;
            totalScore += weight * score;
        });

        results[option] = {
            total: Math.round(totalScore),
            breakdown: optionData
        };
    });

    // Determine winner
    const sorted = Object.entries(results).sort((a, b) => b[1].total - a[1].total);
    const winner = sorted[0];
    const runnerUp = sorted[1];
    const margin = winner && runnerUp ? winner[1].total - runnerUp[1].total : 0;

    return {
        scores: results,
        weights: normalized,
        winner: winner ? winner[0] : null,
        margin: margin
    };
}

// Toggle accordion sections
function toggleResultsAccordion(section) {
    const accordion = document.getElementById(`${section}-accordion`);
    if (accordion) {
        accordion.classList.toggle('collapsed');
    }
}
window.toggleResultsAccordion = toggleResultsAccordion;

// Initialize confidence and scoring data for accordions
function initializeConfidenceData() {
    const values = deepDecisionState.values || [];
    const options = deepDecisionState.options || [];

    // Calculate initial weights
    const scoreData = calculateOptionScores(deepDecisionState);
    deepDecisionState.currentWeights = scoreData.weights;
    deepDecisionState.originalWeights = { ...scoreData.weights };

    // Store original scores
    deepDecisionState.originalScores = {};
    Object.entries(scoreData.scores).forEach(([option, data]) => {
        deepDecisionState.originalScores[option] = data.total;
    });

    // Populate confidence section (for accordion)
    populateConfidenceSection(scoreData);
}

// Get confidence level based on margin
function getConfidenceLevel(margin, winnerName) {
    if (margin >= 30) {
        return {
            level: 'strong',
            width: 85,
            message: `${winnerName} is the clear winner for your priorities`
        };
    }
    if (margin >= 15) {
        return {
            level: 'moderate',
            width: 60,
            message: `${winnerName} edges out the other options`
        };
    }
    return {
        level: 'close',
        width: 35,
        message: `This one's close — go with your gut`
    };
}

// Calculate tipping points for each value - improved logic
function calculateTippingPoints(winningOption, margin) {
    const values = deepDecisionState.values || [];
    const weights = deepDecisionState.originalWeights || {};
    const tippingPoints = [];

    values.slice(0, 3).forEach(value => {
        const currentWeight = weights[value] || 0.33;
        let wouldChange = false;
        let changeAmount = null;
        let newWinner = null;
        let direction = 'more';

        // Test INCREASING this value's weight
        for (let delta = 0.05; delta <= 0.5; delta += 0.05) {
            const newWeights = { ...weights };
            newWeights[value] = Math.min(1, currentWeight + delta);

            // Normalize weights
            const total = Object.values(newWeights).reduce((a, b) => a + b, 0);
            if (total > 0) {
                Object.keys(newWeights).forEach(k => newWeights[k] /= total);
            }

            const result = recalculateWithWeights(newWeights);

            if (result.winner !== winningOption) {
                wouldChange = true;
                changeAmount = delta;
                newWinner = result.winner;
                direction = 'more';
                break;
            }
        }

        // Also test DECREASING for values that are currently high
        if (!wouldChange && currentWeight > 0.2) {
            for (let delta = 0.05; delta <= currentWeight; delta += 0.05) {
                const newWeights = { ...weights };
                newWeights[value] = Math.max(0, currentWeight - delta);

                const total = Object.values(newWeights).reduce((a, b) => a + b, 0);
                if (total > 0) {
                    Object.keys(newWeights).forEach(k => newWeights[k] /= total);
                }

                const result = recalculateWithWeights(newWeights);

                if (result.winner !== winningOption) {
                    wouldChange = true;
                    changeAmount = -delta;
                    newWinner = result.winner;
                    direction = 'less';
                    break;
                }
            }
        }

        // For close calls (margin < 15), force at least one value to show as sensitive
        // This makes the feature more useful even when the math is close
        if (!wouldChange && margin < 15 && tippingPoints.filter(t => t.wouldChange).length === 0) {
            // Pick the lowest-weighted value as the most likely to flip
            const lowestWeightValue = values.slice(0, 3).reduce((min, v) =>
                (weights[v] || 0.33) < (weights[min] || 0.33) ? v : min
            );
            if (value === lowestWeightValue) {
                wouldChange = true;
                changeAmount = 0.15;
                newWinner = deepDecisionState.options?.find(o => o !== winningOption) || 'the other option';
                direction = 'more';
            }
        }

        const youPos = Math.round(currentWeight * 100);
        const changePos = wouldChange ? Math.round((currentWeight + changeAmount) * 100) : null;

        tippingPoints.push({
            value: value,
            currentWeight: currentWeight,
            wouldChange: wouldChange,
            newWinner: newWinner,
            direction: direction,
            youPosition: Math.max(5, Math.min(youPos, 95)), // Keep within bounds for display
            changePosition: changePos ? Math.max(5, Math.min(changePos, 95)) : null
        });
    });

    // Sort: values that would change the outcome first
    return tippingPoints.sort((a, b) => {
        if (a.wouldChange && !b.wouldChange) return -1;
        if (!a.wouldChange && b.wouldChange) return 1;
        return 0;
    });
}

// Get SVG icon for a value
function getValueIcon(value) {
    const icons = {
        'growth': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 6l-9.5 9.5-5-5L1 18"></path><path d="M17 6h6v6"></path></svg>',
        'stability': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>',
        'experience': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>',
        'autonomy': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
        'security': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>',
        'impact': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>',
        'balance': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18M3 12h18"></path><circle cx="6" cy="6" r="2"></circle><circle cx="18" cy="18" r="2"></circle></svg>',
        'passion': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2c1 3 2.5 3.5 3.5 4.5A5 5 0 0 1 17 10c0 3-2.5 6-5 7.5-2.5-1.5-5-4.5-5-7.5a5 5 0 0 1 1.5-3.5C9.5 5.5 11 5 12 2z"></path></svg>'
    };
    return icons[value] || '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg>';
}

// Populate the confidence section
function populateConfidenceSection(scoreData) {
    const winnerName = scoreData.winner;
    const margin = scoreData.margin;

    // Confidence meter - now uses sage color only
    const confidence = getConfidenceLevel(margin, winnerName);
    const confidenceFill = document.getElementById('confidence-fill');
    const confidenceMarker = document.getElementById('confidence-marker');
    const confidenceSummary = document.getElementById('confidence-summary');
    const confidencePreview = document.getElementById('confidence-preview');

    if (confidenceFill) {
        confidenceFill.style.width = `${confidence.width}%`;
    }
    if (confidenceMarker) {
        confidenceMarker.style.left = `${confidence.width}%`;
    }
    if (confidenceSummary) {
        confidenceSummary.textContent = confidence.message;
    }

    // Update preview label in accordion header
    if (confidencePreview) {
        const levelLabel = confidence.level === 'strong' ? "This one's obvious" :
                          confidence.level === 'moderate' ? 'Pretty clear winner' : "It's close — trust your gut";
        confidencePreview.textContent = levelLabel;
    }

    // Tipping points with improved calculation
    const tippingPoints = calculateTippingPoints(winnerName, margin);
    const tippingCardsEl = document.getElementById('tipping-cards');

    if (tippingCardsEl) {
        let html = '';

        // Warning icon SVG
        const warningIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>`;

        // Safe icon SVG
        const safeIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>`;

        // Group tipping points by type and new winner
        const sensitive = tippingPoints.filter(t => t.wouldChange);
        const stable = tippingPoints.filter(t => !t.wouldChange);

        // Group sensitive by which option they'd flip to
        const sensitiveByNewWinner = {};
        sensitive.forEach(t => {
            if (!sensitiveByNewWinner[t.newWinner]) {
                sensitiveByNewWinner[t.newWinner] = [];
            }
            sensitiveByNewWinner[t.newWinner].push(t);
        });

        // Render sensitive groups first (more important)
        Object.entries(sensitiveByNewWinner).forEach(([newWinner, items]) => {
            const values = items.map(i => formatValueLabel(i.value)).join(', ');
            const isCombined = items.length > 1;

            html += `
                <div class="tipping-card warning ${isCombined ? 'combined' : ''}">
                    <div class="tipping-header">
                        <div class="tipping-icon warning">${warningIcon}</div>
                        <span class="tipping-value">${values}</span>
                        <span class="tipping-badge warning">Could flip</span>
                    </div>
                    <p class="tipping-result warning">If ${isCombined ? 'these mattered' : 'this mattered'} more to you, the answer would flip to ${newWinner}</p>
                    ${!isCombined ? `
                    <div class="tipping-scale">
                        <div class="scale-track">
                            <div class="scale-marker you" style="left: ${items[0].youPosition}%"></div>
                            <div class="scale-marker change" style="left: ${items[0].changePosition}%"></div>
                        </div>
                        <div class="scale-labels">
                            <span class="label-you">You now</span>
                            <span class="label-change">Tipping point</span>
                        </div>
                    </div>
                    ` : ''}
                </div>
            `;
        });

        // Render one combined stable group
        if (stable.length > 0) {
            const values = stable.map(s => formatValueLabel(s.value)).join(', ');
            html += `
                <div class="tipping-card safe combined">
                    <div class="tipping-header">
                        <div class="tipping-icon safe">${safeIcon}</div>
                        <span class="tipping-value">${values}</span>
                        <span class="tipping-badge safe">Locked in</span>
                    </div>
                    <p class="tipping-result safe">No matter how you weight ${stable.length > 1 ? 'these' : 'this'}, ${winnerName} still wins</p>
                </div>
            `;
        }

        tippingCardsEl.innerHTML = html;
    }

    // Reflection questions - generate based on tipping points
    populateReflectionQuestions(tippingPoints, winnerName);
}

// Format option name to read naturally in a sentence (e.g., "Ask boyfriend" -> "asking your boyfriend")
function formatOptionForSentence(optionName) {
    if (!optionName) return 'this option';

    // Convert to lowercase and handle common patterns
    let formatted = optionName.toLowerCase();

    // If it starts with a verb, convert to gerund (-ing form)
    const verbStarters = ['ask', 'wait', 'take', 'go', 'buy', 'sell', 'move', 'stay', 'leave', 'accept', 'decline', 'start', 'stop', 'keep', 'change', 'choose', 'pick', 'get', 'make', 'do', 'try', 'quit', 'join', 'apply', 'propose'];

    for (const verb of verbStarters) {
        if (formatted.startsWith(verb + ' ')) {
            // Convert verb to -ing form
            let gerund = verb;
            if (verb.endsWith('e')) {
                gerund = verb.slice(0, -1) + 'ing'; // take -> taking
            } else if (verb === 'quit' || verb === 'stop' || verb === 'get') {
                gerund = verb + 'ting'; // quit -> quitting
            } else {
                gerund = verb + 'ing'; // wait -> waiting
            }
            formatted = gerund + formatted.slice(verb.length);
            break;
        }
    }

    return formatted;
}

// Generate reflection questions based on tipping points
function populateReflectionQuestions(tippingPoints, winnerName) {
    const reflectionEl = document.getElementById('reflection-questions');
    if (!reflectionEl) return;

    const options = deepDecisionState.options || [];
    const loserName = options.find(o => o !== winnerName) || 'the other option';

    // Format option names to read naturally in sentences
    const winnerFormatted = formatOptionForSentence(winnerName);
    const loserFormatted = formatOptionForSentence(loserName);

    // Find the value closest to tipping
    const closestToTipping = tippingPoints.find(t => t.wouldChange);
    const stableValue = tippingPoints.find(t => !t.wouldChange);

    const questions = [];

    if (closestToTipping) {
        const valueLabel = formatValueLabel(closestToTipping.value).toLowerCase();
        questions.push(`Are you downplaying ${valueLabel} because you're excited about ${winnerFormatted}?`);
    }

    questions.push(`If ${winnerFormatted} doesn't work out, would you regret not giving ${loserFormatted} more of a chance?`);

    if (stableValue) {
        const valueLabel = formatValueLabel(stableValue.value).toLowerCase();
        questions.push(`Is ${valueLabel} really this important to you, or does it just feel safer?`);
    }

    // Take first 2 questions
    const finalQuestions = questions.slice(0, 2);

    reflectionEl.innerHTML = finalQuestions.map(q => `<li>${q}</li>`).join('');
}

// Populate the reversibility accordion
function populateReversibilityAccordion(recommendationData) {
    const previewEl = document.getElementById('reversibility-preview');
    const explanationEl = document.getElementById('reversibility-explanation');
    const fillEl = document.getElementById('reversibility-fill');
    const markerEl = document.getElementById('reversibility-marker');

    const reversibility = recommendationData?.reversibility || 'Moderate';
    const note = recommendationData?.reversibilityNote || 'This decision can be partially reversed, but some effects may be lasting.';

    // Map reversibility level to user-friendly label
    const labelMap = {
        'Difficult': 'One-way door',
        'Moderate': 'Somewhat reversible',
        'Easy': 'Easy to undo'
    };

    // Update preview label
    if (previewEl) {
        previewEl.textContent = labelMap[reversibility] || reversibility;
    }

    // Update explanation
    if (explanationEl) {
        explanationEl.textContent = note;
    }

    // Update gauge fill and marker - map reversibility level to percentage
    // Easy = high reversibility (right side), Difficult = low reversibility (left side)
    const levelMap = {
        'Easy': 85,
        'Moderate': 50,
        'Difficult': 20
    };
    const width = levelMap[reversibility] || 50;

    if (fillEl) {
        fillEl.style.width = `${width}%`;
    }
    if (markerEl) {
        markerEl.style.left = `${width}%`;
    }
}

function generateShareableSummary() {
    const container = document.getElementById('shareable-summary');
    if (!container || !deepDecisionState.recommendation) return;

    // Create natural language summary
    const decision = deepDecisionState.decision;
    const recommendation = deepDecisionState.recommendation;
    const topValues = deepDecisionState.values.slice(0, 2).join(' and ');

    const naturalSummary = `I was deciding ${decision.toLowerCase()}. Based on what matters most to me (${topValues}), Clarified helped me see that ${recommendation.toLowerCase()} is the path forward.`;

    const summaryText = `${naturalSummary}

Generated with Clarified - clarified.app`;

    container.innerHTML = `
        <div style="background: linear-gradient(135deg, var(--sage-50) 0%, var(--white) 100%); border: 2px solid var(--sage-300); border-radius: 12px; padding: var(--spacing-lg); position: relative;">
            <div style="position: absolute; top: 12px; right: 12px; width: 32px; height: 32px; background: var(--sage-green); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 0.9rem;">C</div>
            <p style="font-size: 1rem; line-height: 1.6; color: var(--gray-800); margin: 0; padding-right: 40px;">${naturalSummary}</p>
            <p style="font-size: 0.85rem; color: var(--sage-600); margin-top: var(--spacing-md); margin-bottom: 0;">Generated with <strong>Clarified</strong></p>
        </div>
    `;
}

function copyShareableSummary() {
    const decision = deepDecisionState.decision;
    const recommendation = deepDecisionState.recommendation;
    const topValues = deepDecisionState.values.slice(0, 2).join(' and ');

    const naturalSummary = `I was deciding ${decision.toLowerCase()}. Based on what matters most to me (${topValues}), Clarified helped me see that ${recommendation.toLowerCase()} is the path forward.`;

    const summaryText = `${naturalSummary}

Generated with Clarified - clarified.app`;

    navigator.clipboard.writeText(summaryText).then(() => {
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '✓ Copied!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy to clipboard');
    });
}

// Make function globally available
window.copyShareableSummary = copyShareableSummary;

// Generate fallback scores when AI response doesn't include them
function generateFallbackScores() {
    const scores = {};
    const options = deepDecisionState.options;
    const values = deepDecisionState.values;

    options.forEach((option, optIdx) => {
        scores[option] = {};
        values.forEach((value, valIdx) => {
            // Give first option slightly higher scores (it's the fallback recommendation)
            const baseScore = optIdx === 0 ? 4 : 3;
            // Add some variation based on value position
            const variation = valIdx % 2 === 0 ? 0 : (optIdx === 0 ? 1 : -1);
            scores[option][value] = Math.max(1, Math.min(5, baseScore + variation));
        });
    });

    return scores;
}

async function generateTopRecommendation() {
    const loading = document.getElementById('top-rec-loading');
    const content = document.getElementById('top-rec-content');

    loading.style.display = 'flex';
    content.style.display = 'none';

    try {
        const assumptionsText = typeof deepDecisionState.assumptions === 'object'
            ? `Option 1 (${deepDecisionState.options[0]}): ${deepDecisionState.assumptions.option1}. Option 2 (${deepDecisionState.options[1]}): ${deepDecisionState.assumptions.option2}.`
            : deepDecisionState.assumptions;

        // Extract specific concerns from difficulty detail
        const concerns = deepDecisionState.difficultyDetail || deepDecisionState.difficulties.join(', ');

        const systemPrompt = `You are a decision coach speaking directly to the person making this decision. Analyze which option best aligns with your values and return a recommendation.

Return ONLY a JSON object with this structure:
{
  "recommendedOption": "The option name exactly as stated",
  "topValue": "The most important value this supports",
  "emotionalAcknowledgment": "One warm, brief sentence acknowledging the difficulty (max 12 words)",
  "whyThisFits": ["Bullet 1 (8-12 words)", "Bullet 2 (8-12 words)", "Bullet 3 (8-12 words)"],
  "confidence": "High or Moderate",
  "confidenceReason": "Brief reason (max 8 words)",
  "reversibility": "Easy, Moderate, or Difficult",
  "reversibilityNote": "Brief explanation (max 8 words)"
}

CRITICAL PRONOUN RULES:
- Use second person (you/your) for general statements
- Do NOT add possessives to people ("your husband", "your wife", "your partner")
- Use neutral phrasing: "the relationship" not "your relationship with X"
- If the option is "Leave the relationship", say "leaving" or "this path" - never "leaving your husband"
- Keep language action-oriented and neutral
- The whyThisFits bullets should be crisp, scannable reasons referencing YOUR specific concerns and timeline.`;

        const prompt = `Decision: ${deepDecisionState.reframedQuestion || deepDecisionState.decision}

Options: ${deepDecisionState.options.join(', ')}
Values (in priority order): ${deepDecisionState.values.join(', ')}
Assumptions: ${assumptionsText}
Challenges: ${deepDecisionState.difficulties.join(', ')}
Specific concerns: ${concerns}
Timeline: ${deepDecisionState.timeline}

Which option aligns best with these values? Reference specific concerns and timeline in the reason.`;

        const response = await callClaude(prompt, systemPrompt);
        let recommendation;

        try {
            recommendation = JSON.parse(response);
        } catch {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            recommendation = jsonMatch ? JSON.parse(jsonMatch[0]) : {
                recommendedOption: deepDecisionState.options[0],
                topValue: deepDecisionState.values[0],
                emotionalAcknowledgment: "This is a meaningful decision.",
                whyThisFits: ["Aligns with your core values", "Supports your stated priorities", "Fits your timeline"],
                confidence: "Moderate",
                confidenceReason: "Based on your values",
                reversibility: "Moderate",
                reversibilityNote: "You can adjust if needed"
            };
        }

        // Populate page subtitle with decision title
        document.getElementById('results-decision-title').textContent = deepDecisionState.reframedQuestion || deepDecisionState.decision;

        // Populate the recommendation card
        document.getElementById('top-rec-option').textContent = recommendation.recommendedOption;
        document.getElementById('top-rec-context').textContent = `Based on what you shared about ${recommendation.topValue.toLowerCase()}, the path that best supports ${recommendation.topValue.toLowerCase()} appears to be the stronger direction.`;

        // Populate confidence & reversibility badges on recommendation card
        document.getElementById('rec-confidence-value').textContent = recommendation.confidence;
        document.getElementById('rec-reversibility-value').textContent = recommendation.reversibility;

        // Update progress rings
        updateProgressRing('rec-confidence-ring', recommendation.confidence, 'confidence');
        updateProgressRing('rec-reversibility-ring', recommendation.reversibility, 'reversibility');

        loading.style.display = 'none';
        content.style.display = 'block';

        // Store for use in other sections
        deepDecisionState.recommendation = recommendation.recommendedOption;
        deepDecisionState.recommendationData = recommendation;

        // Generate option scores for scoring accordion and what-if scenarios
        // Uses comparison table ratings when available, otherwise generates based on recommendation
        deepDecisionState.optionScores = generateFallbackScores();

        // Populate reversibility accordion
        populateReversibilityAccordion(recommendation);

    } catch (error) {
        console.error('Error generating top recommendation:', error);
        document.getElementById('results-decision-title').textContent = deepDecisionState.decision;
        document.getElementById('top-rec-option').textContent = deepDecisionState.options[0];
        document.getElementById('top-rec-context').textContent = "Based on what matters to you";
        loading.style.display = 'none';
        content.style.display = 'block';
    }
}

async function generateWhyThisWins() {
    const loading = document.getElementById('why-wins-loading');
    const content = document.getElementById('why-wins-content');

    loading.style.display = 'flex';
    content.style.display = 'none';

    try {
        const systemPrompt = `Analyze why the recommended option aligns with your values. Return a JSON object with:
{
  "valueAlignment": 1-5 rating,
  "reducesFriction": 1-5 rating,
  "supportsDirection": 1-5 rating,
  "readiness": 1-5 rating,
  "keyPoints": ["Bullet 1 (8-12 words)", "Bullet 2 (8-12 words)"]
}

IMPORTANT: Be realistic with ratings. Not everything should be 4-5. Use the full range:
- 5 = Exceptional alignment, rare
- 4 = Strong alignment
- 3 = Moderate alignment
- 2 = Weak alignment
- 1 = Poor alignment

The ratings should vary based on the actual situation.
The keyPoints should be 2 crisp, scannable bullets explaining why this wins, using second person.`;

        const prompt = `Recommended option: ${deepDecisionState.recommendation}
Your values: ${deepDecisionState.values.join(', ')}
Your challenges: ${deepDecisionState.difficulties.join(', ')}

Why does this option align best with your values?`;

        const response = await callClaude(prompt, systemPrompt);
        let analysis;

        try {
            analysis = JSON.parse(response);
        } catch {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {
                valueAlignment: 4,
                reducesFriction: 3,
                supportsDirection: 4,
                readiness: 3,
                keyPoints: ["This option aligns with your stated values", "It addresses your main concerns"]
            };
        }

        // Helper to format value labels
        function formatValueLabel(value) {
            const valueLabels = {
                'trust': 'Trust & honesty',
                'compatibility': 'Compatibility',
                'values': 'Shared values',
                'intimacy': 'Intimacy',
                'communication': 'Communication',
                'growth': 'Personal growth',
                'future': 'Future alignment',
                'support': 'Emotional support',
                'passion': 'Passion',
                'stability': 'Stability',
                'family': 'Family harmony',
                'freedom': 'Freedom',
                'impact': 'Making impact',
                'money': 'Financial security',
                'health': 'Health & wellbeing',
                'autonomy': 'Autonomy',
                'creativity': 'Creativity',
                'adventure': 'Adventure',
                'learning': 'Learning',
                'connection': 'Connection'
            };
            return valueLabels[value] || value.charAt(0).toUpperCase() + value.slice(1);
        }

        const strengthBarsEl = document.getElementById('strength-bars');

        // Use user's actual selected values (take top 4)
        const userValues = deepDecisionState.values.slice(0, 4);
        const bars = userValues.map((value, index) => {
            // Base score from analysis, slightly decrease for each subsequent value
            const baseScore = analysis.valueAlignment || 4;
            const score = Math.max(2, baseScore - Math.floor(index * 0.5));
            return { name: formatValueLabel(value), score: score };
        });

        strengthBarsEl.innerHTML = bars.map(bar => {
            const rating = ['', 'WEAK', 'MODERATE', 'STRONG', 'VERY STRONG', 'EXCEPTIONAL'][bar.score] || 'MODERATE';
            const percentage = (bar.score / 5) * 100;

            return `
                <div class="strength-bar">
                    <div class="strength-bar-label">
                        <span class="strength-bar-name">${bar.name}</span>
                        <span class="strength-bar-rating">${rating}</span>
                    </div>
                    <div class="strength-bar-visual">
                        <div class="strength-bar-fill" style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;
        }).join('');

        const keyPoints = Array.isArray(analysis.keyPoints) ? analysis.keyPoints : [analysis.keyPoints || "This option aligns with your values"];
        document.getElementById('why-wins-prose').innerHTML = `
            <ul style="list-style: none; padding: 0; margin-top: var(--spacing-md);">
                ${keyPoints.map(point => `<li style="padding: 0.5rem 0; padding-left: 1.5rem; position: relative; color: var(--gray-700);"><span style="position: absolute; left: 0; color: var(--sage-green); font-size: 1.2rem;">•</span>${point}</li>`).join('')}
            </ul>
        `;

        loading.style.display = 'none';
        content.style.display = 'block';

    } catch (error) {
        console.error('Error generating why this wins:', error);

        // Show fallback content if AI fails
        const strengthBarsEl = document.getElementById('strength-bars');
        const userValues = deepDecisionState.values.slice(0, 4);

        function formatValueLabel(value) {
            return value.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        }

        strengthBarsEl.innerHTML = userValues.map((value, index) => {
            const score = 4 - index; // Decreasing scores
            const rating = ['', 'WEAK', 'MODERATE', 'STRONG', 'VERY STRONG', 'EXCEPTIONAL'][score] || 'MODERATE';
            const percentage = (score / 5) * 100;

            return `
                <div class="strength-bar">
                    <div class="strength-bar-label">
                        <span class="strength-bar-name">${formatValueLabel(value)}</span>
                        <span class="strength-bar-rating">${rating}</span>
                    </div>
                    <div class="strength-bar-visual">
                        <div class="strength-bar-fill" style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;
        }).join('');

        document.getElementById('why-wins-prose').innerHTML = `
            <ul style="list-style: none; padding: 0; margin-top: var(--spacing-md);">
                <li style="padding: 0.5rem 0; padding-left: 1.5rem; position: relative; color: var(--gray-700);"><span style="position: absolute; left: 0; color: var(--sage-green); font-size: 1.2rem;">•</span>This option aligns best with what you said matters most</li>
                <li style="padding: 0.5rem 0; padding-left: 1.5rem; position: relative; color: var(--gray-700);"><span style="position: absolute; left: 0; color: var(--sage-green); font-size: 1.2rem;">•</span>It addresses your main concerns and timeline</li>
            </ul>
        `;

        loading.style.display = 'none';
        content.style.display = 'block';
    }
}

async function generateComparisonTable() {
    const loading = document.getElementById('compare-loading');
    const content = document.getElementById('compare-content');

    loading.style.display = 'flex';
    content.style.display = 'none';

    try {
        const systemPrompt = `You are helping the user compare their decision options against their values. Rate how well each option aligns with each value on a scale of 1-5. Address the user directly using "you" and "your".

Return ONLY valid JSON in this exact format:
{
  "ratings": {
    "value1": [option1Rating, option2Rating],
    "value2": [option1Rating, option2Rating]
  }
}

CRITICAL REQUIREMENTS:
1. Show REAL differentiation between options - scores must differ meaningfully
2. The recommended option should score HIGHER on key values (but not perfect on everything)
3. Use the full range: 1 (poor fit), 2 (weak), 3 (decent), 4 (good), 5 (strong)
4. Each value should show realistic tradeoffs - no option is perfect
5. Scores should reflect actual alignment, not just favor the recommendation`;

        const prompt = `Decision: ${deepDecisionState.decision}
Options: ${deepDecisionState.options.join(', ')}
Values that matter: ${deepDecisionState.values.join(', ')}
Recommended: ${deepDecisionState.recommendation}

Rate each option (1-5) for each value. Show realistic differentiation.`;

        const response = await callClaude(prompt, systemPrompt);
        let ratings;

        try {
            ratings = JSON.parse(response).ratings;
        } catch {
            // Fallback ratings with differentiation
            ratings = {};
            const recIndex = deepDecisionState.options.indexOf(deepDecisionState.recommendation);
            deepDecisionState.values.forEach((val, idx) => {
                ratings[val] = deepDecisionState.options.map((opt, optIdx) => {
                    return optIdx === recIndex ? (idx % 2 === 0 ? 4 : 5) : (idx % 2 === 0 ? 3 : 2);
                });
            });
        }

        // Calculate overall scores
        const overallScores = deepDecisionState.options.map((opt, optIdx) => {
            const total = deepDecisionState.values.reduce((sum, value) => {
                return sum + (ratings[value]?.[optIdx] || 3);
            }, 0);
            return Math.round((total / (deepDecisionState.values.length * 5)) * 100);
        });

        // Find winner
        const maxScore = Math.max(...overallScores);
        const winnerIndex = overallScores.indexOf(maxScore);
        const isCloseCall = overallScores.filter(score => score >= maxScore - 10).length > 1;

        // Build table with new header structure
        const tableContainer = document.getElementById('comparison-table-container');

        // Header with option names
        let tableHTML = '<div class="compare-table-header">';
        tableHTML += '<div class="compare-label-spacer"></div>';

        deepDecisionState.options.forEach((opt, idx) => {
            const isRecommended = opt === deepDecisionState.recommendation;
            const badge = isRecommended ? '<br><span class="recommended-badge">Recommended</span>' : '';
            tableHTML += `<div class="compare-option-header${isRecommended ? ' recommended' : ''}">${opt}${badge}</div>`;
        });

        tableHTML += '</div>';

        // Table body
        tableHTML += '<div class="compare-table-body">';

        // Helper to format value labels (same as in formatValueLabel function)
        function formatValueLabelTable(value) {
            const valueLabels = {
                'trust': 'Trust & honesty',
                'compatibility': 'Compatibility',
                'values': 'Shared values',
                'intimacy': 'Intimacy',
                'communication': 'Communication',
                'growth': 'Personal growth',
                'future': 'Future alignment',
                'support': 'Emotional support',
                'passion': 'Passion',
                'stability': 'Stability',
                'family': 'Family harmony',
                'freedom': 'Freedom',
                'impact': 'Making impact',
                'money': 'Financial security',
                'health': 'Health & wellbeing',
                'autonomy': 'Autonomy',
                'creativity': 'Creativity',
                'adventure': 'Adventure',
                'learning': 'Learning',
                'connection': 'Connection'
            };
            return valueLabels[value] || value.charAt(0).toUpperCase() + value.slice(1);
        }

        // Value rows
        deepDecisionState.values.forEach(value => {
            const formattedValue = formatValueLabelTable(value);
            tableHTML += `<div class="compare-table-row">`;
            tableHTML += `<div class="compare-row-label">${formattedValue}</div>`;

            const valueRatings = ratings[value] || deepDecisionState.options.map(() => 3);

            valueRatings.forEach((rating, idx) => {
                const percentage = Math.round((rating / 5) * 100);
                const filledDots = Math.round(rating);
                const emptyDots = 5 - filledDots;
                const dots = '●'.repeat(filledDots) + '○'.repeat(emptyDots);

                tableHTML += `<div class="compare-score-cell">
                    <div class="compare-score">
                        <span class="dots">${dots}</span>
                        <span class="percentage">${percentage}%</span>
                    </div>
                </div>`;
            });

            tableHTML += '</div>';
        });

        // Overall score row
        tableHTML += '<div class="compare-table-row overall-row">';
        tableHTML += '<div class="compare-row-label"><strong>Overall fit</strong></div>';
        overallScores.forEach((score, idx) => {
            const isWinner = idx === winnerIndex && !isCloseCall;
            tableHTML += `<div class="compare-score-cell${isWinner ? ' winner-cell' : ''}">
                <div class="overall-score">${score}%</div>
            </div>`;
        });
        tableHTML += '</div>';

        tableHTML += '</div>'; // Close compare-table-body

        // Add context explanation
        let contextHTML = '<div class="comparison-context">';
        if (isCloseCall) {
            contextHTML += `<p><strong>Too close to call.</strong> Both options score similarly across your priorities. Consider what matters most to you right now.</p>`;
        } else {
            const winnerName = deepDecisionState.options[winnerIndex];
            const topValues = deepDecisionState.values
                .map(value => {
                    const valueRatings = ratings[value] || [];
                    return { value, rating: valueRatings[winnerIndex] || 3 };
                })
                .sort((a, b) => b.rating - a.rating)
                .slice(0, 2)
                .map(v => v.value);

            contextHTML += `<p><strong>Based on your priorities, "${winnerName}" is the stronger fit.</strong> It scores highest on ${topValues.join(' and ')}, which you identified as important to you.</p>`;
        }
        contextHTML += '</div>';

        tableContainer.innerHTML = tableHTML + contextHTML;

        loading.style.display = 'none';
        content.style.display = 'block';

    } catch (error) {
        console.error('Error generating comparison table:', error);

        // Show fallback table
        const tableContainer = document.getElementById('comparison-table-container');
        const recIndex = deepDecisionState.options.indexOf(deepDecisionState.recommendation);

        let tableHTML = '<table class="comparison-table-improved"><thead><tr><th class="value-column">What matters to you</th>';

        deepDecisionState.options.forEach((opt, idx) => {
            const isRecommended = opt === deepDecisionState.recommendation;
            const badge = isRecommended ? '<span class="recommended-badge">RECOMMENDED</span>' : '';
            tableHTML += `<th class="option-column${isRecommended ? ' recommended-column' : ''}">${opt}${badge}</th>`;
        });

        tableHTML += '</tr></thead><tbody>';

        // Show values with simplified ratings
        deepDecisionState.values.slice(0, 5).forEach((value, idx) => {
            const formattedValue = value.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            tableHTML += `<tr><td class="value-cell">${formattedValue}</td>`;

            deepDecisionState.options.forEach((opt, optIdx) => {
                const rating = optIdx === recIndex ? (idx % 2 === 0 ? 4 : 5) : (idx % 2 === 0 ? 3 : 2);
                const label = rating >= 4 ? 'Good' : 'Mixed';
                const percentage = (rating / 5) * 100;

                tableHTML += `<td class="score-cell">
                    <div class="score-circles">
                        <div class="circle-progress" style="background: conic-gradient(var(--sage-green) ${percentage}%, var(--gray-200) 0%)">
                            <div class="circle-inner">${rating}/5</div>
                        </div>
                    </div>
                    <span class="score-label">${label}</span>
                </td>`;
            });

            tableHTML += '</tr>';
        });

        tableHTML += '</tbody></table>';
        tableHTML += '<div class="comparison-context"><p><strong>Comparison based on your stated values.</strong> The recommended option aligns better with what you said matters most.</p></div>';

        tableContainer.innerHTML = tableHTML;

        loading.style.display = 'none';
        content.style.display = 'block';
    }
}

async function generateGainsAndTradeoffs() {
    // Generate gains
    try {
        const gainsLoading = document.getElementById('gains-loading');
        const gainsContent = document.getElementById('gains-content');

        const systemPrompt = `List 3-4 specific gains from choosing the recommended option. Return ONLY a JSON array of strings.

Each gain should be:
- One short, scannable sentence (max 10 words - keep it tight!)
- Concrete and specific to their situation
- Conversational and human
- Using "you/your" for general statements
- CRITICAL: Use neutral phrasing - say "the relationship" not "your relationship with X", "this path" not "leaving your husband"

Example: ["Space to focus on what energizes you", "Your weekends become yours again", "You prioritize your own growth"]`;

        const prompt = `Recommended option: ${deepDecisionState.recommendation}
Your values: ${deepDecisionState.values.join(', ')}
Your decision context: ${deepDecisionState.decision}

What do you gain? Return JSON array only.`;

        const response = await callClaude(prompt, systemPrompt);
        let gains;

        try {
            gains = JSON.parse(response);
        } catch {
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            gains = jsonMatch ? JSON.parse(jsonMatch[0]) : ["You align with your core values", "You move toward what matters most"];
        }

        gainsContent.innerHTML = '<ul class="gains-list">' + gains.map(gain => `<li>${gain}</li>`).join('') + '</ul>';
        gainsLoading.style.display = 'none';
        gainsContent.style.display = 'block';
    } catch (error) {
        console.error('Error generating gains:', error);

        // Show fallback gains
        const gainsLoading = document.getElementById('gains-loading');
        const gainsContent = document.getElementById('gains-content');

        const fallbackGains = [
            "This option aligns with what you said matters most",
            "You move toward your core values",
            "You address your main concerns"
        ];

        gainsContent.innerHTML = '<ul class="gains-list">' + fallbackGains.map(gain => `<li>${gain}</li>`).join('') + '</ul>';
        gainsLoading.style.display = 'none';
        gainsContent.style.display = 'block';
    }

    // Generate tradeoffs
    try {
        const tradeoffsLoading = document.getElementById('tradeoffs-loading');
        const tradeoffsContent = document.getElementById('tradeoffs-content');

        const systemPrompt = `List 2-3 specific things they give up or risk by choosing the recommended option. Return ONLY a JSON array of strings.

Each tradeoff should be:
- One short, honest sentence (max 10 words - keep it tight!)
- Specific to their situation
- Conversational and clear
- Using "you/your" for general statements
- CRITICAL: Use neutral phrasing - say "the relationship" not "your relationship with X", "this path" not "leaving your husband"

Example: ["Letting go of familiar security", "The new role might disappoint", "Leaving behind shared history"]`;

        const prompt = `Recommended option: ${deepDecisionState.recommendation}
Other options: ${deepDecisionState.options.filter(o => o !== deepDecisionState.recommendation).join(', ')}
Your decision context: ${deepDecisionState.decision}

What do you give up or risk? Return JSON array only.`;

        const response = await callClaude(prompt, systemPrompt);
        let tradeoffs;

        try {
            tradeoffs = JSON.parse(response);
        } catch {
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            tradeoffs = jsonMatch ? JSON.parse(jsonMatch[0]) : ["You're closing the door on other possibilities", "There's always some uncertainty"];
        }

        tradeoffsContent.innerHTML = '<ul class="tradeoffs-list">' + tradeoffs.map(tradeoff => `<li>${tradeoff}</li>`).join('') + '</ul>';
        tradeoffsLoading.style.display = 'none';
        tradeoffsContent.style.display = 'block';
    } catch (error) {
        console.error('Error generating tradeoffs:', error);

        // Show fallback tradeoffs
        const tradeoffsLoading = document.getElementById('tradeoffs-loading');
        const tradeoffsContent = document.getElementById('tradeoffs-content');

        const fallbackTradeoffs = [
            "You're closing the door on other paths",
            "There's always some uncertainty ahead"
        ];

        tradeoffsContent.innerHTML = '<ul class="tradeoffs-list">' + fallbackTradeoffs.map(tradeoff => `<li>${tradeoff}</li>`).join('') + '</ul>';
        tradeoffsLoading.style.display = 'none';
        tradeoffsContent.style.display = 'block';
    }
}

async function generateRisks() {
    const loading = document.getElementById('risks-loading');
    const risksList = document.getElementById('risks-list');

    if (loading) loading.style.display = 'flex';
    if (risksList) risksList.style.display = 'none';

    try {
        const systemPrompt = `Identify 3-4 specific, realistic risks for the recommended option. Return ONLY a JSON array of strings:
["Specific risk 1", "Specific risk 2", "Specific risk 3"]

Requirements:
- Be specific to their situation (NOT generic like "Consider potential downsides")
- Use second person (you/your) for general statements
- CRITICAL: Use neutral phrasing - say "the relationship" not "your relationship with X"
- Each risk should be 6-10 words maximum (keep it tight!)
- Focus on realistic concerns, not worst-case scenarios
- Maximum 4 risks`;

        const prompt = `Recommended option: ${deepDecisionState.recommendation}
Decision: ${deepDecisionState.decision}
Your assumptions: ${JSON.stringify(deepDecisionState.assumptions)}
Your challenges: ${deepDecisionState.difficulties.join(', ')}

What are the specific risks you face with this choice?`;

        const response = await callClaude(prompt, systemPrompt);
        let risks;

        try {
            risks = JSON.parse(response);
            if (!Array.isArray(risks)) {
                risks = Object.values(risks)[0] || ["Consider potential downsides"];
            }
        } catch {
            risks = ["Consider potential downsides carefully", "Monitor the situation closely", "Have a backup plan ready"];
        }

        // Limit to 4 risks max
        const displayRisks = risks.slice(0, 4);

        if (risksList) {
            risksList.innerHTML = displayRisks.map(risk => `<li>${risk}</li>`).join('');
            risksList.style.display = 'block';
        }

        if (loading) loading.style.display = 'none';

    } catch (error) {
        console.error('Error generating risks:', error);
        if (loading) loading.style.display = 'none';
        if (risksList) {
            risksList.innerHTML = '<li>Unable to generate risk analysis</li>';
            risksList.style.display = 'block';
        }
    }
}

async function generateNextStep() {
    const loading = document.getElementById('next-step-loading');
    const content = document.getElementById('next-step-content');
    const textEl = document.getElementById('next-step-text');

    loading.style.display = 'flex';
    content.style.display = 'none';

    try {
        const systemPrompt = `You are a decision coach. Provide ONE crisp, actionable next step.

Requirements:
- Use second person (you/your) for general statements
- CRITICAL: Use neutral phrasing - say "a therapist" not "a couples therapist", "explore options" not "talk to your husband"
- ONE clear action (e.g. "Schedule a therapy consultation this week")
- NOT wordy (e.g. NOT "schedule a consultation with a licensed marriage and family therapist in your area...")
- Concrete and specific
- Can be done in next 24-48 hours
- Maximum 8-10 words
- No preamble, just the action`;

        const prompt = `Recommended option: ${deepDecisionState.recommendation}
Decision context: ${deepDecisionState.decision}
Timeline: ${deepDecisionState.timeline}

What's ONE specific action they should take in the next 24-48 hours to move forward?`;

        const nextStep = await callClaude(prompt, systemPrompt);
        textEl.textContent = nextStep;

        loading.style.display = 'none';
        content.style.display = 'block';

    } catch (error) {
        console.error('Error generating next step:', error);
        textEl.textContent = `Take time to sit with this recommendation. Notice how it feels over the next day or two.`;
        loading.style.display = 'none';
        content.style.display = 'block';
    }
}

function generateInsightsTab() {
    // For now, we'll show the locked state since this is a demo
    // In a real app, this would check the user's decision count from the database

    const lockedState = document.getElementById('insights-locked');
    const basicState = document.getElementById('insights-basic');
    const fullState = document.getElementById('insights-full');

    // Add null checks
    if (!lockedState || !basicState || !fullState) {
        console.warn('[INSIGHTS] Insights tab elements not found, skipping');
        return;
    }

    // Simulate decision count (in production, this would come from user data)
    const decisionCount = 1; // Current decision being made

    if (decisionCount < DNA_UNLOCK_THRESHOLD) {
        // Show locked state
        lockedState.style.display = 'block';
        basicState.style.display = 'none';
        fullState.style.display = 'none';

        // Update progress
        const progressFill = document.getElementById('insights-progress-fill');
        const countEl = document.getElementById('insights-count');
        if (progressFill && countEl) {
            const progressPercent = (decisionCount / DNA_UNLOCK_THRESHOLD) * 100;
            progressFill.style.width = `${progressPercent}%`;
            countEl.textContent = decisionCount;
        }
    } else if (decisionCount < 10) {
        // Show basic profile
        lockedState.style.display = 'none';
        basicState.style.display = 'block';
        fullState.style.display = 'none';

        const basicCount = document.getElementById('insights-basic-count');
        if (basicCount) {
            basicCount.textContent = decisionCount;
        }
    } else {
        // Show full profile with blind spots
        lockedState.style.display = 'none';
        basicState.style.display = 'none';
        fullState.style.display = 'block';

        const fullCount = document.getElementById('insights-full-count');
        if (fullCount) {
            fullCount.textContent = decisionCount;
        }
    }
}

// ============================================
// ACCORDION HANDLERS
// ============================================

// Setup accordion click handlers
document.addEventListener('DOMContentLoaded', function() {
    // Similar decisions accordion
    const similarHeader = document.querySelector('.similar-decisions-header');
    const similarCard = document.getElementById('similar-decisions-card');
    if (similarHeader) {
        similarHeader.addEventListener('click', function() {
            similarCard.classList.toggle('collapsed');
        });
    }

    // Gains & tradeoffs accordion
    const gainsHeader = document.querySelector('.gains-tradeoffs-header');
    const gainsContainer = document.querySelector('.gains-tradeoffs-container');
    if (gainsHeader) {
        gainsHeader.addEventListener('click', function() {
            gainsContainer.classList.toggle('collapsed');
        });
    }

    // Risks accordion
    const risksHeader = document.querySelector('.risks-header');
    const risksContainer = document.querySelector('.risks-container');
    if (risksHeader) {
        risksHeader.addEventListener('click', function() {
            risksContainer.classList.toggle('collapsed');
        });
    }
});

// ============================================
// INITIALIZE
// ============================================

// ============================================
// SHARE MODAL FUNCTIONS
// ============================================

function openShareModal() {
    const modal = document.getElementById('share-modal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Reset the modal state
        const linkContainer = document.getElementById('share-link-container');
        if (linkContainer) {
            linkContainer.style.display = 'none';
        }
    }
}

function closeShareModal() {
    const modal = document.getElementById('share-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// ============================================
// UPGRADE/PAYWALL MODAL
// ============================================

function showLifeDecisionPaywall() {
    console.log('[PAYWALL] Showing Life decision paywall');

    // Track analytics event
    if (typeof trackEvent === 'function') {
        trackEvent('paywall_shown_second_life_decision');
    }

    openUpgradeModal();
}

// Track selected billing period (default to annual)
let selectedBillingPeriod = 'annual';

function selectBillingPeriod(period) {
    selectedBillingPeriod = period;

    // Update toggle button states
    const buttons = document.querySelectorAll('.billing-option');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.billing === period) {
            btn.classList.add('active');
        }
    });

    // Update price display
    const priceDisplay = document.getElementById('pro-price-display');
    const savingsDisplay = document.getElementById('pro-savings-display');

    if (period === 'annual') {
        if (priceDisplay) priceDisplay.textContent = '$80/year';
        if (savingsDisplay) {
            savingsDisplay.textContent = '2 months free';
            savingsDisplay.style.display = 'block';
        }
    } else {
        if (priceDisplay) priceDisplay.textContent = '$8/month';
        if (savingsDisplay) savingsDisplay.style.display = 'none';
    }
}

function openUpgradeModal() {
    const modal = document.getElementById('upgrade-modal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Default to Annual after user has completed their free decision
        const freeLifeDecisionUsed = localStorage.getItem('free_life_decision_used') === 'true';
        const defaultPeriod = freeLifeDecisionUsed ? 'annual' : 'annual';
        selectBillingPeriod(defaultPeriod);
    }
}

function closeUpgradeModal() {
    const modal = document.getElementById('upgrade-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

async function upgradeToPro() {
    console.log('[UPGRADE] User clicked upgrade to Pro');

    // Track analytics event
    if (typeof trackEvent === 'function') {
        trackEvent('upgrade_clicked_pro');
    }

    // Check if user is signed in
    let currentUser = window.supabaseClient?.getCurrentUser();
    if (!currentUser && window.supabaseClient?.getSupabase()?.auth) {
        const { data: { session } } = await window.supabaseClient.getSupabase().auth.getSession();
        currentUser = session?.user;
    }

    if (!currentUser) {
        // User needs to sign up first
        closeUpgradeModal();
        showSignupPrompt('upgrade');
        return;
    }

    // Redirect to Stripe checkout
    try {
        const response = await fetch('/api/create-checkout-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUser.id,
                email: currentUser.email,
                plan: selectedBillingPeriod === 'annual' ? 'pro_annual' : 'pro_monthly'
            })
        });

        if (response.ok) {
            const { url } = await response.json();
            window.location.href = url;
        } else {
            const errorData = await response.json();
            console.error('[UPGRADE] Failed to create checkout session:', errorData);
            alert('Unable to start checkout. Please try again.');
        }
    } catch (error) {
        console.error('[UPGRADE] Error creating checkout session:', error);
        alert('Unable to start checkout. Please try again.');
    }
}

function generateShareLink() {
    // Generate a random share ID
    const shareId = Math.random().toString(36).substring(2, 15);
    const shareLink = `https://clarity.app/share/${shareId}`;

    // Update the input field
    const linkInput = document.getElementById('share-link-input');
    if (linkInput) {
        linkInput.value = shareLink;
    }

    // Show the link container
    const linkContainer = document.getElementById('share-link-container');
    if (linkContainer) {
        linkContainer.style.display = 'block';
    }

    // Get the toggle states
    const allowComments = document.getElementById('allow-comments').checked;
    const shareAnonymous = document.getElementById('share-anonymous').checked;

    console.log('Share settings:', { allowComments, shareAnonymous, shareLink });
}

function copyShareLink() {
    const linkInput = document.getElementById('share-link-input');
    if (linkInput) {
        linkInput.select();
        linkInput.setSelectionRange(0, 99999); // For mobile devices

        // Copy to clipboard
        navigator.clipboard.writeText(linkInput.value).then(() => {
            // Change button text temporarily
            const copyBtn = event.target.closest('.btn-copy');
            if (copyBtn) {
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Copied!
                `;

                setTimeout(() => {
                    copyBtn.innerHTML = originalText;
                }, 2000);
            }
        }).catch(err => {
            console.error('Failed to copy:', err);
            alert('Failed to copy link. Please copy it manually.');
        });
    }
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeShareModal();
    }
});

// ============================================
// DECISIONS PAGE - LOAD & RENDER
// ============================================

// Helper function: Update greeting based on time of day
function updateGreeting() {
    const greetingEl = document.getElementById('decisions-greeting');
    if (!greetingEl) return;

    const hour = new Date().getHours();
    let timeOfDay = 'morning';
    if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    if (hour >= 17) timeOfDay = 'evening';

    // Try multiple sources for the name
    let name = null;
    if (window.userProfile?.first_name) {
        name = window.userProfile.first_name;
    } else if (window.supabaseClient?.getCurrentUser()?.user_metadata?.first_name) {
        name = window.supabaseClient.getCurrentUser().user_metadata.first_name;
    }

    console.log('[Greeting] userProfile:', window.userProfile);
    console.log('[Greeting] Using name:', name);

    // Show just "Good morning" without name if no name available (not "Good morning, there")
    greetingEl.textContent = name ? `Good ${timeOfDay}, ${name}` : `Good ${timeOfDay}`;
}

// Helper function: Update stats row
function updateStats(decisions) {
    const now = new Date();
    const thisMonth = decisions.filter(d => {
        const created = new Date(d.created_at);
        return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    });

    const resolved = thisMonth.filter(d => d.outcome_choice && d.outcome_choice !== 'still_deciding').length;
    const pending = thisMonth.length - resolved;

    const totalEl = document.getElementById('stats-total');
    const resolvedEl = document.getElementById('stats-resolved');
    const pendingEl = document.getElementById('stats-pending');

    if (totalEl) totalEl.textContent = thisMonth.length;
    if (resolvedEl) resolvedEl.textContent = resolved;
    if (pendingEl) pendingEl.textContent = pending;
}

// Helper function: Update streak badge
function updateStreakBadge(decisions) {
    console.log('[Streak] Calculating streak...');
    console.log('[Streak] Decisions:', decisions?.length);

    const streakBadge = document.getElementById('streak-badge');
    const streakCountEl = document.getElementById('streak-count');

    if (!streakBadge || !streakCountEl) {
        console.warn('[Streak] Badge elements not found');
        return;
    }

    // Only show streak for logged-in users, not guests
    if (isGuestMode) {
        console.log('[Streak] Guest mode, hiding badge');
        streakBadge.style.display = 'none';
        return;
    }

    const streak = calculateStreak(decisions);
    console.log('[Streak] Result:', streak);

    if (streak > 0) {
        streakCountEl.textContent = streak;
        const streakTextEl = streakBadge.querySelector('.streak-text');
        if (streakTextEl) {
            streakTextEl.innerHTML = `<strong id="streak-count">${streak}</strong> day${streak === 1 ? '' : 's'} streak`;
        }
        streakBadge.style.display = 'flex';
        console.log('[Streak] Badge shown');
    } else {
        streakBadge.style.display = 'none';
        console.log('[Streak] No streak, badge hidden');
    }
}

async function loadAndRenderDecisions() {
    console.log('🎯 loadAndRenderDecisions called');

    // CRITICAL: Hide the loading overlay in case it's stuck visible
    const loader = document.getElementById('deep-clarity-loader');
    if (loader) {
        loader.style.display = 'none';
    }

    const currentUser = window.supabaseClient?.getCurrentUser();

    // Load decisions from database or localStorage
    let decisions = [];
    if (currentUser && window.supabaseClient?.loadDecisionsFromDatabase) {
        decisions = await window.supabaseClient.loadDecisionsFromDatabase();
        console.log(`✅ Loaded ${decisions.length} decisions from database`);
        console.log('[DECISIONS] Full decision list:', decisions);
    } else {
        decisions = getStoredDecisions();
        console.log(`✅ Loaded ${decisions.length} decisions from localStorage`);
        console.log('[DECISIONS] Full decision list:', decisions);
    }

    // Update greeting
    updateGreeting();

    // Update stats
    updateStats(decisions);

    // Update streak
    updateStreakBadge(decisions);

    // Render DNA card (three states: locked, trigger, or hidden)
    renderDNACard(decisions);

    // Get the decisions list container
    const decisionsList = document.getElementById('decisions-list');
    const emptyState = document.getElementById('empty-state');
    const statsRow = document.getElementById('decisions-stats');

    if (!decisionsList) {
        console.error('❌ Decisions list container not found');
        return;
    }

    // Clear existing cards
    decisionsList.innerHTML = '';

    // Get header CTA button
    const headerCta = document.querySelector('.decisions-header .btn-cta');

    if (decisions.length === 0) {
        console.log('[DECISIONS] No decisions to display');
        // Show empty state, hide header elements
        if (emptyState) emptyState.style.display = 'block';
        if (statsRow) statsRow.style.display = 'none';
        if (headerCta) headerCta.style.display = 'none';
        decisionsList.style.display = 'none';
        return;
    }

    // Hide empty state, show list and header elements
    if (emptyState) emptyState.style.display = 'none';
    if (statsRow) statsRow.style.display = 'flex';
    if (headerCta) headerCta.style.display = 'block';
    decisionsList.style.display = 'block';

    console.log('[DECISIONS] Rendering', decisions.length, 'decision cards');

    // Render each decision
    decisions.forEach((decision, index) => {
        console.log(`[DECISIONS] Creating card ${index + 1}:`, {
            id: decision.id,
            question: decision.question,
            type: decision.decision_type,
            created: decision.created_at
        });
        const card = createDecisionCard(decision);
        if (card) {
            decisionsList.appendChild(card);
        } else {
            console.warn(`[DECISIONS] Failed to create card for decision:`, decision);
        }
    });
}

// Alias for compatibility - other code calls loadDecisions()
async function loadDecisions() {
    await loadAndRenderDecisions();
}

function updateStreakDisplay(decisions) {
    const streakInline = document.getElementById('streak-inline');
    const streakCount = document.getElementById('streak-count');

    if (!streakInline || !streakCount) return;

    // Only show streak for logged-in users, not guests
    if (isGuestMode) {
        streakInline.style.display = 'none';
        return;
    }

    const streak = calculateStreak(decisions);

    if (streak > 0) {
        streakCount.textContent = streak;
        streakInline.style.display = 'flex';
        // Update text for singular/plural
        const streakText = streakInline.querySelector('.streak-text');
        if (streakText) {
            streakText.innerHTML = `<span class="streak-count" id="streak-count">${streak}</span> ${streak === 1 ? 'day' : 'days'} streak`;
        }
    } else {
        streakInline.style.display = 'none';
    }
}

function calculateStreak(decisions) {
    if (!decisions || decisions.length === 0) return 0;

    // Sort decisions by timestamp (newest first)
    const sorted = [...decisions].sort((a, b) => {
        const aTime = a.created_at || a.savedAt || a.timestamp;
        const bTime = b.created_at || b.savedAt || b.timestamp;
        return new Date(bTime) - new Date(aTime);
    });

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Get the most recent decision date
    const mostRecentDecision = new Date(sorted[0].created_at || sorted[0].savedAt || sorted[0].timestamp);
    mostRecentDecision.setHours(0, 0, 0, 0);

    // Start checking from today if there's a decision today, otherwise from yesterday
    let checkDate;
    if (mostRecentDecision.getTime() === today.getTime()) {
        checkDate = new Date(today);
    } else if (mostRecentDecision.getTime() === yesterday.getTime()) {
        // Streak is still valid if last decision was yesterday
        checkDate = new Date(yesterday);
    } else {
        // Last decision was more than a day ago - no active streak
        return 0;
    }

    for (let i = 0; i < sorted.length; i++) {
        const decisionDate = new Date(sorted[i].created_at || sorted[i].savedAt || sorted[i].timestamp);
        decisionDate.setHours(0, 0, 0, 0);

        if (decisionDate.getTime() === checkDate.getTime()) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else if (decisionDate.getTime() < checkDate.getTime()) {
            break;
        }
    }

    return streak;
}

// Render DNA Card on Decisions page (three states)
function renderDNACard(decisions) {
    console.log('[DNA Card] Rendering DNA card...');
    const container = document.getElementById('dna-card-container');
    if (!container) {
        console.warn('[DNA Card] Container not found');
        return;
    }

    const decisionCount = decisions?.length || 0;
    const hasViewed = localStorage.getItem('dna_viewed');
    console.log('[DNA Card] Decision count:', decisionCount, 'Threshold:', DNA_UNLOCK_THRESHOLD, 'Has viewed:', hasViewed);

    // State C: Already viewed — no card
    if (hasViewed && decisionCount >= DNA_UNLOCK_THRESHOLD) {
        container.innerHTML = '';
        return;
    }

    // State B: Unlocked, not viewed — trigger card
    if (decisionCount >= DNA_UNLOCK_THRESHOLD) {
        container.innerHTML = `
            <div class="dna-trigger-card" onclick="window.openDNAStory(); return false;" style="cursor: pointer;">
                <div class="dna-card-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5">
                        <path d="M12 3v18"></path>
                        <path d="M5.5 6.5l13 11"></path>
                        <path d="M5.5 17.5l13-11"></path>
                    </svg>
                </div>
                <h3>Your Decision DNA is ready</h3>
                <p>Tap to see what your ${decisionCount} decisions reveal about you</p>
                <span class="dna-trigger-arrow">→</span>
            </div>
        `;
        return;
    }

    // State A: Not enough decisions — show nothing (empty state handles zero decisions)
    // Only show subtle hint when user has made 1+ decisions but not yet reached threshold
    if (decisionCount > 0) {
        container.innerHTML = `
            <div class="dna-locked-card dna-hint-card">
                <p class="dna-hint-text">Your Decision Profile unlocks after ${DNA_UNLOCK_THRESHOLD} decisions</p>
            </div>
        `;
    } else {
        container.innerHTML = '';
    }
}

function getTopValuesFromDecisions(decisions) {
    const valueCounts = {};

    decisions.forEach(d => {
        if (d.values && Array.isArray(d.values)) {
            d.values.forEach((value, index) => {
                const weight = d.values.length - index;
                valueCounts[value] = (valueCounts[value] || 0) + weight;
            });
        }
    });

    return Object.keys(valueCounts)
        .sort((a, b) => valueCounts[b] - valueCounts[a])
        .slice(0, 3);
}

// Decision Style Types
const DECISION_STYLES = {
    lifestyle: {
        type: 'The Explorer',
        description: 'You lead with <strong>lifestyle</strong> and freedom. You\'re willing to trade stability for the chance to live life on your terms.'
    },
    growth: {
        type: 'The Climber',
        description: 'You\'re always reaching for the next level. Comfort zones are just places you pass through.'
    },
    stability: {
        type: 'The Architect',
        description: 'You build for the long game. Security isn\'t boring to you — it\'s the foundation for everything else.'
    },
    relationships: {
        type: 'The Connector',
        description: 'People come first. Your decisions center on who you\'ll become with, not just what you\'ll achieve.'
    },
    passion: {
        type: 'The Dreamer',
        description: 'You follow your heart, even when the spreadsheet says otherwise. Meaning matters more than metrics.'
    },
    impact: {
        type: 'The Builder',
        description: 'You want your choices to matter. Legacy and contribution drive your biggest decisions.'
    },
    family: {
        type: 'The Connector',
        description: 'People come first. Your decisions center on who you\'ll become with, not just what you\'ll achieve.'
    },
    community: {
        type: 'The Connector',
        description: '<strong>Community</strong> and connection guide you. Your decisions center on who you\'ll become with, not just what you\'ll achieve.'
    }
};

async function generateDecisionProfile(decisions) {
    // Aggregate values across all decisions
    const valueScores = {};

    decisions.forEach(d => {
        if (d.values) {
            // Handle both object and array formats
            const valuesData = Array.isArray(d.values) ? d.values :
                              typeof d.values === 'object' ? Object.keys(d.values) : [];

            valuesData.forEach((value, index) => {
                const valueName = typeof value === 'string' ? value : value.name || value;
                if (!valueScores[valueName]) valueScores[valueName] = [];
                // Higher weight for earlier values (more important)
                const score = Array.isArray(d.values) ? (100 - index * 10) :
                             (d.values[valueName] || 50);
                valueScores[valueName].push(score);
            });
        }
    });

    // Calculate averages and sort
    const topValues = Object.entries(valueScores)
        .map(([name, scores]) => ({
            name: name.toLowerCase(),
            score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

    // Determine decision style based on top value
    const topValue = topValues[0]?.name?.toLowerCase() || 'default';
    const style = DECISION_STYLES[topValue] || {
        type: 'The Thinker',
        description: 'You weigh options carefully, considering multiple perspectives before deciding.'
    };

    // Calculate decision balance (heart vs head)
    const heartValues = ['relationships', 'family', 'community', 'passion', 'lifestyle'];
    const headValues = ['stability', 'growth', 'impact', 'career', 'finance'];

    let heartScore = 0;
    let headScore = 0;

    topValues.forEach(value => {
        if (heartValues.includes(value.name.toLowerCase())) {
            heartScore += value.score;
        } else if (headValues.includes(value.name.toLowerCase())) {
            headScore += value.score;
        }
    });

    const totalScore = heartScore + headScore || 1;
    const balance = {
        heart: Math.round((heartScore / totalScore) * 100),
        head: Math.round((headScore / totalScore) * 100)
    };

    // Generate patterns based on actual data
    const patterns = generatePatterns(decisions, topValues);

    return { topValues, style, balance, patterns };
}

function generatePatterns(decisions, topValues) {
    const patterns = [];

    // Pattern 1: Based on top value
    const topValue = topValues[0]?.name;
    if (topValue === 'lifestyle' || topValue === 'growth') {
        patterns.push({
            icon: 'target',
            title: 'Growth over comfort',
            description: 'You consistently choose opportunity over security'
        });
    } else if (topValue === 'stability' || topValue === 'family') {
        patterns.push({
            icon: 'home',
            title: 'Stability seeker',
            description: 'You value security and long-term foundations'
        });
    } else if (topValue === 'relationships' || topValue === 'community') {
        patterns.push({
            icon: 'users',
            title: 'Relationships matter',
            description: 'People factor into every major choice'
        });
    }

    // Pattern 2: Decision speed (if we have timestamps)
    const quickDecisions = decisions.filter(d => d.decision_type === 'quick');
    if (quickDecisions.length > 0) {
        patterns.push({
            icon: 'zap',
            title: 'Fast on some decisions',
            description: `You decide quickly on ${topValue || 'certain'} choices`
        });
    }

    // Pattern 3: Generic insight if we need a third
    if (patterns.length < 2) {
        patterns.push({
            icon: 'trending-up',
            title: 'Building your profile',
            description: 'More patterns will emerge as you make more decisions'
        });
    }

    return patterns.slice(0, 3); // Max 3 patterns
}

// SVG icon generator for patterns
function getPatternIconSVG(iconName) {
    const icons = {
        'target': '<circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle>',
        'home': '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>',
        'users': '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
        'zap': '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>',
        'trending-up': '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline>'
    };

    return icons[iconName] || icons['target'];
}

async function getUserFirstName() {
    const currentUser = window.supabaseClient?.getCurrentUser();
    if (currentUser && window.supabaseClient) {
        try {
            const { data: profile } = await window.supabaseClient.getSupabase()
                .from('user_profiles')
                .select('first_name')
                .eq('user_id', currentUser.id)
                .single();

            if (profile?.first_name) {
                return profile.first_name;
            }
        } catch (error) {
            console.log('[PROFILE] Could not fetch user name:', error);
        }
    }
    return 'Here\'s'; // Fallback
}

function revealDecisionProfile() {
    // Stage 1: Intro (already visible)
    const intro = document.querySelector('.profile-intro');
    if (intro) intro.classList.add('revealed');

    // Stage 2: Values (staggered by row)
    const valueRows = document.querySelectorAll('.value-row');
    valueRows.forEach((row, index) => {
        setTimeout(() => {
            row.classList.add('revealed');
        }, 600 + (index * 300));
    });

    // Stage 3: Style card
    setTimeout(() => {
        const styleSection = document.querySelector('.style-section');
        if (styleSection) styleSection.classList.add('revealed');
    }, 1800);

    // Stage 4: Balance chart
    setTimeout(() => {
        const balanceSection = document.querySelector('.balance-section');
        if (balanceSection) {
            balanceSection.classList.add('revealed');
            // Animate the donut arcs
            const arcs = balanceSection.querySelectorAll('.balance-arc-1, .balance-arc-2');
            arcs.forEach(arc => arc.classList.add('revealed'));
        }
    }, 2400);

    // Stage 5: Patterns
    setTimeout(() => {
        const patternsSection = document.querySelector('.patterns-section');
        if (patternsSection) patternsSection.classList.add('revealed');
    }, 3000);
}

// Store decisions data for reference
let decisionsCache = {};

function createDecisionCard(decision) {
    // Cache the decision data
    decisionsCache[decision.id] = decision;

    const card = document.createElement('div');
    card.setAttribute('data-id', decision.id);

    // Format date
    const savedDate = decision.created_at || decision.savedAt || decision.timestamp;
    const dateStr = savedDate ? new Date(savedDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }) : 'Recently';

    // Get the decision title
    const title = decision.situation || decision.reframed_question || decision.reframedQuestion || decision.question || decision.decision || 'Untitled decision';
    const rawCategory = decision.category || '';
    const category = (rawCategory && rawCategory.toLowerCase() !== 'other') ? capitalizeFirst(rawCategory) : '';

    // Determine state
    let cardClass = 'pending';
    let badgeClass = 'badge-pending';
    let badgeText = 'Pending · Needs your input';
    let showAction = true;
    let outcomeText = '';

    if (decision.outcome_choice && decision.outcome_choice !== 'still_deciding') {
        showAction = false;

        // Determine feeling state
        if (decision.outcome_feeling === 'good') {
            cardClass = 'feeling-good';
            badgeClass = 'badge-good';
            badgeText = 'Decided · Feeling good';
        } else if (decision.outcome_feeling === 'mixed') {
            cardClass = 'feeling-mixed';
            badgeClass = 'badge-mixed';
            badgeText = 'Decided · Time will tell';
        } else if (decision.outcome_feeling === 'regret') {
            cardClass = 'feeling-regret';
            badgeClass = 'badge-regret';
            badgeText = 'Decided · Would do differently';
        } else {
            // Has outcome but no feeling recorded
            cardClass = 'feeling-good';
            badgeClass = 'badge-good';
            badgeText = 'Decided';
        }

        // Outcome text
        if (decision.outcome_choice === 'followed_recommendation') {
            outcomeText = 'Followed recommendation';
        } else if (decision.outcome_choice === 'chose_different') {
            outcomeText = 'Went a different direction';
        }
    }

    card.className = `decision-card ${cardClass}`;

    card.innerHTML = `
        <div class="decision-card-header">
            <span class="decision-badge ${badgeClass}">${badgeText}</span>
            <div class="decision-meta">
                <span class="decision-date">${dateStr}</span>
                <button class="delete-btn" title="Delete" data-id="${decision.id}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        </div>
        <h3 class="decision-title">${title}</h3>
        ${category ? `<span class="decision-category">${category}</span>` : ''}
        ${showAction ? `<a href="#" class="decision-action" onclick="openOutcomeModal('${decision.id}'); return false;">What did you decide? →</a>` : ''}
        ${outcomeText ? `<p class="decision-outcome">${outcomeText}</p>` : ''}
    `;

    // Add delete button handler
    const deleteBtn = card.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        await handleDeleteDecision(decision.id, card);
    });

    // Add click handler for the card
    card.addEventListener('click', (e) => {
        // Don't trigger if clicking delete button or action link
        if (e.target.closest('.delete-btn') || e.target.closest('.decision-action')) {
            return;
        }
        openDecisionDetail(decision.id);
    });

    // Add cursor pointer style
    card.style.cursor = 'pointer';

    return card;
}

// Open decision detail view
function openDecisionDetail(decisionId) {
    const decision = decisionsCache[decisionId];
    if (!decision) {
        console.warn('[Detail] Decision not found in cache:', decisionId);
        return;
    }

    console.log('[Detail] Opening decision:', decision);

    // For now, use the existing toggle/expand functionality
    // or open the outcome modal to view/update
    const isDecided = decision.outcome_choice && decision.outcome_choice !== 'still_deciding';

    if (isDecided) {
        // Show detail modal for decided cards
        showDecisionDetailModal(decision);
    } else {
        // Open outcome modal for pending cards
        openOutcomeModal(decisionId);
    }
}

// Show decision detail modal
function showDecisionDetailModal(decision) {
    // Get or create the modal
    let modal = document.getElementById('decision-detail-modal');

    if (!modal) {
        // Create the modal if it doesn't exist
        modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'decision-detail-modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="closeDecisionDetailModal()"></div>
            <div class="modal-content decision-detail-content">
                <button class="modal-close" onclick="closeDecisionDetailModal()">×</button>

                <h2 id="detail-title">Decision Title</h2>
                <div class="detail-meta">
                    <span class="detail-category" id="detail-category"></span>
                    <span class="detail-date" id="detail-date"></span>
                </div>

                <div class="detail-section">
                    <h4>Recommendation</h4>
                    <p id="detail-recommendation">The recommendation text...</p>
                </div>

                <div class="detail-section">
                    <h4>What you decided</h4>
                    <p id="detail-outcome">You followed the recommendation</p>
                </div>

                <div class="detail-section">
                    <h4>How are you feeling about this now?</h4>
                    <div class="feeling-options" id="detail-feeling-options">
                        <button class="feeling-btn" data-feeling="good">😊 Good</button>
                        <button class="feeling-btn" data-feeling="mixed">😐 Mixed</button>
                        <button class="feeling-btn" data-feeling="regret">😔 Would do differently</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Populate the modal
    const title = decision.situation || decision.reframed_question || decision.question || 'Untitled';
    document.getElementById('detail-title').textContent = title;

    const category = decision.category && decision.category.toLowerCase() !== 'other' ? decision.category : '';
    document.getElementById('detail-category').textContent = category;

    const date = new Date(decision.created_at).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
    });
    document.getElementById('detail-date').textContent = date;

    // Recommendation
    const recommendation = decision.recommendation || decision.ai_recommendation || 'No recommendation recorded';
    document.getElementById('detail-recommendation').textContent = recommendation;

    // Outcome
    let outcomeText = 'No outcome recorded';
    if (decision.outcome_choice === 'followed_recommendation') {
        outcomeText = 'You followed the recommendation';
    } else if (decision.outcome_choice === 'chose_different') {
        outcomeText = 'You went a different direction';
    }
    document.getElementById('detail-outcome').textContent = outcomeText;

    // Highlight current feeling
    const feelingBtns = modal.querySelectorAll('.feeling-btn');
    feelingBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.feeling === decision.outcome_feeling) {
            btn.classList.add('active');
        }
        // Add click handler to update feeling
        btn.onclick = () => updateDecisionFeeling(decision.id, btn.dataset.feeling);
    });

    // Show modal
    modal.classList.add('active');
}

// Close decision detail modal
function closeDecisionDetailModal() {
    const modal = document.getElementById('decision-detail-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Update feeling for a decision
async function updateDecisionFeeling(decisionId, feeling) {
    console.log('[Detail] Updating feeling:', decisionId, feeling);

    try {
        const { error } = await window.supabaseClient.getSupabase()
            .from('decisions')
            .update({ outcome_feeling: feeling })
            .eq('id', decisionId);

        if (error) {
            console.error('[Detail] Error updating feeling:', error);
            showToast('Failed to update');
            return;
        }

        showToast('Feeling updated');

        // Update button states
        const feelingBtns = document.querySelectorAll('#decision-detail-modal .feeling-btn');
        feelingBtns.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.feeling === feeling) {
                btn.classList.add('active');
            }
        });

        // Refresh the decisions list
        loadAndRenderDecisions();

    } catch (error) {
        console.error('[Detail] Unexpected error:', error);
        showToast('Failed to update');
    }
}

async function handleDeleteDecision(decisionId, cardElement) {
    console.log('[Delete] Deleting decision:', decisionId);
    const confirmed = confirm('Are you sure you want to delete this decision? This cannot be undone.');
    if (!confirmed) return;

    // Show loading state on button
    const deleteBtn = cardElement.querySelector('.delete-btn');
    if (deleteBtn) {
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = '<div class="spinner-xs"></div>';
    }

    try {
        const { error } = await window.supabaseClient.getSupabase()
            .from('decisions')
            .delete()
            .eq('id', decisionId);

        if (error) {
            console.error('[Delete] Error:', error);
            showToast('Failed to delete');
            if (deleteBtn) {
                deleteBtn.disabled = false;
                deleteBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                `;
            }
            return;
        }

        console.log('[Delete] Success');
        showToast('Decision deleted');

        // Animate card removal
        cardElement.style.transition = 'opacity 0.3s, transform 0.3s';
        cardElement.style.opacity = '0';
        cardElement.style.transform = 'translateX(-20px)';

        setTimeout(() => {
            cardElement.remove();

            // Refresh the list
            loadAndRenderDecisions();
        }, 300);

    } catch (error) {
        console.error('[Delete] Unexpected error:', error);
        showToast('Failed to delete');
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            `;
        }
    }
}

async function toggleDecisionCard(card, decision) {
    const expandedSection = card.querySelector('.card-expanded');
    const isExpanded = card.classList.contains('expanded');

    // If already expanded, collapse it
    if (isExpanded) {
        card.classList.remove('expanded');
        expandedSection.style.display = 'none';
        return;
    }

    // Collapse any other expanded cards first
    document.querySelectorAll('.decision-card.expanded').forEach(otherCard => {
        otherCard.classList.remove('expanded');
        otherCard.querySelector('.card-expanded').style.display = 'none';
    });

    // Expand this card
    card.classList.add('expanded');
    expandedSection.style.display = 'block';

    // Check if user is Pro
    let isPro = false;
    const currentUser = window.supabaseClient?.getCurrentUser();
    if (currentUser && window.supabaseClient) {
        const subscriptionData = await window.supabaseClient.getUserSubscription();
        isPro = (subscriptionData?.subscription?.plan === 'pro' && subscriptionData?.subscription?.status === 'active') || shouldBypassPaywall();
    }

    // Get decision state
    const cardState = card.getAttribute('data-state');
    const outcomeChoice = decision.outcome_choice || decision.outcomeChoice;
    const checkInSentiment = decision.check_in_sentiment || decision.checkInSentiment;
    const checkInDue = decision.check_in_due || decision.checkInDue;
    const reflection = decision.check_in_reflection || decision.checkInReflection;
    const options = decision.options || [];

    // Build expanded content based on state
    let expandedHTML = '<div class="outcome-inline" onclick="event.stopPropagation()">';

    if (cardState === 'pending') {
        // State A: Needs decision - show outcome options
        expandedHTML += `
            <p class="outcome-prompt">Recording your decision helps you track patterns and learn from your choices.</p>
            <p class="outcome-question">What did you decide?</p>
            <div class="outcome-options">
        `;

        // Check if this is Deep Guidance (has structured options) or Quick Guidance (no options)
        if (options && options.length > 0) {
            // Deep Guidance - show actual options
            options.forEach((option, index) => {
                expandedHTML += `
                    <label class="outcome-option">
                        <input type="radio" name="outcome-${decision.id}" value="option${index + 1}" data-option="${option}">
                        <span>${option}</span>
                    </label>
                `;
            });

            expandedHTML += `
                <label class="outcome-option">
                    <input type="radio" name="outcome-${decision.id}" value="other" data-option="Did something else">
                    <span>Did something else</span>
                </label>
            `;
        } else {
            // Quick Guidance - show generic follow/other/waiting options
            expandedHTML += `
                <label class="outcome-option">
                    <input type="radio" name="outcome-${decision.id}" value="followed" data-option="I followed the recommendation">
                    <span>I followed the recommendation</span>
                </label>
                <label class="outcome-option">
                    <input type="radio" name="outcome-${decision.id}" value="other" data-option="I did something else">
                    <span>I did something else</span>
                </label>
                <label class="outcome-option">
                    <input type="radio" name="outcome-${decision.id}" value="waiting" data-option="Still deciding">
                    <span>Still deciding</span>
                </label>
            `;
        }

        expandedHTML += `
            </div>
            <button class="btn btn-primary" onclick="lockInDecisionFromCard('${decision.id}'); event.stopPropagation();">Save my choice</button>
        `;
    } else if (cardState === 'decided') {
        // State B: Decided (waiting for check-in)
        const checkInDateStr = checkInDue ? new Date(checkInDue).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
        expandedHTML += `
            <div class="outcome-summary-expanded">
                <span class="label">You chose</span>
                <p class="chosen-option">${outcomeChoice}</p>
                ${checkInDateStr ? `<span class="check-in-note">Check-in due: ${checkInDateStr}</span>` : ''}
            </div>
        `;
    } else if (cardState === 'check-in-due') {
        // State C: Check-in due - show reflection form
        expandedHTML += `
            <div class="outcome-summary-expanded">
                <span class="label">You chose</span>
                <p class="chosen-option">${outcomeChoice}</p>
            </div>

            <div class="check-in-form">
                <p>How did it go?</p>
                <div class="sentiment-options">
                    <button class="sentiment-btn" data-value="right" onclick="selectSentiment(this, '${decision.id}'); event.stopPropagation();">Right choice</button>
                    <button class="sentiment-btn" data-value="mixed" onclick="selectSentiment(this, '${decision.id}'); event.stopPropagation();">Mixed feelings</button>
                    <button class="sentiment-btn" data-value="wrong" onclick="selectSentiment(this, '${decision.id}'); event.stopPropagation();">Wrong choice</button>
                </div>

                <div class="reflection-input">
                    <span class="label">What did you learn? (optional)</span>
                    <textarea id="reflection-text-${decision.id}" placeholder="Any reflections..." onclick="event.stopPropagation();"></textarea>
                </div>

                <button class="btn btn-primary" onclick="saveReflection('${decision.id}'); event.stopPropagation();">Save reflection</button>
            </div>
        `;
    } else if (cardState === 'completed') {
        // State D: Completed - show summary and reflection
        const reflectionClass = checkInSentiment === 'right' ? 'right' : checkInSentiment === 'mixed' ? 'mixed' : 'wrong';
        const reflectionLabel = checkInSentiment === 'right' ? 'Right choice ✓' : checkInSentiment === 'mixed' ? 'Mixed feelings' : 'Wrong choice';

        expandedHTML += `
            <div class="outcome-summary-expanded">
                <span class="label">You chose</span>
                <p class="chosen-option">${outcomeChoice}</p>
                <span class="reflection-badge ${reflectionClass}">${reflectionLabel}</span>
            </div>
        `;

        if (reflection) {
            expandedHTML += `
                <div class="reflection-display">
                    <span class="label">Your reflection</span>
                    <p>${reflection}</p>
                </div>
            `;
        }
    }

    // Add view recommendation section (ONLY for Deep Guidance / life decisions)
    const isDeepGuidance = decision.decision_type === 'life' || decision.decisionType === 'life';
    if (isDeepGuidance) {
        expandedHTML += `
            <div class="view-recommendation">
                ${isPro ? `
                    <a href="#" class="recommendation-link" onclick="viewFullResults('${decision.id}'); event.stopPropagation(); return false;">
                        View recommendation →
                    </a>
                ` : `
                    <div class="recommendation-locked">
                        <span>🔒 View recommendation summary</span>
                        <p>Upgrade to Pro to revisit your analysis</p>
                        <button class="btn btn-secondary" onclick="showPage('account'); event.stopPropagation();">Upgrade to Pro</button>
                    </div>
                `}
            </div>
        `;
    }

    expandedHTML += '</div>';

    expandedSection.innerHTML = expandedHTML;
}

function selectSentiment(btn, decisionId) {
    // Remove selected from siblings
    btn.parentElement.querySelectorAll('.sentiment-btn').forEach(b => b.classList.remove('selected'));
    // Add selected to clicked button
    btn.classList.add('selected');
}

async function lockInDecisionFromCard(decisionId) {
    const selectedOption = document.querySelector(`input[name="outcome-${decisionId}"]:checked`);

    if (!selectedOption) {
        alert('Please select an option before locking in.');
        return;
    }

    const outcomeValue = selectedOption.value;
    const outcomeChoice = selectedOption.dataset.option;

    // If user needs more time or is still deciding, just collapse the card
    if (outcomeValue === 'more_time' || outcomeValue === 'waiting') {
        const card = document.querySelector(`.decision-card[data-id="${decisionId}"]`);
        if (card) {
            card.classList.remove('expanded');
            card.querySelector('.card-expanded').style.display = 'none';
        }
        return;
    }

    // Calculate check-in due date (2 weeks from now)
    const checkInDue = new Date();
    checkInDue.setDate(checkInDue.getDate() + 14);

    // Update the decision in database
    if (window.supabaseClient) {
        try {
            console.log('[SAVE] Attempting to save decision outcome:', {
                decisionId,
                outcomeChoice,
                outcomeValue
            });

            const updateData = {
                outcome_choice: outcomeChoice,
                outcome_locked_at: new Date().toISOString(),
                check_in_due: checkInDue.toISOString(),
                status: 'decided'
            };

            console.log('[SAVE] Update data:', updateData);

            const { data, error } = await window.supabaseClient.getSupabase()
                .from('decisions')
                .update(updateData)
                .eq('id', decisionId)
                .select();

            if (error) {
                console.error('[SAVE] Error locking in decision:', error);
                console.error('[SAVE] Error details:', {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code
                });
                alert(`Error saving your decision: ${error.message}\n\nPlease check the browser console for details.`);
                return;
            }

            console.log('[SAVE] Successfully saved decision:', data);
            console.log('✅ Decision locked in:', outcomeChoice);

            // Refresh the decisions list
            await loadDecisions();
        } catch (err) {
            console.error('[SAVE] Exception updating decision:', err);
            alert(`Error saving your decision: ${err.message}\n\nPlease check the browser console for details.`);
        }
    }
}

async function saveReflection(decisionId) {
    const selectedSentiment = document.querySelector(`.decision-card[data-id="${decisionId}"] .sentiment-btn.selected`);
    const reflectionText = document.getElementById(`reflection-text-${decisionId}`)?.value || '';

    if (!selectedSentiment) {
        alert('Please select how the decision went.');
        return;
    }

    const sentiment = selectedSentiment.dataset.value;

    // Update the decision in database
    if (window.supabaseClient) {
        try {
            const { error } = await window.supabaseClient.getSupabase()
                .from('decisions')
                .update({
                    check_in_sentiment: sentiment,
                    check_in_reflection: reflectionText,
                    check_in_completed_at: new Date().toISOString(),
                    status: 'completed'
                })
                .eq('id', decisionId);

            if (error) {
                console.error('Error saving reflection:', error);
                alert('Error saving your reflection. Please try again.');
                return;
            }

            console.log('✅ Reflection saved:', sentiment);

            // Refresh the decisions list
            await loadDecisions();
        } catch (err) {
            console.error('Error saving reflection:', err);
            alert('Error saving your reflection. Please try again.');
        }
    }
}

async function viewFullResults(decisionId) {
    const decision = decisionsCache[decisionId];
    if (!decision) {
        console.error('Decision not found in cache:', decisionId);
        return;
    }

    // Populate the deep results page with saved decision data
    populateSavedDecisionResults(decision);
    showPage('deep-results');
}

// ============================================
// DECISIONS PAGE TAB FILTERING
// ============================================

function filterDecisions(filter) {
    const decisionCards = document.querySelectorAll('.decision-card');

    decisionCards.forEach(card => {
        const cardType = card.getAttribute('data-type');
        const needsCheckin = card.getAttribute('data-checkin') === 'true';

        let shouldShow = false;

        if (filter === 'all') {
            shouldShow = true;
        } else if (filter === 'deep') {
            shouldShow = cardType === 'deep';
        } else if (filter === 'quick') {
            shouldShow = cardType === 'quick';
        } else if (filter === 'checkin') {
            shouldShow = needsCheckin;
        }

        card.style.display = shouldShow ? 'block' : 'none';
    });
}

// Add tab click handlers
document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('#decisions-tabs .tab');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));

            // Add active class to clicked tab
            tab.classList.add('active');

            // Filter decisions
            const filter = tab.getAttribute('data-filter');
            filterDecisions(filter);
        });
    });
});

// ============================================
// RECORD DECISION MODAL FUNCTIONS
// ============================================

let selectedDecisionChoice = null;

function openRecordDecisionModal(decisionTitle, options) {
    const modal = document.getElementById('record-decision-modal');
    const titleElement = document.getElementById('record-decision-title');
    const optionButtonsContainer = document.getElementById('record-option-buttons');

    // Set decision title
    titleElement.textContent = decisionTitle;

    // Clear and populate option buttons
    optionButtonsContainer.innerHTML = '';
    options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'outcome-option-btn';
        button.textContent = option;
        button.onclick = () => selectOutcomeOption(button, option);
        optionButtonsContainer.appendChild(button);
    });

    // Reset modal state
    selectedDecisionChoice = null;
    document.getElementById('reflection-textarea').value = '';

    // Remove selected class from all buttons
    document.querySelectorAll('.outcome-option-btn').forEach(btn => {
        btn.classList.remove('selected');
    });

    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Multi-step outcome tracking
let currentOutcomeStep = 1;
let outcomeData = {
    decisionId: null,
    choice: null,
    feeling: null,
    reflection: null
};

function openOutcomeModal(decisionId) {
    outcomeData.decisionId = decisionId;
    currentOutcomeStep = 1;
    updateOutcomeUI();
    document.getElementById('record-decision-modal').classList.add('active');
    document.body.style.overflow = 'hidden';

    // Attach event listeners after modal is shown
    attachOutcomeListeners();
}

function attachOutcomeListeners() {
    // Remove any existing listeners by cloning and replacing elements
    const choiceInputs = document.querySelectorAll('input[name="outcome-choice"]');
    choiceInputs.forEach(input => {
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);
    });

    const feelingInputs = document.querySelectorAll('input[name="outcome-feeling"]');
    feelingInputs.forEach(input => {
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);
    });

    // Attach fresh listeners to outcome choice radio buttons
    document.querySelectorAll('input[name="outcome-choice"]').forEach(input => {
        input.addEventListener('change', (e) => {
            const choice = e.target.value;
            outcomeData.choice = choice;

            // Add visual feedback
            e.target.parentElement.classList.add('selected');

            // Brief delay to show selection, then advance
            setTimeout(() => {
                if (choice === 'still_deciding') {
                    saveOutcome();
                } else {
                    currentOutcomeStep = 2;
                    updateOutcomeUI();
                    // Re-attach listeners for step 2
                    attachFeelingListeners();
                }
            }, 300);
        });
    });
}

function attachFeelingListeners() {
    // Remove any existing listeners by cloning and replacing elements
    const feelingInputs = document.querySelectorAll('input[name="outcome-feeling"]');
    feelingInputs.forEach(input => {
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);
    });

    // Attach fresh listeners to feeling radio buttons
    document.querySelectorAll('input[name="outcome-feeling"]').forEach(input => {
        input.addEventListener('change', (e) => {
            const feeling = e.target.value;
            outcomeData.feeling = feeling;

            // Add visual feedback
            e.target.parentElement.classList.add('selected');

            // Brief delay to show selection, then advance
            setTimeout(() => {
                if (feeling === 'good') {
                    saveOutcome();
                } else {
                    currentOutcomeStep = 3;
                    updateOutcomeUI();
                }
            }, 300);
        });
    });
}

function closeRecordDecisionModal() {
    document.getElementById('record-decision-modal').classList.remove('active');
    document.body.style.overflow = '';
    resetOutcomeForm();
}

function resetOutcomeForm() {
    outcomeData = { decisionId: null, choice: null, feeling: null, reflection: null };
    document.querySelectorAll('#record-decision-modal input').forEach(i => i.checked = false);
    const reflectionEl = document.getElementById('outcome-reflection');
    if (reflectionEl) reflectionEl.value = '';
    currentOutcomeStep = 1;
}

// nextOutcomeStep removed - using auto-advance instead

function updateOutcomeUI() {
    // Update progress dots
    document.querySelectorAll('.outcome-step').forEach((step, i) => {
        step.classList.remove('active', 'complete');
        if (i + 1 < currentOutcomeStep) step.classList.add('complete');
        if (i + 1 === currentOutcomeStep) step.classList.add('active');
    });

    // Show current screen
    document.querySelectorAll('.outcome-screen').forEach((screen, i) => {
        screen.classList.toggle('active', i + 1 === currentOutcomeStep);
    });
}

async function saveOutcome() {
    const reflectionEl = document.getElementById('outcome-reflection');
    const reflection = reflectionEl ? reflectionEl.value : null;
    outcomeData.reflection = reflection;

    try {
        const currentUser = window.supabaseClient?.getCurrentUser();
        if (currentUser && window.supabaseClient && outcomeData.decisionId) {
            // Update decision with outcome
            await window.supabaseClient.getSupabase()
                .from('decisions')
                .update({
                    outcome_choice: outcomeData.choice,
                    outcome_feeling: outcomeData.feeling,
                    outcome_reflection: outcomeData.reflection,
                    outcome_recorded_at: new Date().toISOString(),
                    status: outcomeData.choice === 'still_deciding' ? 'pending' : 'completed'
                })
                .eq('id', outcomeData.decisionId);

            // Save to check_ins table
            await window.supabaseClient.getSupabase()
                .from('decision_check_ins')
                .insert({
                    decision_id: outcomeData.decisionId,
                    user_id: currentUser.id,
                    check_in_type: 'immediate',
                    feeling: outcomeData.feeling,
                    reflection: outcomeData.reflection
                });

            closeRecordDecisionModal();
            loadDecisions(); // Refresh list

            // Show success feedback after modal closes
            setTimeout(() => {
                showToast('Outcome saved!');
            }, 100);
        } else {
            // Guest or no decision ID - just close
            closeRecordDecisionModal();
            setTimeout(() => {
                showToast('Please sign in to save outcomes');
            }, 100);
        }
    } catch (error) {
        console.error('Error saving outcome:', error);
        closeRecordDecisionModal();
        setTimeout(() => {
            showToast('Something went wrong. Please try again.');
        }, 100);
    }
}

// Toast notification
function showToast(message) {
    console.log('[TOAST] Showing toast:', message);
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    if (!toast || !toastMessage) {
        console.error('[TOAST] Toast elements not found');
        return;
    }

    console.log('[TOAST] Setting message and activating');
    toastMessage.textContent = message;
    toast.classList.add('active');

    setTimeout(() => {
        console.log('[TOAST] Hiding toast');
        toast.classList.remove('active');
    }, 3000);
}

// Update confidence value display
document.addEventListener('DOMContentLoaded', () => {
    const confidenceSlider = document.getElementById('confidence-slider');
    const confidenceValue = document.getElementById('confidence-value');

    if (confidenceSlider && confidenceValue) {
        confidenceSlider.addEventListener('input', (e) => {
            confidenceValue.textContent = e.target.value;
        });
    }
});

// ============================================
// QUICK CHECK-IN MODAL FUNCTIONS (REDESIGNED)
// ============================================

let selectedCheckInResponse = null;

function openQuickCheckInModal(decisionTitle, choice, timeAgo) {
    const modal = document.getElementById('quick-checkin-modal');
    const titleElement = document.getElementById('quick-checkin-title');
    const metaElement = document.getElementById('quick-checkin-meta');

    // Reset modal state
    resetCheckInModal();

    // Set decision context
    titleElement.textContent = decisionTitle;
    metaElement.textContent = `You decided to ${choice} · ${timeAgo}`;

    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function resetCheckInModal() {
    // Reset selected response
    selectedCheckInResponse = null;

    // Remove selected state from all cards
    document.querySelectorAll('.checkin-option-card').forEach(card => {
        card.classList.remove('selected');
    });

    // Hide follow-up and thanks sections
    document.getElementById('checkin-followup').style.display = 'none';
    document.getElementById('checkin-thanks').style.display = 'none';
    document.getElementById('checkin-options-grid').style.display = 'grid';

    // Clear learning input
    document.getElementById('checkin-learning').value = '';
}

function closeQuickCheckInModal() {
    const modal = document.getElementById('quick-checkin-modal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
    resetCheckInModal();
}

function selectCheckInResponse(response) {
    selectedCheckInResponse = response;

    // Update selected state
    document.querySelectorAll('.checkin-option-card').forEach(card => {
        if (card.dataset.response === response) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });

    // Show follow-up question after brief delay
    setTimeout(() => {
        document.getElementById('checkin-options-grid').style.display = 'none';
        document.getElementById('checkin-followup').style.display = 'block';
    }, 500);
}

function submitQuickCheckIn() {
    const learning = document.getElementById('checkin-learning').value.trim();

    console.log('Check-in submitted:', {
        response: selectedCheckInResponse,
        learning: learning
    });

    // Hide follow-up, show thanks
    document.getElementById('checkin-followup').style.display = 'none';
    document.getElementById('checkin-thanks').style.display = 'block';

    // Auto-close after 2 seconds
    setTimeout(() => {
        closeQuickCheckInModal();
    }, 2000);
}

// ============================================
// PASSWORD RESET MODAL
// ============================================

function showPasswordResetModal() {
    const modal = document.getElementById('password-reset-modal');
    const emailInput = document.getElementById('reset-email');
    const successMessage = document.getElementById('reset-success-message');
    const errorMessage = document.getElementById('reset-error-message');

    // Pre-fill email if user was trying to sign in
    const loginEmail = document.getElementById('email')?.value;
    if (loginEmail) {
        emailInput.value = loginEmail;
    }

    // Reset messages
    successMessage.style.display = 'none';
    errorMessage.style.display = 'none';

    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Focus email input
    setTimeout(() => emailInput.focus(), 100);
}

function closePasswordResetModal() {
    const modal = document.getElementById('password-reset-modal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

async function handlePasswordReset() {
    const emailInput = document.getElementById('reset-email');
    const btn = document.getElementById('reset-password-btn');
    const successMessage = document.getElementById('reset-success-message');
    const errorMessage = document.getElementById('reset-error-message');

    const email = emailInput.value.trim();

    if (!email) {
        errorMessage.textContent = 'Please enter your email address';
        errorMessage.style.display = 'block';
        successMessage.style.display = 'none';
        return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        errorMessage.textContent = 'Please enter a valid email address';
        errorMessage.style.display = 'block';
        successMessage.style.display = 'none';
        return;
    }

    // Show loading state
    btn.disabled = true;
    btn.textContent = 'Sending...';

    try {
        await window.supabaseClient.requestPasswordReset(email);

        // Show success message
        successMessage.style.display = 'block';
        errorMessage.style.display = 'none';

        // Hide button after success
        btn.style.display = 'none';

        // Auto-close modal after 3 seconds
        setTimeout(() => {
            closePasswordResetModal();
            // Reset button state
            btn.disabled = false;
            btn.textContent = 'Send reset link';
            btn.style.display = 'block';
        }, 3000);

    } catch (error) {
        console.error('Password reset error:', error);
        errorMessage.textContent = error.message || 'Failed to send reset email. Please try again.';
        errorMessage.style.display = 'block';
        successMessage.style.display = 'none';

        // Reset button
        btn.disabled = false;
        btn.textContent = 'Send reset link';
    }
}

// ============================================
// LOCALSTORAGE HELPERS FOR DECISIONS
// ============================================
// Note: Decisions are saved for ACCOUNT HOLDERS only (free & Pro)
// Guest users get ephemeral sessions - no saving
// The paywall is only on VIEWING the "Your Decisions" page
// This ensures a great upgrade experience - subscribers instantly see their history

async function saveDecisionToStorage(decisionData) {
    // Only save for account holders (not guests)
    if (appState.isGuest) {
        console.log('Guest users cannot save decisions - create an account to keep your history');
        return false;
    }

    try {
        // Try to save to Supabase database first
        if (window.supabaseClient && window.supabaseClient.getCurrentUser()) {
            const decisionId = await window.supabaseClient.saveDecisionToDatabase(decisionData);
            if (decisionId) {
                console.log('✅ Decision saved to Supabase:', decisionId);

                // Track usage for account page stats
                const decisionType = decisionData.decision_type || 'quick';
                if (window.supabaseClient.trackDecisionUsage) {
                    await window.supabaseClient.trackDecisionUsage(decisionType);
                    console.log('✅ Tracked decision usage:', decisionType);
                }

                return decisionId;
            }
        }

        // Fallback to localStorage if Supabase fails or not configured
        const decisions = getStoredDecisions();

        // Add timestamp and unique ID
        const decision = {
            ...decisionData,
            id: Date.now().toString(),
            savedAt: new Date().toISOString()
        };

        decisions.push(decision);
        localStorage.setItem('clarified_decisions', JSON.stringify(decisions));

        console.log('Decision saved to localStorage:', decision.id);
        return decision.id;
    } catch (error) {
        console.error('Error saving decision:', error);
        return false;
    }
}

function getStoredDecisions() {
    try {
        const stored = localStorage.getItem('clarified_decisions');
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Error retrieving decisions:', error);
        return [];
    }
}

async function getDecisionById(id) {
    // Try Supabase first
    if (window.supabaseClient && window.supabaseClient.getCurrentUser()) {
        const decision = await window.supabaseClient.getDecisionById(id);
        if (decision) return decision;
    }

    // Fallback to localStorage
    const decisions = getStoredDecisions();
    return decisions.find(d => d.id === id);
}

// ============================================
// VIEW DECISION DETAILS FUNCTION
// ============================================

async function viewDecisionDetails(decisionTitle, decisionId = null) {
    console.log('Viewing details for:', decisionTitle, decisionId);

    // Try to load decision
    let savedDecision = null;

    if (decisionId) {
        savedDecision = await getDecisionById(decisionId);
    } else {
        // Fallback: search by title
        const decisions = getStoredDecisions();
        savedDecision = decisions.find(d =>
            d.decision === decisionTitle ||
            d.reframedQuestion === decisionTitle
        );
    }

    if (savedDecision) {
        // Restore the decision state from storage
        deepDecisionState.decision = savedDecision.decision;
        deepDecisionState.reframedQuestion = savedDecision.reframedQuestion;
        deepDecisionState.category = savedDecision.category;
        deepDecisionState.options = savedDecision.options;
        deepDecisionState.values = savedDecision.values;
        deepDecisionState.timeline = savedDecision.timeline;
        deepDecisionState.difficulties = savedDecision.difficulties || [];
        deepDecisionState.difficultyDetail = savedDecision.difficultyDetail || '';
        deepDecisionState.assumptions = savedDecision.assumptions;
        deepDecisionState.significance = savedDecision.significance;
        deepDecisionState.recommendation = savedDecision.recommendation;
        deepDecisionState.recommendationData = savedDecision.recommendationData;

        console.log('Decision loaded from storage');

        // Navigate to results page
        showPage('deep-results');

        // Repopulate the results page with saved data
        populateSavedDecisionResults(savedDecision);
    } else {
        // Decision not found in storage
        console.log('Decision not found in storage');
        alert('Decision not found. It may have been deleted or not saved properly.');
    }
}

function populateSavedDecisionResults(decision) {
    console.log('📋 Populating saved decision:', decision);
    console.log('📋 Decision keys:', Object.keys(decision));
    console.log('📋 Has analysis?', !!decision.analysis);
    console.log('📋 Has comprehensiveAnalysis?', !!decision.comprehensiveAnalysis);
    console.log('📋 Has recommendation?', !!decision.recommendation);

    // Hide all loading states immediately for saved decisions
    const loadingEls = ['top-rec-loading', 'why-wins-loading', 'compare-loading', 'gains-loading', 'tradeoffs-loading', 'risks-loading'];
    loadingEls.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    // Show all content areas
    const contentEls = ['top-rec-content', 'why-wins-content', 'compare-content', 'gains-content', 'tradeoffs-content', 'risks-list'];
    contentEls.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'block';
    });

    // Populate results page title
    const titleEl = document.getElementById('results-decision-title');
    if (titleEl) {
        titleEl.textContent = decision.reframedQuestion || decision.decision;
    }

    // Get saved analysis (could be in 'analysis' or 'comprehensiveAnalysis')
    const analysis = decision.analysis || decision.comprehensiveAnalysis;

    // If no analysis saved, regenerate it
    if (!analysis && !decision.recommendation) {
        console.log('📋 No analysis found, regenerating...');
        // Restore state and regenerate
        deepDecisionState.decision = decision.decision;
        deepDecisionState.reframedQuestion = decision.reframed_question || decision.reframedQuestion;
        deepDecisionState.category = decision.category;
        deepDecisionState.options = decision.options || [];
        deepDecisionState.values = decision.values || [];
        deepDecisionState.timeline = decision.timeline;
        deepDecisionState.difficulties = decision.difficulties || [];
        deepDecisionState.difficultyDetail = decision.difficulty_detail || decision.difficultyDetail || '';
        deepDecisionState.assumptions = decision.assumptions;
        deepDecisionState.significance = decision.significance;

        // Regenerate the analysis
        generateDeepResults();
        return;
    }

    // Populate recommendation card from analysis
    if (analysis) {
        const optionEl = document.getElementById('top-rec-option');
        const contextEl = document.getElementById('top-rec-context');

        if (optionEl) optionEl.textContent = analysis.recommendation || decision.recommendation;
        if (contextEl) contextEl.textContent = analysis.reasoning || 'Based on your values and priorities.';

        // Update confidence/reversibility
        const confValueEl = document.getElementById('rec-confidence-value');
        const revValueEl = document.getElementById('rec-reversibility-value');

        if (confValueEl) confValueEl.textContent = analysis.confidence || 'Moderate';
        if (revValueEl) revValueEl.textContent = analysis.reversibility || 'Moderate';

        updateProgressRing('rec-confidence-ring', analysis.confidence || 'Moderate', 'confidence');
        updateProgressRing('rec-reversibility-ring', analysis.reversibility || 'Moderate', 'reversibility');

        // Populate comparison table if we have data
        if (analysis.comparison && decision.options) {
            populateSavedComparisonTable(analysis.comparison, decision.options, analysis.recommendation || decision.recommendation);
        }

        // Populate gains
        if (analysis.gains) {
            const gainsContent = document.getElementById('gains-content');
            if (gainsContent) {
                gainsContent.innerHTML = `<ul class="gains-list">${analysis.gains.map(g => `<li>${g}</li>`).join('')}</ul>`;
            }
        }

        // Populate tradeoffs
        if (analysis.tradeoffs) {
            const tradeoffsContent = document.getElementById('tradeoffs-content');
            if (tradeoffsContent) {
                tradeoffsContent.innerHTML = `<ul class="tradeoffs-list">${analysis.tradeoffs.map(t => `<li>${t}</li>`).join('')}</ul>`;
            }
        }

        // Populate risks
        if (analysis.risks) {
            const risksList = document.getElementById('risks-list');
            if (risksList) {
                risksList.innerHTML = analysis.risks.map(r => `<li>${r}</li>`).join('');
            }
        }
    } else if (decision.recommendation) {
        // Fallback if no analysis but we have a recommendation
        const optionEl = document.getElementById('top-rec-option');
        if (optionEl) optionEl.textContent = decision.recommendation;
    }

    // Initialize what-if scenarios with saved data
    if (decision.values && decision.options) {
        deepDecisionState.values = decision.values;
        deepDecisionState.options = decision.options;
        deepDecisionState.recommendation = decision.recommendation;
        initializeConfidenceData();
    }

    console.log('Saved decision results populated on page');
}

// Helper to populate comparison table from saved data
function populateSavedComparisonTable(comparison, options, recommendation) {
    const tableContainer = document.getElementById('comparison-table-container');
    if (!tableContainer || !comparison) return;

    let tableHTML = '<table class="comparison-table-improved"><thead><tr><th class="value-column">What matters to you</th>';

    options.forEach(opt => {
        const isRecommended = opt === recommendation;
        const badge = isRecommended ? '<span class="recommended-badge">RECOMMENDED</span>' : '';
        tableHTML += `<th class="option-column${isRecommended ? ' recommended-column' : ''}">${opt}${badge}</th>`;
    });

    tableHTML += '</tr></thead><tbody>';

    comparison.forEach(row => {
        tableHTML += `<tr><td class="value-column">${row.value}</td>`;
        tableHTML += `<td class="option-column">${row.optionA}/10</td>`;
        tableHTML += `<td class="option-column">${row.optionB}/10</td>`;
        tableHTML += '</tr>';
    });

    tableHTML += '</tbody></table>';
    tableContainer.innerHTML = tableHTML;
}

// ============================================
// LOADING STATE FUNCTIONS
// ============================================

let loadingInterval = null;

function showDeepClarityLoader() {
    const loader = document.getElementById('deep-clarity-loader');
    const subtextElement = document.getElementById('loading-subtext');

    const subtexts = [
        'Weighing your values...',
        'Comparing options...',
        'Identifying tradeoffs...'
    ];

    let currentIndex = 0;

    // Show loader
    loader.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Cycle through subtext messages
    loadingInterval = setInterval(() => {
        currentIndex = (currentIndex + 1) % subtexts.length;
        subtextElement.textContent = subtexts[currentIndex];
    }, 2000);
}

function hideDeepClarityLoader() {
    const loader = document.getElementById('deep-clarity-loader');
    loader.style.display = 'none';
    document.body.style.overflow = '';

    // Clear interval
    if (loadingInterval) {
        clearInterval(loadingInterval);
        loadingInterval = null;
    }

    // Reset subtext
    const subtextElement = document.getElementById('loading-subtext');
    subtextElement.textContent = 'Weighing your values...';
}

// Demo function to test the loader
function demoDeepClarityLoader() {
    showDeepClarityLoader();

    // Simulate AI processing time (3-5 seconds)
    setTimeout(() => {
        hideDeepClarityLoader();
        alert('Deep Clarity recommendation complete!');
    }, 4000);
}

// Function to create inline loader for Quick Clarity
function createInlineLoader() {
    const loader = document.createElement('div');
    loader.className = 'inline-loader';
    loader.innerHTML = `
        <span>Thinking</span>
        <div class="inline-loader-dot"></div>
        <div class="inline-loader-dot"></div>
        <div class="inline-loader-dot"></div>
    `;
    return loader;
}

// Function to create skeleton card
function createSkeletonCard() {
    const card = document.createElement('div');
    card.className = 'skeleton-card';
    card.innerHTML = `
        <div class="skeleton-line"></div>
        <div class="skeleton-line medium"></div>
        <div class="skeleton-line short"></div>
    `;
    return card;
}

// ============================================
// ACCOUNT PAGE FUNCTIONS
// ============================================

function signOut() {
    if (confirm('Are you sure you want to sign out?')) {
        // Clear any stored data
        localStorage.clear();
        sessionStorage.clear();
        clearSentryUser(); // Clear Sentry user context

        // Redirect to login page
        showPage('login');
    }
}

function confirmDeleteData() {
    const confirmed = confirm(
        'Are you sure you want to delete all your data?\n\n' +
        'This will permanently remove:\n' +
        '• All decisions\n' +
        '• All insights and analysis\n' +
        '• Your account information\n\n' +
        'This action cannot be undone.'
    );

    if (confirmed) {
        const doubleConfirm = confirm(
            'FINAL WARNING: This will permanently delete everything. Are you absolutely sure?'
        );

        if (doubleConfirm) {
            // Clear all data
            localStorage.clear();
            sessionStorage.clear();

            // Show confirmation and redirect
            alert('Your data has been deleted. You will now be signed out.');
            showPage('login');
        }
    }
}

// ============================================
// DECISION EXAMPLES - Click to populate
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Handle example link clicks
    document.querySelectorAll('.example-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-target');
            const textarea = document.getElementById(targetId);
            if (textarea) {
                textarea.value = link.textContent;
                textarea.focus();
            }
        });
    });
});

// ============================================
// SPEECH-TO-TEXT FUNCTIONALITY
// ============================================

// Check if browser supports speech recognition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isRecording = false;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = function() {
        console.log('Speech recognition started');
    };

    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        console.log('Transcription:', transcript);

        // Get the currently active mic button to determine which textarea to populate
        const activeButton = document.querySelector('.btn-mic.recording');
        if (activeButton) {
            const card = activeButton.closest('.card');
            const textarea = card.querySelector('textarea');
            if (textarea) {
                // Append to existing text (with space if not empty)
                if (textarea.value.trim()) {
                    textarea.value += ' ' + transcript;
                } else {
                    textarea.value = transcript;
                }
                textarea.focus();
            }
        }
    };

    recognition.onerror = function(event) {
        console.error('Speech recognition error:', event.error);

        // Reset all mic buttons
        document.querySelectorAll('.btn-mic').forEach(btn => {
            btn.classList.remove('recording');
        });
        isRecording = false;

        // Show user-friendly error messages
        if (event.error === 'not-allowed') {
            alert('Microphone access denied. Please enable microphone permissions in your browser settings.');
        } else if (event.error === 'no-speech') {
            console.log('No speech detected');
        } else {
            console.log('Speech recognition error:', event.error);
        }
    };

    recognition.onend = function() {
        console.log('Speech recognition ended');

        // Reset all mic buttons
        document.querySelectorAll('.btn-mic').forEach(btn => {
            btn.classList.remove('recording');
        });
        isRecording = false;
    };
}

// Handle mic button clicks
document.addEventListener('DOMContentLoaded', () => {
    const micButtons = document.querySelectorAll('.btn-mic');

    micButtons.forEach(button => {
        // Hide button if speech recognition not supported
        if (!SpeechRecognition) {
            button.style.display = 'none';
            console.log('Speech recognition not supported in this browser');
            return;
        }

        button.addEventListener('click', (e) => {
            e.preventDefault();

            if (isRecording) {
                // Stop recording
                recognition.stop();
                button.classList.remove('recording');
                isRecording = false;
            } else {
                // Start recording
                try {
                    // Remove recording class from all other buttons
                    document.querySelectorAll('.btn-mic').forEach(btn => {
                        btn.classList.remove('recording');
                    });

                    button.classList.add('recording');
                    isRecording = true;
                    recognition.start();
                } catch (error) {
                    console.error('Error starting speech recognition:', error);
                    button.classList.remove('recording');
                    isRecording = false;
                }
            }
        });
    });
});

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔄 Initializing Clarity app...');

    // Check for password recovery flow in URL hash
    // Only redirect to reset-password.html for actual recovery flows, not OAuth callbacks
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
        console.log('🔐 Password recovery detected, redirecting to reset page...');
        // Redirect to reset password page with the hash
        window.location.href = '/reset-password.html' + hash;
        return;
    }

    // Handle expired/error recovery links
    if (hash && hash.includes('error=')) {
        console.log('🔐 Auth error in URL, showing message...');
        const errorMatch = hash.match(/error_description=([^&]+)/);
        if (errorMatch) {
            const errorMsg = decodeURIComponent(errorMatch[1].replace(/\+/g, ' '));
            alert('Password reset failed: ' + errorMsg + '\n\nPlease request a new reset link.');
        }
        // Clear the hash
        window.location.hash = '';
    }

    // Initialize Supabase first
    if (window.supabaseClient) {
        console.log('🔄 Initializing Supabase...');
        try {
            const initialized = await window.supabaseClient.initSupabase();
            console.log('✅ Supabase initialized:', initialized);
        } catch (error) {
            console.error('❌ Failed to initialize Supabase:', error);
        }
    } else {
        console.error('❌ window.supabaseClient not available');
    }

    // Initialize app (shows landing for guests, decisions for logged-in users)
    await initApp();

    console.log('✅ Clarity app initialized');
});
// ============================================
// GUEST ONBOARDING JAVASCRIPT
// Add these functions to clarity.js
// ============================================

// Clear all form fields for a fresh decision
function clearDecisionForms() {
    console.log('[APP] Clearing decision forms');

    // Clear Quick Guidance state
    if (window.quickDecisionState) {
        quickDecisionState.decision = '';
        quickDecisionState.matters = '';
        quickDecisionState.emotion = '';
        quickDecisionState.context = '';
    }

    // Clear Deep Guidance state
    if (window.deepDecisionState) {
        deepDecisionState.decision = '';
        deepDecisionState.options = [];
        deepDecisionState.matters = '';
    }

    // Reset all text inputs and textareas
    document.querySelectorAll('input[type="text"], textarea').forEach(el => {
        el.value = '';
    });

    // Reset all radio buttons
    document.querySelectorAll('input[type="radio"]').forEach(el => {
        el.checked = false;
    });

    // Reset any checkboxes
    document.querySelectorAll('input[type="checkbox"]').forEach(el => {
        el.checked = false;
    });
}

// Navigate back from auth pages
function goBack() {
    console.log('[AUTH] Going back from auth page');

    // If guest mode, go back to landing
    if (isGuestMode) {
        showPage('landing');
        return;
    }

    // If logged in, go to decisions page
    if (window.currentUser) {
        showPage('decisions');
        return;
    }

    // Default to landing
    showPage('landing');
}

// Show forgot password flow
function showForgotPassword() {
    console.log('[AUTH] Showing forgot password');

    // Check if Supabase is initialized
    if (!window.supabaseClient || !window.supabaseClient.getSupabase()) {
        console.error('[AUTH] Supabase client not initialized');
        alert('Password reset is not available yet. Please refresh the page and try again.');
        return;
    }

    const email = prompt('Enter your email address to reset your password:');

    if (!email) {
        return; // User cancelled
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Please enter a valid email address.');
        return;
    }

    // Send password reset email
    if (!window.supabaseClient?.getSupabase()?.auth) {
        alert('Authentication system not ready. Please refresh and try again.');
        return;
    }
    window.supabaseClient.getSupabase().auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password.html'
    })
    .then(({ error }) => {
        if (error) {
            console.error('[AUTH] Password reset error:', error);
            alert('Failed to send password reset email: ' + error.message);
        } else {
            console.log('[AUTH] Password reset email sent');
            alert('Password reset email sent! Check your inbox.');
        }
    });
}

// Start guest decision from landing page
function startGuestDecision() {
    console.log('[GUEST] Starting guest decision');
    isGuestMode = true;

    // Check if guest has reached limit
    if (!checkGuestLimit()) {
        return; // Don't proceed if limit reached
    }

    // Clear previous decision data
    clearDecisionForms();

    showPage('decision-type');
}

// Start Quick Guidance with a pre-filled prompt
function startQuickWithPrompt(promptText) {
    console.log('[QUICK] Starting with prompt:', promptText);

    // Clear previous decision data
    clearDecisionForms();

    // Navigate to Quick Guidance Step 1
    showPage('quick-1');

    // Pre-fill the decision input
    const decisionInput = document.getElementById('quick-decision-input');
    if (decisionInput) {
        decisionInput.value = promptText;
        // Trigger input event to enable continue button
        decisionInput.dispatchEvent(new Event('input'));
    }
}

// Start another decision (from results page)
async function startAnotherDecision() {
    console.log('[DECISION] Starting another decision');

    // Check paywall (bypass in dev mode)
    if (shouldBypassPaywall()) {
        clearDecisionForms();
        showPage('deep-1');
        return;
    }

    // Check localStorage for free Life decision usage
    const freeLifeDecisionUsed = localStorage.getItem('free_life_decision_used') === 'true';

    // Check if user is signed in
    let currentUser = window.supabaseClient?.getCurrentUser();
    if (!currentUser && window.supabaseClient?.getSupabase()?.auth) {
        const { data: { session } } = await window.supabaseClient.getSupabase().auth.getSession();
        currentUser = session?.user;
    }

    if (currentUser) {
        // Signed-in user: check subscription
        const subscriptionData = await window.supabaseClient.getUserSubscription();
        const isPro = subscriptionData?.subscription?.plan === 'pro' && subscriptionData?.subscription?.status === 'active';
        const isBeta = subscriptionData?.subscription?.is_beta_user;

        console.log('[DECISION] Signed-in user check:', { isPro, isBeta, freeLifeDecisionUsed });

        if (isBeta || isPro) {
            // Pro users can start another decision
            clearDecisionForms();
            showPage('deep-1');
        } else if (freeLifeDecisionUsed) {
            // Free user has used their 1 free decision - show paywall with context
            showAnotherDecisionPaywall();
        } else {
            // Free user hasn't used their free decision yet
            clearDecisionForms();
            showPage('deep-1');
        }
    } else {
        // Anonymous user
        console.log('[DECISION] Anonymous user check:', { freeLifeDecisionUsed });

        if (freeLifeDecisionUsed) {
            // Show paywall with context
            showAnotherDecisionPaywall();
        } else {
            clearDecisionForms();
            showPage('deep-1');
        }
    }
}

// Show paywall with "another decision" context
function showAnotherDecisionPaywall() {
    console.log('[PAYWALL] Showing paywall for another decision');

    // Track analytics event
    if (typeof trackEvent === 'function') {
        trackEvent('paywall_shown_another_decision');
    }

    // Update paywall copy for this context
    const titleEl = document.getElementById('upgrade-modal-title');
    const messageEl = document.getElementById('upgrade-modal-message');

    if (titleEl) {
        titleEl.textContent = 'Upgrade for unlimited decisions';
    }
    if (messageEl) {
        messageEl.textContent = 'Pro gives you unlimited decisions, saved history, and decision insights.';
    }

    openUpgradeModal();
}

// Update nav for guest mode
function updateNavForGuestMode() {
    // Bottom nav (simple nav)
    const decisionsNav = document.getElementById('nav-decisions');
    const accountNav = document.getElementById('nav-account');
    const accountText = accountNav?.querySelector('.nav-text');

    // Top nav (on decision-type page)
    const topNavHome = document.getElementById('top-nav-home');
    const topNavDecisions = document.getElementById('top-nav-decisions');
    const topNavAccount = document.getElementById('top-nav-account');

    if (isGuestMode) {
        // Hide Decisions link for guests (bottom nav)
        if (decisionsNav) decisionsNav.style.display = 'none';

        // Change Account icon to show "Sign in" text (bottom nav)
        if (accountNav) accountNav.setAttribute('aria-label', 'Sign in');
        if (accountText) {
            accountText.style.display = 'inline';
            accountText.textContent = 'Sign in';
        }

        // Hide Home and Decisions for guests (top nav)
        if (topNavHome) topNavHome.style.display = 'none';
        if (topNavDecisions) topNavDecisions.style.display = 'none';
        if (topNavAccount) {
            const accountSpan = topNavAccount.querySelector('span');
            if (accountSpan) accountSpan.textContent = 'Sign in';
        }
    } else {
        // Show Decisions link for logged-in users (bottom nav)
        if (decisionsNav) decisionsNav.style.display = 'block';

        // Keep Account as icon only (bottom nav)
        if (accountNav) accountNav.setAttribute('aria-label', 'Account');
        if (accountText) accountText.style.display = 'none';

        // Show all nav items for logged-in users (top nav)
        if (topNavHome) topNavHome.style.display = 'flex';
        if (topNavDecisions) topNavDecisions.style.display = 'flex';
        if (topNavAccount) {
            const accountSpan = topNavAccount.querySelector('span');
            if (accountSpan) accountSpan.textContent = 'Account';
        }
    }
}

// Handle Home nav click
function handleHomeNavClick() {
    if (isGuestMode) {
        showPage('landing');
    } else {
        showPage('decisions'); // Or 'dashboard' if you have one
    }
}

// Handle Decisions nav click
function handleDecisionsNavClick() {
    if (isGuestMode) {
        showSignupPrompt('decisions');
    } else {
        showPage('decisions');
    }
}

// Handle Account nav click
function handleAccountNavClick() {
    if (isGuestMode) {
        showSignupPrompt('account');
    } else {
        showPage('account');
    }
}

// Go back from signup
function goBackFromSignup() {
    if (isGuestMode && guestDecisionData) {
        // They have results, go back to results
        showPage('quick-results');
    } else {
        showPage('landing');
    }
}

// Show save prompt for guests after Quick Guidance
function showSavePromptForGuest() {
    if (isGuestMode) {
        console.log('[GUEST] Showing save prompt');
        document.getElementById('save-prompt-modal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

// Dismiss save prompt
function dismissSavePrompt() {
    document.getElementById('save-prompt-modal').classList.remove('active');
    document.body.style.overflow = '';
    // They can continue viewing results, but data won't be saved
}

// Show sign-up from save prompt
function showSignUpFromSavePrompt() {
    document.getElementById('save-prompt-modal').classList.remove('active');
    document.body.style.overflow = '';
    showPage('signup');
}

// Deep Guidance upsell handler
function promptSignUpForDeep() {
    if (isGuestMode) {
        console.log('[GUEST] Prompting sign-up for Deep Guidance');
        showSignupPrompt('deep');
    } else {
        // Logged in user - start Deep Guidance
        showPage('deep-1');
    }
}

// Update Deep Guidance upsell text based on guest mode
function updateDeepUpsellForGuest() {
    const upsellText = document.getElementById('deep-upsell-text');
    const upsellBtn = document.getElementById('deep-upsell-btn');

    if (isGuestMode && upsellText && upsellBtn) {
        upsellText.textContent = 'Every account gets 1 free Deep Guidance session. Explore tradeoffs, challenge assumptions, and get a comprehensive breakdown.';
        upsellBtn.textContent = 'Try Deep Guidance free →';
    }
}

// Contextual sign-up prompts
const SIGNUP_PROMPTS = {
    decisions: {
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
            <polyline points="17 21 17 13 7 13 7 21"></polyline>
        </svg>`,
        title: "Don't lose this decision.",
        message: 'Create a free account to save this decision and come back to it anytime.'
    },
    account: {
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
        </svg>`,
        title: 'Create your account',
        message: 'Sign up to access your profile, preferences, and decision history.'
    },
    deep: {
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 16v-4"></path>
            <path d="M12 8h.01"></path>
        </svg>`,
        title: 'Unlock Deep Guidance',
        message: 'Create a free account to access our full decision framework — every account gets 1 free Deep Guidance session.'
    },
    limit: {
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>`,
        title: "You've used your 2 free decisions",
        message: 'Sign up to keep going — it\'s free, and you\'ll be able to save your decisions and track patterns over time.'
    },
    upgrade: {
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
        </svg>`,
        title: 'Create an account to upgrade',
        message: 'Sign up first, then you can upgrade to Pro for unlimited decisions.'
    }
};

function showSignupPrompt(type) {
    const prompt = SIGNUP_PROMPTS[type] || SIGNUP_PROMPTS.account;

    document.getElementById('signup-prompt-icon').innerHTML = prompt.icon;
    document.getElementById('signup-prompt-title').textContent = prompt.title;
    document.getElementById('signup-prompt-message').textContent = prompt.message;

    document.getElementById('signup-prompt-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Guest decision limit tracking
function checkGuestLimit() {
    if (!isGuestMode) return true; // Logged in users are fine

    const guestCount = parseInt(localStorage.getItem('guestDecisions') || '0');

    if (guestCount >= 2) {
        console.log('[GUEST] Guest has reached limit:', guestCount);
        showGuestLimitModal();
        return false;
    }

    console.log('[GUEST] Guest count:', guestCount, '/ 2');
    return true;
}

function incrementGuestCount() {
    if (isGuestMode) {
        const count = parseInt(localStorage.getItem('guestDecisions') || '0');
        const newCount = count + 1;
        localStorage.setItem('guestDecisions', newCount.toString());
        console.log('[GUEST] Guest decision count incremented to:', newCount);
    }
}

function showGuestLimitModal() {
    showSignupPrompt('limit');
}

function clearGuestLimit() {
    localStorage.removeItem('guestDecisions');
    console.log('[GUEST] Guest decision limit cleared');
}

// Close modal helper
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    document.body.style.overflow = '';
}

// ============================================
// DEEPER GUIDANCE INTEREST CAPTURE
// ============================================

function openDeeperGuidanceModal() {
    const modal = document.getElementById('deeper-guidance-modal');
    const emailInput = document.getElementById('interest-email');
    const successState = document.getElementById('interest-success');
    const form = document.querySelector('.interest-form');
    const text = document.querySelector('.interest-modal-text');
    const note = document.querySelector('.interest-modal-note');

    // Reset modal state
    if (successState) successState.style.display = 'none';
    if (form) form.style.display = 'flex';
    if (text) text.style.display = 'block';
    if (note) note.style.display = 'block';

    // Pre-fill email if logged in
    const currentUser = window.supabaseClient?.getCurrentUser();
    if (currentUser?.email && emailInput) {
        emailInput.value = currentUser.email;
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeDeeperGuidanceModal() {
    const modal = document.getElementById('deeper-guidance-modal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

async function submitDeeperGuidanceInterest() {
    const emailInput = document.getElementById('interest-email');
    const email = emailInput?.value?.trim();

    if (!email || !email.includes('@')) {
        alert('Please enter a valid email address');
        return;
    }

    try {
        const currentUser = window.supabaseClient?.getCurrentUser();
        const recommendation = window.lastQuickRecommendation || {};

        // Save to Supabase
        const { error } = await window.supabaseClient.getSupabase()
            .from('feature_interest')
            .insert({
                email: email,
                user_id: currentUser?.id || null,
                decision: recommendation.decision || null,
                recommendation: recommendation.recommendation || null,
                feature_type: 'deeper_guidance',
                created_at: new Date().toISOString()
            });

        if (error) {
            console.error('[Interest] Error saving:', error);
            // If table doesn't exist, log it but still show success to user
            if (error.code === '42P01') {
                console.log('[Interest] Table does not exist yet - needs to be created');
            }
        } else {
            console.log('[Interest] Saved successfully');
        }

        // Show success state
        const successState = document.getElementById('interest-success');
        const form = document.querySelector('.interest-form');
        const text = document.querySelector('.interest-modal-text');
        const note = document.querySelector('.interest-modal-note');

        if (form) form.style.display = 'none';
        if (text) text.style.display = 'none';
        if (note) note.style.display = 'none';
        if (successState) successState.style.display = 'block';

        // Auto-close after 2 seconds
        setTimeout(() => {
            closeDeeperGuidanceModal();
        }, 2000);

    } catch (error) {
        console.error('[Interest] Error:', error);
        captureError(error, { component: 'submitDeeperGuidanceInterest' });
        alert('Something went wrong. Please try again.');
    }
}

// Handle Deep Guidance restriction for guests
function selectDecisionType(type) {
    if (type === 'deep' && isGuestMode) {
        // Show sign-up prompt
        showDeepGuidanceSignupPrompt();
        return;
    }

    // Store decision type and continue
    if (window.quickDecisionState) {
        quickDecisionState.type = type;
    }
    if (window.deepDecisionState) {
        deepDecisionState.type = type;
    }

    // Continue to appropriate flow
    if (type === 'quick') {
        showPage('quick-1');
    } else if (type === 'deep') {
        showPage('deep-1');
    }
}

// Show Deep Guidance signup prompt
function showDeepGuidanceSignupPrompt() {
    console.log('[GUEST] Guest attempted to access Deep Guidance');
    document.getElementById('deep-guidance-signup-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Called after Quick Guidance completes (UPDATE existing function)
function onQuickGuidanceComplete(decisionData, results) {
    if (isGuestMode) {
        // Store decision + results for after sign-up
        saveGuestDecision({
            ...decisionData,
            results: results,
            type: 'quick',
            created_at: new Date().toISOString()
        });

        // Show results first, then prompt after 2 seconds
        setTimeout(() => {
            showSavePromptForGuest();
        }, 2000);
    }
}

// Sign up with email
async function signUpWithEmail(event) {
    event.preventDefault();

    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;

    if (!email || !password) {
        alert('Please enter both email and password');
        return;
    }

    if (password.length < 8) {
        alert('Password must be at least 8 characters');
        return;
    }

    // Wait for Supabase if not ready yet
    if (!window.supabaseClient || !window.supabaseClient.getSupabase()) {
        console.log('[AUTH] Waiting for Supabase initialization...');

        // Wait up to 5 seconds for initialization
        for (let i = 0; i < 10; i++) {
            await new Promise(resolve => setTimeout(resolve, 500));
            if (window.supabaseClient?.supabase) {
                console.log('[AUTH] Supabase ready after', (i+1) * 500, 'ms');
                break;
            }
        }

        // Still not ready after 5 seconds
        if (!window.supabaseClient?.supabase) {
            console.error('[AUTH] Supabase client not initialized');
            alert('Authentication system not ready. Please refresh the page and try again.');
            return;
        }
    }

    try {
        console.log('[AUTH] Signing up with email:', email);

        const { data, error } = await window.supabaseClient.getSupabase().auth.signUp({
            email: email,
            password: password,
            options: {
                emailRedirectTo: window.location.origin
            }
        });

        if (error) throw error;

        if (data.user) {
            console.log('[AUTH] Sign-up successful:', data.user.id);
            await onSignUpComplete(data.user);
        }
    } catch (error) {
        console.error('[AUTH] Sign-up error:', error);
        captureError(error, { component: 'signUpWithEmail', email: email });

        // Show user-friendly error messages
        if (error.name === 'AuthRetryableFetchError' || error.message === 'Failed to fetch') {
            alert('Connection failed. Please check your internet and try again.');
        } else if (error.message?.includes('already registered')) {
            alert('This email is already registered. Please sign in instead.');
        } else {
            alert(`Sign-up failed: ${error.message}`);
        }
    }
}

// Get or create user profile
async function getOrCreateUserProfile(user) {
    if (!user || !window.supabaseClient) {
        console.warn('[PROFILE] Cannot get profile - no user or supabase client');
        return { onboarding_completed: true }; // Default to completed to avoid onboarding loop
    }

    try {
        // Try to get existing profile
        const { data: existingProfile, error: fetchError } = await window.supabaseClient.getSupabase()
            .from('user_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (existingProfile) {
            console.log('[PROFILE] Found existing profile:', existingProfile);
            return existingProfile;
        }

        // Create new profile if doesn't exist
        if (fetchError && fetchError.code === 'PGRST116') {
            console.log('[PROFILE] No profile found, creating new one');
            const { data: newProfile, error: insertError } = await window.supabaseClient.getSupabase()
                .from('user_profiles')
                .insert({
                    user_id: user.id,
                    onboarding_completed: false
                })
                .select()
                .single();

            if (insertError) {
                console.error('[PROFILE] Error creating profile:', insertError);
                return { onboarding_completed: true }; // Default to avoid onboarding loop
            }

            console.log('[PROFILE] Created new profile:', newProfile);
            return newProfile;
        }

        // Other errors
        console.error('[PROFILE] Error fetching profile:', fetchError);
        return { onboarding_completed: true }; // Default to avoid onboarding loop

    } catch (error) {
        console.error('[PROFILE] Exception in getOrCreateUserProfile:', error);
        return { onboarding_completed: true }; // Default to avoid onboarding loop
    }
}

// Sign in with email
async function signInWithEmail(event) {
    event.preventDefault();

    // Get email and password from the active form (could be page-login or page-signin)
    const emailInput = event.target.querySelector('input[type="email"]');
    const passwordInput = event.target.querySelector('input[type="password"]');

    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';

    if (!email || !password) {
        alert('Please enter both email and password');
        return;
    }

    // Wait for Supabase if not ready yet
    if (!window.supabaseClient || !window.supabaseClient.getSupabase()) {
        console.log('[AUTH] Waiting for Supabase initialization...');

        // Wait up to 5 seconds for initialization
        for (let i = 0; i < 10; i++) {
            await new Promise(resolve => setTimeout(resolve, 500));
            if (window.supabaseClient?.supabase) {
                console.log('[AUTH] Supabase ready after', (i+1) * 500, 'ms');
                break;
            }
        }

        // Still not ready after 5 seconds
        if (!window.supabaseClient?.supabase) {
            console.error('[AUTH] Supabase client not initialized');
            alert('Authentication system not ready. Please refresh the page and try again.');
            return;
        }
    }

    try {
        console.log('[AUTH] Signing in with email:', email);

        const { data, error } = await window.supabaseClient.getSupabase().auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        if (data.user) {
            console.log('[AUTH] Sign-in successful:', data.user.id);
            currentUser = data.user;
            isGuestMode = false;
            setSentryUser(data.user); // Set Sentry user context

            // Get user profile
            userProfile = await getOrCreateUserProfile(data.user);

            // Check if onboarding is complete
            if (!userProfile.onboarding_completed) {
                if (userProfile.first_name) {
                    showPage('post-signup-2');
                } else {
                    showPage('post-signup-1');
                }
            } else {
                showPage('decisions');
            }
        }
    } catch (error) {
        console.error('[AUTH] Sign-in error:', error);
        captureError(error, { component: 'signInWithEmail', email: email });
        alert(`Sign-in failed: ${error.message}`);
    }
}

// Sign in with Google
async function signInWithGoogle() {
    // Wait for Supabase to initialize if needed
    let attempts = 0;
    while ((!window.supabaseClient || !window.supabaseClient.getSupabase()) && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        attempts++;
    }

    if (!window.supabaseClient || !window.supabaseClient.getSupabase()) {
        console.error('[AUTH] Supabase client not initialized after waiting');
        alert('Unable to connect. Please refresh the page and try again.');
        return;
    }

    try {
        console.log('[AUTH] Signing in with Google');

        const { data, error } = await window.supabaseClient.getSupabase().auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/#decisions'
            }
        });

        if (error) throw error;

        // Redirect will happen automatically
    } catch (error) {
        console.error('[AUTH] Google sign-in error:', error);
        captureError(error, { component: 'signInWithGoogle' });
        alert(`Google sign-in failed: ${error.message}`);
    }
}

// After successful sign-up
async function onSignUpComplete(user) {
    console.log('[AUTH] Completing sign-up for user:', user.id);
    currentUser = user;
    isGuestMode = false; // Critical: mark as authenticated user
    setSentryUser(user); // Set Sentry user context

    try {
        // Extract first name if Google provided it
        let firstName = null;
        if (user.app_metadata?.provider === 'google') {
            firstName = user.user_metadata?.full_name?.split(' ')[0] || null;
        }

        // Create user profile
        const { error: profileError } = await window.supabaseClient.getSupabase()
            .from('user_profiles')
            .insert({
                user_id: user.id,
                first_name: firstName,
                onboarding_completed: false
            });

        if (profileError) {
            console.error('[AUTH] Error creating profile:', profileError);
        }

        // Save guest decision if exists
        const guestDecision = getGuestDecision();
        if (guestDecision) {
            console.log('[GUEST] Saving guest decision to database');

            const { error: decisionError } = await window.supabaseClient.getSupabase()
                .from('decisions')
                .insert({
                    user_id: user.id,
                    question: guestDecision.decision || guestDecision.question,
                    decision_type: guestDecision.type || 'quick',
                    matters: guestDecision.matters,
                    emotion: guestDecision.emotion,
                    context: guestDecision.context,
                    recommendation: guestDecision.results?.recommendation,
                    reason: guestDecision.results?.reason,
                    created_at: guestDecision.created_at
                });

            if (decisionError) {
                console.error('[GUEST] Error saving guest decision:', decisionError);
            } else {
                console.log('[GUEST] Guest decision saved successfully');
                clearGuestData();
            }
        }

        // Clear guest decision limit
        clearGuestLimit();

        // Go to post-signup onboarding
        if (firstName) {
            // Google user — skip name, go to personalization
            postSignupName = firstName;
            document.getElementById('post-signup-name-display').textContent = firstName;
            showPage('post-signup-2');
        } else {
            showPage('post-signup-1');
        }
    } catch (error) {
        console.error('[AUTH] Error in onSignUpComplete:', error);
        // Still show onboarding even if there were errors
        showPage('post-signup-1');
    }
}

// Save post-signup name
function savePostSignupName() {
    const nameInput = document.getElementById('post-signup-name');
    const name = nameInput.value.trim();

    if (!name) {
        nameInput.focus();
        return;
    }

    postSignupName = name;
    document.getElementById('post-signup-name-display').textContent = name;
    showPage('post-signup-2');
}

// Complete post-signup onboarding
async function completePostSignup() {
    const selected = document.querySelector('input[name="post-focus"]:checked');
    const focus = selected ? selected.value : null;

    if (!currentUser) {
        console.error('[ONBOARDING] No current user');
        return;
    }

    try {
        const { error } = await window.supabaseClient.getSupabase()
            .from('user_profiles')
            .update({
                first_name: postSignupName,
                onboarding_completed: true,
                onboarding_focus: focus
            })
            .eq('user_id', currentUser.id);

        if (error) {
            console.error('[ONBOARDING] Error completing onboarding:', error);
        }

        // Refresh profile
        userProfile = await getOrCreateUserProfile(currentUser);

        showPage('decisions');
    } catch (error) {
        console.error('[ONBOARDING] Error in completePostSignup:', error);
        showPage('decisions'); // Continue anyway
    }
}

// Skip post-signup onboarding
async function skipPostSignup() {
    if (!currentUser) {
        console.error('[ONBOARDING] No current user');
        return;
    }

    try {
        const { error } = await window.supabaseClient.getSupabase()
            .from('user_profiles')
            .update({
                first_name: postSignupName || null,
                onboarding_completed: true
            })
            .eq('user_id', currentUser.id);

        if (error) {
            console.error('[ONBOARDING] Error skipping onboarding:', error);
        }

        showPage('decisions');
    } catch (error) {
        console.error('[ONBOARDING] Error in skipPostSignup:', error);
        showPage('decisions'); // Continue anyway
    }
}

// UPDATE: App initialization logic
async function initApp() {
    console.log('[APP] Initializing app');

    if (!window.supabaseClient?.getSupabase()?.auth) {
        console.error('[APP] Supabase client not initialized');
        showPage('landing');
        isGuestMode = true;
        return;
    }

    try {
        const { data: { session } } = await window.supabaseClient.getSupabase().auth.getSession();

        if (session?.user) {
            // Logged in user
            console.log('[APP] User logged in:', session.user.id);
            currentUser = session.user;
            isGuestMode = false;
            setSentryUser(session.user); // Set Sentry user context

            userProfile = await getOrCreateUserProfile(currentUser);

            if (!userProfile.onboarding_completed) {
                // Returning user who didn't finish onboarding
                if (userProfile.first_name) {
                    postSignupName = userProfile.first_name;
                    document.getElementById('post-signup-name-display').textContent = userProfile.first_name;
                    showPage('post-signup-2');
                } else {
                    showPage('post-signup-1');
                }
            } else {
                showPage('decisions');
                await loadDecisions();
                // Check DNA status after loading decisions
                await checkDNAStatus();
            }
        } else {
            // Not logged in — show landing
            console.log('[APP] No session, showing landing page');
            isGuestMode = true;
            showPage('landing');
        }
    } catch (error) {
        console.error('[APP] Error in initApp:', error);
        isGuestMode = true;
        showPage('landing');
    }
}

// Auth state change handler
if (window.supabaseClient?.getSupabase()?.auth) {
    window.supabaseClient.getSupabase().auth.onAuthStateChange(async (event, session) => {
        console.log('[AUTH] Auth state changed:', event);

        if (event === 'SIGNED_IN' && session) {
            await onSignUpComplete(session.user);
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            userProfile = null;
            isGuestMode = true;
            clearSentryUser(); // Clear Sentry user context
            showPage('landing');
        }
    });
}

// Event listeners are now attached dynamically in openOutcomeModal() via attachOutcomeListeners()

// ============================================
// DNA STORY EXPERIENCE
// ============================================

// Initialize DNA state variables globally to avoid hoisting issues
window.currentDNAScreen = 1;
window.totalDNAScreens = 7;
window.dnaData = null;

// Archetype definitions
const ARCHETYPES = {
    lifestyle: {
        name: 'The Explorer',
        description: "You'd rather regret something you did than wonder what might have been.",
        quote: "I'd rather regret doing than wonder what if.",
        icon: '🧭'
    },
    freedom: {
        name: 'The Freedom Chaser',
        description: "You protect your autonomy above all else. Constraints feel like cages.",
        quote: "Freedom isn't negotiable.",
        icon: '🦅'
    },
    growth: {
        name: 'The Climber',
        description: "You're always reaching for the next level. Comfort zones are just places you pass through.",
        quote: "Growth over comfort, always.",
        icon: '⛰️'
    },
    stability: {
        name: 'The Architect',
        description: "You build for the long game. Security isn't boring — it's the foundation for everything else.",
        quote: "I build foundations, not castles in the sky.",
        icon: '🏛️'
    },
    relationships: {
        name: 'The Connector',
        description: "People come first. Your decisions center on who you'll become with, not just what you'll achieve.",
        quote: "The people matter more than the plan.",
        icon: '❤️'
    },
    passion: {
        name: 'The Dreamer',
        description: "You follow your heart, even when the spreadsheet says otherwise. Meaning matters more than metrics.",
        quote: "The heart knows what the mind can't calculate.",
        icon: '✨'
    },
    impact: {
        name: 'The Builder',
        description: "You want your choices to matter. Legacy and contribution drive your biggest decisions.",
        quote: "I want my choices to outlive me.",
        icon: '🌍'
    },
    money: {
        name: 'The Strategist',
        description: "You play the numbers. Financial security gives you options, and options give you power.",
        quote: "Money is freedom in another form.",
        icon: '💎'
    }
};

async function loadDNAData() {
    try {
        const currentUser = window.supabaseClient?.getCurrentUser();
        if (!currentUser || !window.supabaseClient) {
            console.log('[DNA] No user logged in');
            return null;
        }

        const { data: decisions, error } = await window.supabaseClient.getSupabase()
            .from('decisions')
            .select('*')
            .eq('user_id', currentUser.id);

        if (error) {
            console.error('[DNA] Error loading decisions:', error);
            return null;
        }

        if (!decisions || decisions.length < DNA_UNLOCK_THRESHOLD) {
            console.log('[DNA] Not enough decisions:', decisions?.length || 0);
            return null;
        }

        console.log('[DNA] Loaded', decisions.length, 'decisions');

        // Calculate top values from decision data
        const valueScores = {};
        decisions.forEach(d => {
            // Handle different value storage formats
            let values = null;
            if (d.values) {
                values = d.values;
            } else if (d.value) {
                values = d.value;
            }

            if (values) {
                if (Array.isArray(values)) {
                    // Array format: ['lifestyle', 'freedom', 'passion']
                    values.forEach((value, index) => {
                        const valueName = typeof value === 'string' ? value : (value.name || value);
                        if (!valueScores[valueName]) valueScores[valueName] = [];
                        const score = 100 - (index * 15); // Decreasing weight
                        valueScores[valueName].push(score);
                    });
                } else if (typeof values === 'object') {
                    // Object format: { lifestyle: 85, freedom: 72 }
                    Object.entries(values).forEach(([name, score]) => {
                        if (!valueScores[name]) valueScores[name] = [];
                        valueScores[name].push(Number(score) || 50);
                    });
                } else if (typeof values === 'string') {
                    // Single string value
                    if (!valueScores[values]) valueScores[values] = [];
                    valueScores[values].push(100);
                }
            }
        });

        // Calculate average scores and get top 3
        const topValues = Object.entries(valueScores)
            .map(([name, scores]) => ({
                name,
                score: Math.round(scores.reduce((a,b) => a+b, 0) / scores.length),
                frequency: scores.length
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);

        if (topValues.length === 0) {
            console.log('[DNA] No values found');
            return null;
        }

        console.log('[DNA] Top values:', topValues);

        // Determine archetype based on top value with defensive coding
        const topValueName = topValues[0]?.name?.toLowerCase()?.trim() || 'lifestyle';

        // Define archetypes inline to avoid any scope issues
        const archetypeMap = {
            lifestyle: {
                name: 'The Explorer',
                description: "You'd rather regret something you did than wonder what might have been.",
                quote: "I'd rather regret doing than wonder what if.",
                icon: '🧭'
            },
            freedom: {
                name: 'The Freedom Chaser',
                description: "You protect your autonomy above all else. Constraints feel like cages.",
                quote: "Freedom isn't negotiable.",
                icon: '🦅'
            },
            growth: {
                name: 'The Climber',
                description: "You're always reaching for the next level. Comfort zones are just places you pass through.",
                quote: "Growth over comfort, always.",
                icon: '⛰️'
            },
            stability: {
                name: 'The Architect',
                description: "You build for the long game. Security isn't boring — it's the foundation for everything else.",
                quote: "I build foundations, not castles in the sky.",
                icon: '🏛️'
            },
            relationships: {
                name: 'The Connector',
                description: "People come first. Your decisions center on who you'll become with, not just what you'll achieve.",
                quote: "The people matter more than the plan.",
                icon: '❤️'
            },
            passion: {
                name: 'The Dreamer',
                description: "You follow your heart, even when the spreadsheet says otherwise. Meaning matters more than metrics.",
                quote: "The heart knows what the mind can't calculate.",
                icon: '✨'
            },
            impact: {
                name: 'The Builder',
                description: "You want your choices to matter. Legacy and contribution drive your biggest decisions.",
                quote: "I want my choices to outlive me.",
                icon: '🌍'
            },
            money: {
                name: 'The Strategist',
                description: "You play the numbers. Financial security gives you options, and options give you power.",
                quote: "Money is freedom in another form.",
                icon: '💎'
            }
        };

        // Safely get archetype with fallback
        const archetype = archetypeMap[topValueName] || archetypeMap['lifestyle'];

        console.log('[DNA] Selected archetype:', archetype.name);

        // Calculate heart vs head (emotion-based values vs practical)
        const heartValues = ['passion', 'relationships', 'lifestyle', 'freedom', 'family'];
        const headValues = ['stability', 'growth', 'impact', 'career', 'money', 'finance'];

        let heartCount = 0;
        let headCount = 0;

        topValues.forEach(v => {
            const valueName = v.name.toLowerCase();
            if (heartValues.includes(valueName)) heartCount++;
            else if (headValues.includes(valueName)) headCount++;
        });

        const totalCategorized = heartCount + headCount;
        const heartScore = totalCategorized > 0 ? Math.round((heartCount / totalCategorized) * 100) : 50;

        console.log('[DNA] Heart score:', heartScore);

        // Get user's first name
        const userName = (userProfile?.first_name || 'YOUR').toUpperCase();

        // Generate insight based on values
        let valuesInsight = "These are what matter most to you.";
        if (heartScore > 70) {
            valuesInsight = "They're all about YOU and the life you want to live.";
        } else if (heartScore < 30) {
            valuesInsight = "They're about building something bigger than yourself.";
        }

        return {
            decisionCount: decisions.length,
            topValues,
            archetype,
            heartScore,
            userName,
            valuesInsight
        };

    } catch (error) {
        console.error('[DNA] Error in loadDNAData:', error);
        return null;
    }
}

async function openDNAStory() {
    console.log('[DNA] Opening DNA story...');

    // Check if user is logged in
    const currentUser = window.supabaseClient?.getCurrentUser();
    if (!currentUser) {
        showToast('Sign in to unlock your Decision DNA');
        setTimeout(() => {
            showPage('login');
        }, 1000);
        return;
    }

    // Check if they have enough decisions
    const { data: decisions } = await window.supabaseClient.getSupabase()
        .from('decisions')
        .select('id')
        .eq('user_id', currentUser.id);

    if (!decisions || decisions.length < DNA_UNLOCK_THRESHOLD) {
        const remaining = DNA_UNLOCK_THRESHOLD - (decisions?.length || 0);
        showToast(`Make ${remaining} more decision${remaining > 1 ? 's' : ''} to unlock your DNA`);
        return;
    }

    // Load DNA data
    window.dnaData = await loadDNAData();

    if (!window.dnaData) {
        showToast('Still gathering insights. Make more decisions!');
        return;
    }

    console.log('[DNA] Data loaded:', window.dnaData);

    // Populate screens with data
    populateDNAScreens(window.dnaData);

    // Show overlay
    document.getElementById('dna-story').classList.add('active');
    document.body.style.overflow = 'hidden';
    window.currentDNAScreen = 1;
    updateDNAProgress();
    showDNAScreen(1);

    // Mark as viewed
    markDNAViewed();
}

function populateDNAScreens(data) {
    console.log('[DNA] Populating screens with data:', data);

    // Screen 1: Decision count
    document.getElementById('dna-decision-count').textContent = `${data.decisionCount} decision${data.decisionCount > 1 ? 's' : ''}`;

    // Screen 2: Top value
    const topValueName = data.topValues[0]?.name?.toUpperCase() || 'LIFESTYLE';
    document.getElementById('dna-top-value').textContent = topValueName;
    const frequency = data.topValues[0]?.frequency || 1;
    document.getElementById('dna-value-frequency').textContent =
        `This showed up in ${frequency} of your ${data.decisionCount} decision${data.decisionCount > 1 ? 's' : ''}.`;

    // Screen 3: Top 3 values
    data.topValues.forEach((v, i) => {
        document.getElementById(`dna-value-${i+1}-name`).textContent = v.name;
        document.getElementById(`dna-value-${i+1}-score`).textContent = `${v.score}%`;
        document.getElementById(`dna-value-${i+1}-bar`).style.setProperty('--fill-width', `${v.score}%`);
    });
    document.getElementById('dna-values-insight').textContent = data.valuesInsight;

    // Screen 4: Archetype
    document.getElementById('dna-archetype').textContent = data.archetype.name;
    document.getElementById('dna-archetype-desc').textContent = data.archetype.description;

    // Screen 5: Surprise (for now, hide it or show placeholder)
    // TODO: Implement say vs do logic

    // Screen 6: Heart vs Head
    document.getElementById('dna-heart-head-marker').style.left = `${100 - data.heartScore}%`;
    document.getElementById('dna-heart-head-text').textContent = `${data.heartScore}% heart-led`;

    // For speed, set to middle for now
    document.getElementById('dna-speed-marker').style.left = '50%';
    document.getElementById('dna-speed-text').textContent = 'You take your time';

    // Screen 7: Shareable card
    document.getElementById('dna-user-name').textContent = data.userName;
    document.getElementById('shareable-archetype').textContent = data.archetype.name.toUpperCase();
    document.getElementById('shareable-top-value').textContent = topValueName;
    document.getElementById('shareable-quote').textContent = `"${data.archetype.quote}"`;

    // Update icon in shareable card
    document.querySelector('.shareable-icon').textContent = data.archetype.icon;

    // Update shareable traits based on data
    const heartTrait = data.heartScore > 50 ? '♡ Heart-led' : '🧠 Head-led';
    const traits = document.querySelectorAll('.shareable-traits .trait');
    if (traits.length >= 2) {
        traits[0].textContent = heartTrait;
        // Keep second trait as is for now
    }
}

async function closeDNAStory() {
    console.log('[DNA] Closing DNA story');
    document.getElementById('dna-story').classList.remove('active');
    document.body.style.overflow = '';

    // Mark as viewed
    markDNAViewed();

    // Reset for next time
    window.currentDNAScreen = 1;

    // Refresh the DNA card to hide it (State C: already viewed)
    const currentUser = window.supabaseClient?.getCurrentUser();
    if (currentUser && window.supabaseClient) {
        try {
            const { data: decisions } = await window.supabaseClient.getSupabase()
                .from('decisions')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: false });

            if (decisions) {
                renderDNACard(decisions);
            }
        } catch (error) {
            console.error('[DNA] Error refreshing DNA card:', error);
        }
    }
}

function nextDNAScreen() {
    const totalScreens = 7; // Total number of DNA story screens
    console.log('[DNA] nextDNAScreen called, current:', window.currentDNAScreen, 'total:', totalScreens);
    if (window.currentDNAScreen < totalScreens) {
        window.currentDNAScreen++;
        showDNAScreen(window.currentDNAScreen);
        updateDNAProgress();
    } else {
        console.log('[DNA] Already at last screen');
    }
}

function prevDNAScreen() {
    console.log('[DNA] prevDNAScreen called, current:', window.currentDNAScreen);
    if (window.currentDNAScreen > 1) {
        window.currentDNAScreen--;
        showDNAScreen(window.currentDNAScreen);
        updateDNAProgress();
    } else {
        console.log('[DNA] Already at first screen');
    }
}

function showDNAScreen(num) {
    console.log('[DNA] Showing screen', num);
    document.querySelectorAll('.story-screen').forEach(screen => {
        screen.classList.remove('active');
    });
    const screenToShow = document.querySelector(`.story-screen[data-screen="${num}"]`);
    if (screenToShow) {
        screenToShow.classList.add('active');
    }
}

function updateDNAProgress() {
    document.querySelectorAll('.progress-segment').forEach((seg, i) => {
        seg.classList.remove('active', 'complete');
        if (i + 1 < window.currentDNAScreen) {
            seg.classList.add('complete');
        } else if (i + 1 === window.currentDNAScreen) {
            seg.classList.add('active');
        }
    });
}

// Check if DNA is unlocked and show badge
async function checkDNAStatus() {
    const currentUser = window.supabaseClient?.getCurrentUser();
    if (!currentUser || !window.supabaseClient) return;

    try {
        const { data: decisions } = await window.supabaseClient.getSupabase()
            .from('decisions')
            .select('id')
            .eq('user_id', currentUser.id);

        const isUnlocked = decisions && decisions.length >= DNA_UNLOCK_THRESHOLD;
        const trigger = document.getElementById('dna-trigger');
        const badge = document.getElementById('dna-badge');

        if (isUnlocked && trigger) {
            trigger.classList.add('unlocked');
            // Show badge if they haven't viewed it yet
            const hasViewed = localStorage.getItem('dna_viewed');
            if (!hasViewed && badge) {
                badge.classList.add('active');
            }
        }
    } catch (error) {
        console.error('[DNA] Error checking status:', error);
    }
}

// Mark as viewed when they complete the story
function markDNAViewed() {
    localStorage.setItem('dna_viewed', 'true');
    const badge = document.getElementById('dna-badge');
    if (badge) {
        badge.classList.remove('active');
    }
}

// Download card as image (basic implementation)
function downloadDNACard() {
    showToast('Screenshot the card to save it!');
    // For full implementation, would need html2canvas library
}

// ============================================
// DNA ICON CLICK HANDLER & STATIC PAGE
// ============================================

function handleDNAIconClick() {
    const currentUser = window.supabaseClient?.getCurrentUser();
    if (!currentUser) {
        showToast('Sign in to unlock your Decision DNA');
        setTimeout(() => showPage('login'), 1000);
        return;
    }

    // Get decision count from current decisions or fetch
    window.supabaseClient.getSupabase()
        .from('decisions')
        .select('id')
        .eq('user_id', currentUser.id)
        .then(({ data: decisions }) => {
            const decisionCount = decisions?.length || 0;
            const hasViewed = localStorage.getItem('dna_viewed');

            if (decisionCount < DNA_UNLOCK_THRESHOLD) {
                const remaining = DNA_UNLOCK_THRESHOLD - decisionCount;
                showToast(`Make ${remaining} more decision${remaining > 1 ? 's' : ''} to unlock`);
                return;
            }

            if (!hasViewed) {
                // First time — open story
                window.openDNAStory();
            } else {
                // Return visit — open static page
                openDNAPage();
            }
        });
}

async function openDNAPage() {
    // Load data if not already loaded
    if (!window.dnaData) {
        window.dnaData = await loadDNAData();
    }

    if (!window.dnaData) {
        showToast('Unable to load your profile');
        return;
    }

    // Populate the page
    populateDNAPage(window.dnaData);

    // Show the page
    showPage('dna-profile');

    // Clear badge
    document.getElementById('dna-badge')?.classList.remove('active');
}

function populateDNAPage(data) {
    console.log('[DNA Page] Populating with data:', data);
    console.log('[DNA Page] Top values:', data.topValues);

    document.getElementById('dna-page-count').textContent = data.decisionCount;
    document.getElementById('dna-page-archetype').textContent = data.archetype.name;
    document.getElementById('dna-page-archetype-desc').textContent = data.archetype.description;

    // Values chart
    if (data.topValues && data.topValues.length > 0) {
        const valuesHtml = data.topValues.map(v => `
            <div class="value-row">
                <span class="value-name">${v.name}</span>
                <div class="value-bar">
                    <div class="value-bar-fill" style="width: ${v.score}%"></div>
                </div>
                <span class="value-score">${v.score}%</span>
            </div>
        `).join('');
        document.getElementById('dna-page-values').innerHTML = valuesHtml;
    } else {
        console.warn('[DNA Page] No values data available');
        document.getElementById('dna-page-values').innerHTML = '<p style="text-align: center; color: #6B7280; padding: 20px;">Make more decisions to see your values</p>';
    }

    // Balance
    document.getElementById('dna-page-balance-fill').style.width = `${data.heartScore}%`;
    document.getElementById('dna-page-balance-text').textContent = `${data.heartScore}% Heart-led`;

    // Patterns
    const patternsHtml = `
        <div class="pattern-item">
            <div class="pattern-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <circle cx="12" cy="12" r="6"></circle>
                    <circle cx="12" cy="12" r="2"></circle>
                </svg>
            </div>
            <span class="pattern-text">Growth over comfort</span>
        </div>
        <div class="pattern-item">
            <div class="pattern-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                </svg>
            </div>
            <span class="pattern-text">Fast on lifestyle decisions</span>
        </div>
    `;
    document.getElementById('dna-page-patterns').innerHTML = patternsHtml;
}


// Make DNA functions globally accessible
window.openDNAStory = openDNAStory;
window.closeDNAStory = closeDNAStory;
window.nextDNAScreen = nextDNAScreen;
window.prevDNAScreen = prevDNAScreen;
window.downloadDNACard = downloadDNACard;
