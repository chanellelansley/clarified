// Test if database tables exist
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

console.log('\n=== CHECKING DATABASE TABLES ===\n');

async function checkTables() {
    try {
        // Try to query decisions table
        const { data: decisions, error: decisionsError } = await supabase
            .from('decisions')
            .select('count')
            .limit(1);

        if (decisionsError) {
            console.log('❌ "decisions" table:', decisionsError.message);
            if (decisionsError.message.includes('does not exist')) {
                console.log('   → You need to create the tables!');
                console.log('   → See SUPABASE_SETUP.md for the SQL schema');
            }
        } else {
            console.log('✅ "decisions" table exists');
        }

        // Try to query outcomes table
        const { data: outcomes, error: outcomesError } = await supabase
            .from('outcomes')
            .select('count')
            .limit(1);

        if (outcomesError) {
            console.log('❌ "outcomes" table:', outcomesError.message);
        } else {
            console.log('✅ "outcomes" table exists');
        }

        console.log('\n=====================================\n');
    } catch (error) {
        console.log('❌ Error checking tables:', error.message);
    }
}

checkTables();
