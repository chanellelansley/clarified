// Test actual connection to Supabase
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('\n=== TESTING SUPABASE CONNECTION ===\n');
console.log('URL:', supabaseUrl);
console.log('Key format:', supabaseKey?.substring(0, 20) + '...');

try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('\n✅ Supabase client created successfully');

    // Try to query auth status
    supabase.auth.getSession().then(({ data, error }) => {
        if (error) {
            console.log('\n❌ Connection error:', error.message);
            console.log('\nThis likely means your API key is invalid.');
        } else {
            console.log('\n✅ Successfully connected to Supabase!');
            console.log('Session:', data.session ? 'Active' : 'No active session');
        }
    }).catch(err => {
        console.log('\n❌ Connection failed:', err.message);
    });
} catch (error) {
    console.log('\n❌ Failed to create Supabase client:', error.message);
}

console.log('\n=====================================\n');
