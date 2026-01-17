// Simple test script to verify webhook handler logic
// Run with: node test-webhook.js

require('dotenv').config();

console.log('=== Webhook Test Script ===\n');

// Check environment variables
const envVars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'STRIPE_PRICE_PRO_MONTHLY',
    'STRIPE_PRICE_PRO_ANNUAL'
];

console.log('Environment Variables:');
envVars.forEach(v => {
    const value = process.env[v];
    const status = value ? `✓ Set (${value.substring(0, 10)}...)` : '✗ Missing';
    console.log(`  ${v}: ${status}`);
});

console.log('\n--- Testing Stripe Connection ---');

const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function testStripe() {
    try {
        // Test Stripe connection
        const balance = await stripe.balance.retrieve();
        console.log('✓ Stripe connection successful');
        console.log(`  Available balance: ${balance.available[0]?.amount / 100} ${balance.available[0]?.currency}`);

        // Check price exists
        const monthlyPrice = await stripe.prices.retrieve(process.env.STRIPE_PRICE_PRO_MONTHLY);
        console.log(`✓ Monthly price found: ${monthlyPrice.unit_amount / 100} ${monthlyPrice.currency}/month`);

    } catch (err) {
        console.log('✗ Stripe error:', err.message);
    }
}

console.log('\n--- Testing Supabase Connection ---');

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testSupabase() {
    try {
        // Test Supabase connection with subscriptions table
        const { data, error } = await supabase
            .from('subscriptions')
            .select('user_id, plan, status, stripe_customer_id')
            .limit(1);

        if (error) throw error;
        console.log('✓ Supabase connection successful');
        console.log('✓ Subscriptions table accessible');
        if (data[0]) {
            console.log('  Sample record:', JSON.stringify(data[0], null, 2));
        }

    } catch (err) {
        console.log('✗ Supabase error:', err.message);
    }
}

async function runTests() {
    await testStripe();
    await testSupabase();
    console.log('\n=== Tests Complete ===');
}

runTests();
