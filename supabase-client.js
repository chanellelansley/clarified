// ============================================
// SUPABASE CLIENT INITIALIZATION
// ============================================

let supabaseClient = null;
let currentUser = null;

// Initialize Supabase client
async function initSupabase() {
    try {
        console.log('[INIT] Starting Supabase initialization...');

        // Step 1: Check if Supabase library loaded
        if (!window.supabase) {
            console.error('[INIT] window.supabase is undefined - CDN library failed to load');
            return false;
        }
        console.log('[INIT] ✅ Supabase library loaded');

        // Step 2: Get config from window.APP_CONFIG (loaded from config.js)
        console.log('[INIT] Reading config from APP_CONFIG...');
        const config = window.APP_CONFIG;

        if (!config) {
            console.error('[INIT] window.APP_CONFIG is not defined - config.js not loaded');
            return false;
        }
        console.log('[INIT] ✅ Config loaded:', config.SUPABASE_URL ? 'URL present' : 'URL missing');

        // Step 3: Validate config
        if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
            console.warn('[INIT] Supabase not configured. Using localStorage fallback.');
            return false;
        }
        console.log('[INIT] ✅ Config validated');

        // Step 4: Create client
        console.log('[INIT] Creating Supabase client...');
        supabaseClient = window.supabase.createClient(
            config.SUPABASE_URL,
            config.SUPABASE_ANON_KEY,
            {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true,
                    storage: window.localStorage
                }
            }
        );
        console.log('[INIT] ✅ Supabase client created');

        // Step 5: Check session
        console.log('[INIT] Checking for existing session...');
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            currentUser = session.user;
            console.log('[INIT] ✅ User already logged in:', currentUser.email);
            onAuthStateChange(currentUser);
        } else {
            console.log('[INIT] No existing session');
        }

        // Step 6: Set up auth listener
        console.log('[INIT] Setting up auth state listener...');
        supabaseClient.auth.onAuthStateChange((event, session) => {
            console.log('[AUTH] State changed:', event);
            currentUser = session?.user || null;
            onAuthStateChange(currentUser);
        });

        console.log('[INIT] ✅ Supabase fully initialized');
        return true;

    } catch (error) {
        console.error('[INIT] ❌ Failed to initialize Supabase:', error);
        console.error('[INIT] Error details:', error.message);
        console.error('[INIT] Error stack:', error.stack);
        return false;
    }
}

// Handle auth state changes
async function onAuthStateChange(user) {
    if (user) {
        // User logged in
        if (window.appState) {
            // Initialize user object if it's null
            if (!window.appState.user) {
                window.appState.user = {};
            }
            window.appState.user.email = user.email;
            window.appState.user.id = user.id;
            window.appState.isGuest = false;
        }

        // Ensure subscription records exist (for existing users or failed signups)
        await initializeUserSubscription(user.id);

        // Update UI
        updateAuthUI(true);

        // Load user's decisions from database
        if (window.loadDecisionsFromDatabase) {
            window.loadDecisionsFromDatabase();
        }
    } else {
        // User logged out
        if (window.appState) {
            if (window.appState.user) {
                window.appState.user.email = null;
                window.appState.user.id = null;
            } else {
                window.appState.user = { email: null, id: null };
            }
            window.appState.isGuest = true;
        }

        // Update UI
        updateAuthUI(false);

        // Show login page
        if (window.showPage) {
            window.showPage('login');
        }
    }
}

// Update UI based on auth state
function updateAuthUI(isLoggedIn) {
    // Update nav/header to show user email or login button
    const authButton = document.getElementById('auth-button');
    if (authButton) {
        if (isLoggedIn) {
            authButton.textContent = currentUser.email;
            authButton.onclick = () => showAccountMenu();
        } else {
            authButton.textContent = 'Sign In';
            authButton.onclick = () => showPage('login');
        }
    }
}

// ============================================
// AUTH FUNCTIONS
// ============================================

async function signUp(email, password) {
    if (!supabaseClient) {
        return {
            success: false,
            error: 'Supabase not configured. Please set up your Supabase credentials in the .env file. See QUICK_START.md for instructions.'
        };
    }

    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
                emailRedirectTo: undefined,
                data: {}
            }
        });

        if (error) throw error;

        // Initialize subscription and usage records for new user
        if (data.user) {
            await initializeUserSubscription(data.user.id);
        }

        console.log('✅ Sign up successful');
        return { success: true, data };
    } catch (error) {
        console.error('Sign up error:', error);
        return { success: false, error: error.message };
    }
}

// Initialize subscription records for a new user
async function initializeUserSubscription(userId) {
    try {
        console.log('📝 Attempting to initialize subscription for user:', userId);

        // Check if subscription already exists
        const { data: existing } = await supabaseClient
            .from('subscriptions')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();

        if (existing) {
            console.log('✅ Subscription already exists for user');
            return;
        }

        // Create subscription record
        // New users automatically get Founding Member and Beta User status
        const { error: subError } = await supabaseClient
            .from('subscriptions')
            .insert({
                user_id: userId,
                plan: 'free',
                status: 'active',
                founding_member: true,
                is_beta_user: true,
                current_period_start: new Date().toISOString(),
                current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            });

        if (subError) {
            console.warn('⚠️ Could not create subscription record (table may not exist):', subError.message);
            console.warn('⚠️ User can still use app with default free plan');
            // Don't block - user can still proceed
        } else {
            console.log('✅ Created subscription record');
        }

        // Create usage tracking record
        const { error: usageError } = await supabaseClient
            .from('usage_tracking')
            .insert({
                user_id: userId,
                period_start: new Date().toISOString(),
                period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            });

        if (usageError) {
            console.warn('⚠️ Could not create usage tracking record (table may not exist):', usageError.message);
            console.warn('⚠️ User can still use app with default usage limits');
            // Don't block - user can still proceed
        } else {
            console.log('✅ Created usage tracking record');
        }

        console.log('✅ Subscription initialization complete (with or without tables)');
    } catch (error) {
        console.warn('⚠️ Subscription initialization failed:', error.message);
        console.warn('⚠️ This is OK - user will have default free plan access');
        // Never throw - signup should succeed even if subscription tables don't exist
    }
}

async function signIn(email, password) {
    if (!supabaseClient) {
        return {
            success: false,
            error: 'Supabase not configured. Please set up your Supabase credentials in the .env file. See QUICK_START.md for instructions.'
        };
    }

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        console.log('✅ Sign in successful');
        currentUser = data.user;
        return { success: true, data };
    } catch (error) {
        console.error('Sign in error:', error);
        return { success: false, error: error.message };
    }
}

async function signOut() {
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;

        console.log('✅ Signed out');
        currentUser = null;
        return { success: true };
    } catch (error) {
        console.error('Sign out error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// DATABASE FUNCTIONS
// ============================================

async function saveDecisionToDatabase(decisionData) {
    if (!supabaseClient || !currentUser) {
        console.warn('Not logged in, cannot save to database');
        return null;
    }

    try {
        console.log('[DB] Saving decision with data:', decisionData);

        const { data, error } = await supabaseClient
            .from('decisions')
            .insert({
                user_id: currentUser.id,
                question: decisionData.decision || decisionData.question,
                reframed_question: decisionData.reframedQuestion,
                category: decisionData.category,
                decision_type: decisionData.decisionType || decisionData.decision_type,
                context: decisionData.context,
                options: decisionData.options,
                values: decisionData.values,
                challenges: decisionData.difficulties || decisionData.challenges || [],
                assumptions: decisionData.assumptions,
                significance: decisionData.significance,
                timeline: decisionData.timeline,
                recommendation: decisionData.recommendationData || decisionData.recommendation,
                // Quick Guidance fields
                matters: decisionData.matters,
                emotion: decisionData.emotion,
                reason: decisionData.reason
            })
            .select()
            .single();

        if (error) throw error;

        console.log('✅ Decision saved to database:', data.id);
        console.log('[DB] Saved decision data:', data);
        return data.id;
    } catch (error) {
        console.error('Error saving decision:', error);
        return null;
    }
}

async function loadDecisionsFromDatabase() {
    if (!supabaseClient || !currentUser) {
        console.warn('Not logged in, cannot load from database');
        return [];
    }

    try {
        const { data, error } = await supabaseClient
            .from('decisions')
            .select('*, outcomes(*)')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        console.log(`✅ Loaded ${data.length} decisions from database`);
        console.log('[DB] Decision types:', data.map(d => ({ id: d.id, type: d.decision_type, question: d.question })));
        return data;
    } catch (error) {
        console.error('Error loading decisions:', error);
        return [];
    }
}

async function saveOutcomeToDatabase(decisionId, outcomeData) {
    if (!supabaseClient || !currentUser) {
        console.warn('Not logged in, cannot save outcome');
        return null;
    }

    try {
        const { data, error } = await supabaseClient
            .from('outcomes')
            .insert({
                decision_id: decisionId,
                user_id: currentUser.id,
                choice_made: outcomeData.userChoice,
                reflection: outcomeData.userReflection
            })
            .select()
            .single();

        if (error) throw error;

        console.log('✅ Outcome saved to database');
        return data.id;
    } catch (error) {
        console.error('Error saving outcome:', error);
        return null;
    }
}

async function getDecisionById(decisionId) {
    if (!supabaseClient || !currentUser) {
        console.warn('Not logged in, cannot fetch decision');
        return null;
    }

    try {
        const { data, error } = await supabaseClient
            .from('decisions')
            .select('*, outcomes(*)')
            .eq('id', decisionId)
            .eq('user_id', currentUser.id)
            .single();

        if (error) throw error;

        return data;
    } catch (error) {
        console.error('Error fetching decision:', error);
        return null;
    }
}

async function deleteDecision(decisionId) {
    if (!supabaseClient || !currentUser) {
        console.warn('Not logged in, cannot delete decision');
        return false;
    }

    try {
        // First delete any related outcomes
        await supabaseClient
            .from('outcomes')
            .delete()
            .eq('decision_id', decisionId);

        // Then delete the decision
        const { error } = await supabaseClient
            .from('decisions')
            .delete()
            .eq('id', decisionId)
            .eq('user_id', currentUser.id);

        if (error) throw error;

        console.log('✅ Decision deleted from database');
        return true;
    } catch (error) {
        console.error('Error deleting decision:', error);
        return false;
    }
}

// ============================================
// MIGRATION FROM LOCALSTORAGE
// ============================================

async function migrateLocalStorageToSupabase() {
    if (!supabaseClient || !currentUser) return;

    try {
        // Get localStorage decisions
        const localDecisions = getStoredDecisions();
        if (localDecisions.length === 0) {
            console.log('No localStorage decisions to migrate');
            return;
        }

        console.log(`Found ${localDecisions.length} decisions in localStorage, syncing silently...`);

        // Migrate each decision silently
        let successCount = 0;
        for (const decision of localDecisions) {
            const saved = await saveDecisionToDatabase(decision);
            if (saved) successCount++;
        }

        console.log(`✅ Migrated ${successCount}/${localDecisions.length} decisions`);

        // Clear localStorage after successful migration
        if (successCount > 0) {
            localStorage.removeItem('clarifiedDecisions');
            console.log('✅ Cleared localStorage after sync');
        }
    } catch (error) {
        console.error('Migration error:', error);
    }
}

// ============================================
// SUBSCRIPTION & USAGE TRACKING
// ============================================

async function getUserSubscription() {
    if (!currentUser) {
        console.warn('getUserSubscription: Not logged in');
        return null;
    }

    try {
        console.log('📡 Fetching subscription for user:', currentUser.id);

        // Try API endpoint first (only works on localhost:3000)
        try {
            const response = await fetch(`/api/user-subscription/${currentUser.id}`, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Subscription data received from API:', data);
                return data;
            }
        } catch (apiError) {
            console.warn('⚠️ API endpoint not available, falling back to direct Supabase query');
        }

        // Fallback: Query Supabase directly (works everywhere)
        console.log('📡 Querying Supabase directly for subscription...');

        const { data: subscription, error: subError } = await supabaseClient
            .from('subscriptions')
            .select('*')
            .eq('user_id', currentUser.id)
            .maybeSingle();

        if (subError && subError.code !== 'PGRST116') {
            console.warn('⚠️ Subscription query failed:', subError);
        }

        const { data: usage, error: usageError } = await supabaseClient
            .from('usage_tracking')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (usageError && usageError.code !== 'PGRST116') {
            console.warn('⚠️ Usage query failed:', usageError);
        }

        const result = {
            subscription: subscription || { plan: 'free', status: 'active' },
            usage: usage || { everyday_decisions_used: 0, life_decisions_used: 0, trial_life_used: false }
        };

        console.log('✅ Subscription data from Supabase:', result);
        return result;

    } catch (error) {
        console.warn('⚠️ Subscription check failed, using default free plan:', error);
        // Return default free plan - NEVER return null, always allow access
        return {
            subscription: { plan: 'free', status: 'active' },
            usage: { everyday_decisions_used: 0, life_decisions_used: 0, trial_life_used: false }
        };
    }
}

async function checkDecisionLimit(decisionType) {
    const subscriptionData = await getUserSubscription();
    if (!subscriptionData) return { allowed: true }; // Allow if can't check

    const { subscription, usage } = subscriptionData;
    const plan = subscription.plan;
    const isBetaUser = subscription.is_beta_user || false;

    // Beta users have unlimited access to all features
    if (isBetaUser) {
        return { allowed: true, isBeta: true };
    }

    // Pro users have unlimited decisions
    if (plan === 'pro') {
        return { allowed: true };
    }

    // Free users: 1 decision total (checked via localStorage in clarity.js)
    // This function now serves as a backup check
    const freeDecisionUsed = localStorage.getItem('free_life_decision_used') === 'true';
    if (freeDecisionUsed) {
        return {
            allowed: false,
            reason: 'limit_reached',
            message: 'Upgrade for unlimited decisions',
            upgradeOptions: ['pro']
        };
    }

    return { allowed: true, isFreeDecision: true };
}

async function trackDecisionUsage(decisionType) {
    if (!currentUser) return;

    try {
        const { data: usage } = await supabaseClient
            .from('usage_tracking')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (!usage) {
            console.error('No usage tracking record found');
            return;
        }

        const updates = {};
        if (decisionType === 'quick') {
            updates.everyday_decisions_used = usage.everyday_decisions_used + 1;
        } else {
            updates.life_decisions_used = usage.life_decisions_used + 1;
            if (!usage.trial_life_used) {
                updates.trial_life_used = true;
            }
        }

        const { error } = await supabaseClient
            .from('usage_tracking')
            .update(updates)
            .eq('id', usage.id);

        if (error) {
            console.error('Error tracking usage:', error);
        } else {
            console.log('✅ Tracked decision usage');
        }
    } catch (error) {
        console.error('Error in trackDecisionUsage:', error);
    }
}

// Sync usage counts - STRICT MODE: counts only increase, never decrease
// Deleting decisions does NOT restore quota
async function syncUsageCounts() {
    if (!currentUser) return;

    try {
        console.log('🔄 Checking usage counts (strict mode - no restore on delete)...');

        // Get current usage record
        const { data: usage } = await supabaseClient
            .from('usage_tracking')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (!usage) {
            console.warn('No usage tracking record found');
            return;
        }

        console.log(`📊 Current usage - Everyday: ${usage.everyday_decisions_used}, Life: ${usage.life_decisions_used}`);

        // STRICT MODE: We only log current state, we don't sync down
        // Usage counts are incremented by trackDecisionUsage() when decisions are created
        // Deleting decisions does NOT decrease the count
        console.log('✅ Usage counts verified (strict mode - no changes made)');

    } catch (error) {
        console.error('Error in syncUsageCounts:', error);
    }
}

async function createCheckoutSession(priceId, mode) {
    if (!currentUser) {
        throw new Error('Must be logged in');
    }

    try {
        const response = await fetch('/api/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                priceId,
                mode,
                userId: currentUser.id,
                successUrl: `${window.location.origin}/#account?upgrade_success=true`,
                cancelUrl: `${window.location.origin}/#account?upgrade_canceled=true`
            })
        });

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }

        return data;
    } catch (error) {
        console.error('Error creating checkout session:', error);
        throw error;
    }
}

async function createPortalSession() {
    if (!currentUser) {
        throw new Error('Must be logged in');
    }

    try {
        const response = await fetch('/api/create-portal-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUser.id,
                returnUrl: `${window.location.origin}/`
            })
        });

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }

        return data;
    } catch (error) {
        console.error('Error creating portal session:', error);
        throw error;
    }
}

// ============================================
// PASSWORD RESET
// ============================================

async function requestPasswordReset(email) {
    if (!supabaseClient) {
        throw new Error('Supabase not initialized');
    }

    try {
        const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`
        });

        if (error) throw error;

        console.log('✅ Password reset email sent to:', email);
        return { success: true };
    } catch (error) {
        console.error('Error sending password reset email:', error);
        throw error;
    }
}

async function updatePassword(newPassword) {
    if (!supabaseClient) {
        throw new Error('Supabase not initialized');
    }

    try {
        const { data, error } = await supabaseClient.auth.updateUser({
            password: newPassword
        });

        if (error) throw error;

        console.log('✅ Password updated successfully');
        return { success: true };
    } catch (error) {
        console.error('Error updating password:', error);
        throw error;
    }
}

// Make functions globally available
window.supabaseClient = {
    initSupabase,
    signUp,
    signIn,
    signOut,
    saveDecisionToDatabase,
    loadDecisionsFromDatabase,
    saveOutcomeToDatabase,
    getDecisionById,
    deleteDecision,
    migrateLocalStorageToSupabase,
    getCurrentUser: () => currentUser,
    getSupabase: () => supabaseClient,
    // Subscription & usage
    getUserSubscription,
    checkDecisionLimit,
    trackDecisionUsage,
    syncUsageCounts,
    createCheckoutSession,
    createPortalSession,
    // Password reset
    requestPasswordReset,
    updatePassword
};

console.log('✅ supabase-client.js loaded, window.supabaseClient is available');
