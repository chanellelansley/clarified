// ============================================
// GUEST ONBOARDING JAVASCRIPT
// Add these functions to clarity.js
// ============================================

// Start guest decision from landing page
function startGuestDecision() {
    console.log('[GUEST] Starting guest decision');
    isGuestMode = true;
    showPage('decision-type');
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

// Close modal helper
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    document.body.style.overflow = '';
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

    try {
        console.log('[AUTH] Signing up with email:', email);

        const { data, error } = await window.supabaseClient.supabase.auth.signUp({
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
        alert(`Sign-up failed: ${error.message}`);
    }
}

// Sign in with email
async function signInWithEmail(event) {
    event.preventDefault();

    const email = document.getElementById('signin-email').value.trim();
    const password = document.getElementById('signin-password').value;

    if (!email || !password) {
        alert('Please enter both email and password');
        return;
    }

    try {
        console.log('[AUTH] Signing in with email:', email);

        const { data, error } = await window.supabaseClient.supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        if (data.user) {
            console.log('[AUTH] Sign-in successful:', data.user.id);
            currentUser = data.user;
            isGuestMode = false;

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
        alert(`Sign-in failed: ${error.message}`);
    }
}

// Sign in with Google
async function signInWithGoogle() {
    try {
        console.log('[AUTH] Signing in with Google');

        const { data, error } = await window.supabaseClient.supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });

        if (error) throw error;

        // Redirect will happen automatically
    } catch (error) {
        console.error('[AUTH] Google sign-in error:', error);
        alert(`Google sign-in failed: ${error.message}`);
    }
}

// After successful sign-up
async function onSignUpComplete(user) {
    console.log('[AUTH] Completing sign-up for user:', user.id);
    currentUser = user;

    try {
        // Extract first name if Google provided it
        let firstName = null;
        if (user.app_metadata?.provider === 'google') {
            firstName = user.user_metadata?.full_name?.split(' ')[0] || null;
        }

        // Create user profile
        const { error: profileError } = await window.supabaseClient.supabase
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

            const { error: decisionError } = await window.supabaseClient.supabase
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
        const { error } = await window.supabaseClient.supabase
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
        const { error } = await window.supabaseClient.supabase
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

    if (!window.supabaseClient) {
        console.error('[APP] Supabase client not initialized');
        showPage('landing');
        isGuestMode = true;
        return;
    }

    try {
        const { data: { session } } = await window.supabaseClient.supabase.auth.getSession();

        if (session?.user) {
            // Logged in user
            console.log('[APP] User logged in:', session.user.id);
            currentUser = session.user;
            isGuestMode = false;

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
if (window.supabaseClient) {
    window.supabaseClient.supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('[AUTH] Auth state changed:', event);

        if (event === 'SIGNED_IN' && session) {
            await onSignUpComplete(session.user);
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            userProfile = null;
            isGuestMode = true;
            showPage('landing');
        }
    });
}
