// Test signup functionality
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

console.log('\n=== TESTING SIGNUP ===\n');

async function testSignup() {
    const testEmail = `test${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    console.log('1. Testing with email:', testEmail);
    console.log('2. Password length:', testPassword.length);

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
            return;
        }

        console.log('\n✅ Sign up successful!');
        console.log('User ID:', data.user?.id);
        console.log('Email:', data.user?.email);
        console.log('Session exists:', !!data.session);

        // Check if subscription record was created
        console.log('\n3. Checking if subscription record was auto-created...');

        // Wait a moment for trigger to fire
        await new Promise(resolve => setTimeout(resolve, 2000));

        const { data: subData, error: subError } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', data.user.id)
            .single();

        if (subError) {
            console.log('❌ Error fetching subscription:', subError.message);
        } else if (subData) {
            console.log('✅ Subscription record created:');
            console.log('  Plan:', subData.plan);
            console.log('  Status:', subData.status);
        } else {
            console.log('⚠️  No subscription record found');
        }

    } catch (error) {
        console.log('\n❌ Unexpected error:', error.message);
    }

    console.log('\n======================\n');
}

testSignup();
