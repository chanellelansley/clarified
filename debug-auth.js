// Detailed auth debugging
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

console.log('\n=== DETAILED AUTH DEBUGGING ===\n');

async function debugAuth() {
    // Test 1: Check if we can reach Supabase
    console.log('1. Testing Supabase connection...');
    try {
        const { data, error } = await supabase.auth.getSession();
        console.log('✅ Connection successful');
    } catch (error) {
        console.log('❌ Connection failed:', error.message);
        return;
    }

    // Test 2: Try to sign up with a simple Gmail address
    console.log('\n2. Testing sign up...');
    const testEmail = 'test.clarity.app@gmail.com'; // Use a consistent test email
    const testPassword = 'TestPassword123!';

    console.log('Email:', testEmail);
    console.log('Password length:', testPassword.length);

    try {
        const { data, error } = await supabase.auth.signUp({
            email: testEmail,
            password: testPassword
        });

        if (error) {
            console.log('\n❌ Sign up error:');
            console.log('Message:', error.message);
            console.log('Status:', error.status);
            console.log('Code:', error.code);
            console.log('\nFull error object:');
            console.log(JSON.stringify(error, null, 2));

            // Specific error guidance
            if (error.code === 'email_address_invalid') {
                console.log('\n🔍 This means Supabase rejected the email format.');
                console.log('Possible causes:');
                console.log('- Email domain restrictions are enabled');
                console.log('- Custom email validation is configured');
                console.log('\nTo fix:');
                console.log('1. Go to Supabase Dashboard → Authentication → Providers');
                console.log('2. Click "Email" provider');
                console.log('3. Check "Email Domain Restrictions" or "Allowed Email Domains"');
                console.log('4. Make sure there are no restrictions, or add "gmail.com"');
            } else if (error.code === 'user_already_exists') {
                console.log('\n🔍 This email is already registered.');
                console.log('Try signing in instead, or use a different email.');
            } else if (error.message.includes('not allowed')) {
                console.log('\n🔍 Sign ups might be disabled.');
                console.log('To fix:');
                console.log('1. Go to Supabase Dashboard → Authentication → Providers');
                console.log('2. Make sure Email provider is enabled');
                console.log('3. Check "Enable sign ups" is turned ON');
            }
        } else {
            console.log('\n✅ Sign up successful!');
            console.log('User ID:', data.user?.id);
            console.log('Email:', data.user?.email);
            console.log('Email confirmed:', data.user?.email_confirmed_at ? 'Yes' : 'No');
            console.log('\nIdentities:', data.user?.identities?.length || 0);

            if (data.session) {
                console.log('Session created: Yes');
            } else {
                console.log('Session created: No (email confirmation required)');
            }
        }
    } catch (error) {
        console.log('\n❌ Unexpected error:', error.message);
        console.log('Stack:', error.stack);
    }

    console.log('\n=====================================\n');
}

debugAuth();
