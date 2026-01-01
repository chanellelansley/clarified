// ============================================
// PAYMENT & UPGRADE FUNCTIONS
// ============================================

let stripePublishableKey = null;

// Load Stripe publishable key from APP_CONFIG
function loadStripeConfig() {
    if (window.APP_CONFIG) {
        stripePublishableKey = window.APP_CONFIG.STRIPE_PUBLISHABLE_KEY;
        console.log('Stripe config loaded from APP_CONFIG');
    } else {
        console.error('APP_CONFIG not found - config.js not loaded');
    }
}

// Show upgrade modal
async function showUpgradeModal(options = {}) {
    const {
        title = 'Upgrade to continue',
        message = 'Choose how you would like to proceed',
        upgradeOptions = ['pro', 'pay_per_use']
    } = options;

    // Update modal content
    document.getElementById('upgrade-modal-title').textContent = title;
    document.getElementById('upgrade-modal-message').textContent = message;

    // Show/hide options based on upgradeOptions
    const proOption = document.getElementById('upgrade-option-pro');
    const payPerUseOption = document.getElementById('upgrade-option-payperuse');

    proOption.style.display = upgradeOptions.includes('pro') ? 'block' : 'none';
    payPerUseOption.style.display = upgradeOptions.includes('pay_per_use') ? 'block' : 'none';

    // Show modal
    document.getElementById('upgrade-modal').classList.add('active');
}

function closeUpgradeModal() {
    document.getElementById('upgrade-modal').classList.remove('active');
}

// Upgrade to Pro (subscription)
async function upgradeToPro() {
    try {
        if (!stripePublishableKey) {
            loadStripeConfig();
        }

        // Get Pro price ID from APP_CONFIG
        const priceId = getStripePriceId('pro');
        if (!priceId) {
            alert('Pro plan not configured. Please contact support.');
            return;
        }

        // Create checkout session
        const { url } = await window.supabaseClient.createCheckoutSession(priceId, 'subscription');

        // Redirect to Stripe Checkout
        window.location.href = url;
    } catch (error) {
        console.error('Error upgrading to Pro:', error);
        alert('Failed to start checkout. Please try again.');
    }
}

// Buy a single Life decision
async function buyLifeDecision() {
    try {
        if (!stripePublishableKey) {
            loadStripeConfig();
        }

        // Get Life decision price ID from APP_CONFIG
        const priceId = getStripePriceId('life');
        if (!priceId) {
            alert('Life decision pricing not configured. Please contact support.');
            return;
        }

        // Create checkout session
        const { url } = await window.supabaseClient.createCheckoutSession(priceId, 'payment');

        // Redirect to Stripe Checkout
        window.location.href = url;
    } catch (error) {
        console.error('Error buying Life decision:', error);
        alert('Failed to start checkout. Please try again.');
    }
}

// Get Stripe Price IDs from APP_CONFIG
function getStripePriceId(type) {
    if (!window.APP_CONFIG) {
        console.error('APP_CONFIG not found');
        return null;
    }

    if (type === 'pro') {
        return window.APP_CONFIG.STRIPE_PRO_PRICE_ID;
    } else if (type === 'life') {
        return window.APP_CONFIG.STRIPE_LIFE_PRICE_ID;
    }
    return null;
}

// Manage subscription (open Stripe Customer Portal)
async function manageSubscription() {
    try {
        const { url } = await window.supabaseClient.createPortalSession();
        window.location.href = url;
    } catch (error) {
        console.error('Error opening customer portal:', error);
        alert('Failed to open subscription management. Please try again.');
    }
}

// Check upgrade success/cancellation from URL params
function checkUpgradeStatus() {
    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.has('upgrade_success')) {
        alert('🎉 Upgrade successful! Thank you for subscribing.');
        // Remove param from URL
        window.history.replaceState({}, document.title, window.location.pathname);
        // Refresh subscription data
        if (window.supabaseClient) {
            window.supabaseClient.getUserSubscription();
        }
    }

    if (urlParams.has('upgrade_canceled')) {
        // Remove param from URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// Load subscription info on Account page
async function loadAccountSubscriptionInfo() {
    try {
        // CRITICAL: Hide the loading overlay in case it's stuck visible
        const loader = document.getElementById('deep-clarity-loader');
        if (loader) {
            loader.style.display = 'none';
            console.log('✅ Forced loader to hide (Account page)');
        }

        console.log('🔍 loadAccountSubscriptionInfo called');
        console.log('  - appState:', window.appState);
        console.log('  - isGuest:', window.appState?.isGuest);

        // Check if user is logged in
        const currentUser = window.supabaseClient?.getCurrentUser();
        console.log('  - currentUser:', currentUser ? 'exists' : 'null');

        // Sync usage counts with actual decisions before loading
        if (currentUser && window.supabaseClient?.syncUsageCounts) {
            await window.supabaseClient.syncUsageCounts();
        }

        // Get UI elements
        const currentPlanCard = document.getElementById('current-plan-card');
        const profileCard = document.querySelector('.card:has(#user-email)');
        const upgradeCard = document.getElementById('upgrade-card');
        const lifeDecisionCard = document.getElementById('life-decision-card');
        const preferencesCard = document.getElementById('preferences-card');
        const privacyCard = document.getElementById('privacy-card');
        const signOutSection = document.getElementById('sign-out-section');

        // Handle not logged in
        if (!currentUser) {
            console.log('User not logged in, hiding all cards');
            if (currentPlanCard) currentPlanCard.style.display = 'none';
            if (profileCard) profileCard.style.display = 'none';
            if (upgradeCard) upgradeCard.style.display = 'none';
            if (lifeDecisionCard) lifeDecisionCard.style.display = 'none';
            if (preferencesCard) preferencesCard.style.display = 'none';
            if (privacyCard) privacyCard.style.display = 'none';
            if (signOutSection) signOutSection.style.display = 'none';
            return;
        }

        // User is logged in - show base cards (upgrade card visibility set later based on plan)
        console.log('Logged in user - showing cards');
        if (currentPlanCard) currentPlanCard.style.display = 'block';
        if (profileCard) profileCard.style.display = 'block';
        if (lifeDecisionCard) lifeDecisionCard.style.display = 'block';
        if (preferencesCard) preferencesCard.style.display = 'block';
        if (privacyCard) privacyCard.style.display = 'block';
        if (signOutSection) signOutSection.style.display = 'block';
        // Hide upgrade card by default - will show only for free users
        if (upgradeCard) upgradeCard.style.display = 'none';

        // Update user email (only for logged-in users)
        const userEmailEl = document.getElementById('user-email');
        if (userEmailEl && currentUser.email) {
            userEmailEl.textContent = currentUser.email;
        }

        // Update member since date (only for logged-in users)
        const memberSinceEl = document.getElementById('member-since');
        if (memberSinceEl && currentUser.created_at) {
            const createdDate = new Date(currentUser.created_at);
            const monthYear = createdDate.toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric'
            });
            memberSinceEl.textContent = monthYear;
        }

        const subscriptionData = await window.supabaseClient.getUserSubscription();
        if (!subscriptionData) {
            console.warn('⚠️ No subscription data returned, using defaults');
            // Set default values if subscription data fails to load
            const planName = document.getElementById('plan-name');
            const planSubtitle = document.getElementById('plan-subtitle');
            const everydayUsage = document.getElementById('everyday-usage');
            const lifeUsage = document.getElementById('life-usage');

            if (planName) planName.textContent = 'Free Plan';
            if (planSubtitle) planSubtitle.textContent = '5 Everyday decisions/month';
            if (everydayUsage) everydayUsage.textContent = '0 of 5 used';
            if (lifeUsage) lifeUsage.textContent = '1 free trial available';
            return;
        }

        const { subscription, usage } = subscriptionData;
        const plan = subscription.plan;
        const isFoundingMember = subscription.founding_member || false;
        const isBetaUser = subscription.is_beta_user || false;

        // Update plan name and subtitle
        const planName = document.getElementById('plan-name');
        const planSubtitle = document.getElementById('plan-subtitle');
        const foundingBadge = document.getElementById('founding-member-badge');
        const betaNote = document.getElementById('beta-access-note');

        // Get subscription management elements
        const subscriptionMgmt = document.getElementById('subscription-management');
        const nextBillingDateEl = document.getElementById('next-billing-date');

        console.log('[Account] Plan:', plan, 'Subscription:', subscription);

        if (plan === 'pro') {
            if (planName) planName.textContent = 'Pro Plan';
            const renewDate = subscription.current_period_end
                ? new Date(subscription.current_period_end).toLocaleDateString()
                : '';
            if (planSubtitle) planSubtitle.textContent = renewDate ? `Renews ${renewDate}` : '$8/month';

            // Hide upgrade card for Pro users
            if (upgradeCard) upgradeCard.style.display = 'none';

            // Show subscription management for Pro users
            if (subscriptionMgmt) {
                subscriptionMgmt.style.display = 'block';
                if (nextBillingDateEl && subscription.current_period_end) {
                    nextBillingDateEl.textContent = new Date(subscription.current_period_end).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    });
                }
            }
        } else {
            if (planName) planName.textContent = 'Free Plan';
            if (planSubtitle) planSubtitle.textContent = '5 Everyday decisions/month';

            // Show upgrade card for free users
            if (upgradeCard) upgradeCard.style.display = 'block';
            if (subscriptionMgmt) subscriptionMgmt.style.display = 'none';
        }

        // Show Founding Member badge if applicable
        if (foundingBadge && isFoundingMember) {
            foundingBadge.style.display = 'flex';
        }

        // Show beta access note if applicable
        if (betaNote && isBetaUser) {
            betaNote.style.display = 'block';
        }

        // Update usage for Everyday decisions
        const everydayUsage = document.getElementById('everyday-usage');
        const everydayProgress = document.getElementById('everyday-progress');
        const everydayUsed = usage.everyday_decisions_used || 0;

        console.log('[Account] Usage:', { everydayUsed, lifeUsed: usage.life_decisions_used, isBetaUser });

        if (everydayUsage) {
            if (isBetaUser) {
                everydayUsage.textContent = `${everydayUsed} used (unlimited)`;
            } else if (plan === 'pro') {
                everydayUsage.textContent = `${everydayUsed} used this month`;
            } else {
                const everydayLimit = 5;
                everydayUsage.textContent = `${everydayUsed} of ${everydayLimit} used`;
            }
        }
        if (everydayProgress) {
            if (isBetaUser || plan === 'pro') {
                everydayProgress.style.width = '0%';
            } else {
                everydayProgress.style.width = `${(everydayUsed / 5) * 100}%`;
            }
        }

        // Update usage for Life decisions
        const lifeUsage = document.getElementById('life-usage');
        const lifeProgress = document.getElementById('life-progress');
        const lifeUsed = usage.life_decisions_used || 0;

        if (lifeUsage) {
            if (isBetaUser) {
                lifeUsage.textContent = `${lifeUsed} used (unlimited)`;
            } else if (plan === 'pro') {
                const lifeLimit = 2;
                lifeUsage.textContent = `${lifeUsed} of ${lifeLimit} used`;
            } else {
                if (usage.trial_life_used) {
                    lifeUsage.textContent = 'Free trial used';
                } else {
                    lifeUsage.textContent = '1 free trial available';
                }
            }
        }
        if (lifeProgress) {
            if (isBetaUser) {
                lifeProgress.style.width = '0%';
            } else if (plan === 'pro') {
                lifeProgress.style.width = `${(lifeUsed / 2) * 100}%`;
            } else {
                lifeProgress.style.width = usage.trial_life_used ? '100%' : '0%';
            }
        }
    } catch (error) {
        console.error('Error loading subscription info:', error);
    }
}

// Wait for auth to be ready before loading subscription info
function waitForAuthThenLoadSubscription() {
    const checkAuth = () => {
        if (window.supabaseClient && window.supabaseClient.getCurrentUser()) {
            // Auth is ready and user is logged in
            loadAccountSubscriptionInfo();
        } else if (window.supabaseClient) {
            // Supabase client exists but user might not be logged in yet
            // Try again in a bit
            setTimeout(checkAuth, 500);
        } else {
            // Supabase client not loaded yet
            setTimeout(checkAuth, 500);
        }
    };
    checkAuth();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadStripeConfig();
    checkUpgradeStatus();
});

// Listen for navigation to account page
// This will be called by clarity.js when switching pages
window.addEventListener('pagechange', (event) => {
    if (event.detail?.page === 'account') {
        waitForAuthThenLoadSubscription();
    }
});

// Also check on initial load if we're already on the account page
if (window.location.hash === '#account') {
    waitForAuthThenLoadSubscription();
}

// Cancel subscription
async function cancelSubscription() {
    if (!confirm('Are you sure you want to cancel? You\'ll lose access to Pro features at the end of your billing period.')) {
        return;
    }

    const currentUser = window.supabaseClient?.getCurrentUser();
    if (!currentUser) {
        alert('Please sign in to manage your subscription.');
        return;
    }

    try {
        const response = await fetch('/api/cancel-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id })
        });

        const data = await response.json();

        if (response.ok) {
            alert(data.message || 'Subscription cancelled. You\'ll have access until your billing period ends.');
            location.reload();
        } else {
            alert(data.error || 'Error cancelling subscription. Please try again.');
        }
    } catch (error) {
        console.error('Cancel error:', error);
        alert('Error cancelling subscription. Please contact support.');
    }
}

// Export for external use
window.loadAccountSubscriptionInfo = loadAccountSubscriptionInfo;
window.cancelSubscription = cancelSubscription;

console.log('✅ payments.js loaded');
