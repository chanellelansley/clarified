// Quick diagnostic script to test Supabase connection
require('dotenv').config();

console.log('\n=== SUPABASE CONFIGURATION CHECK ===\n');

console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');

if (process.env.SUPABASE_URL) {
    console.log('\nProject URL:', process.env.SUPABASE_URL);
}

if (process.env.SUPABASE_ANON_KEY) {
    const key = process.env.SUPABASE_ANON_KEY;
    console.log('\nAnon Key Preview:', key.substring(0, 50) + '...');
    console.log('Anon Key Length:', key.length);

    // Valid JWT tokens start with "eyJ"
    if (key.startsWith('eyJ')) {
        console.log('Format: ✅ Looks like a valid JWT token');
    } else {
        console.log('Format: ❌ Does NOT look like a valid JWT token');
        console.log('Expected format: Should start with "eyJ" and be ~300+ characters long');
        console.log('\n⚠️  Your anon key appears to be incorrect!');
        console.log('\nTo get the correct anon key:');
        console.log('1. Go to https://app.supabase.com/');
        console.log('2. Select your project');
        console.log('3. Click Settings (gear icon) → API');
        console.log('4. Copy the "anon" key under "Project API keys"');
        console.log('5. It should be very long and start with "eyJ"');
    }
}

console.log('\n=====================================\n');
