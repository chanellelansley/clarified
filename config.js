// Public config - these are safe to expose (they're public keys)
// IMPORTANT: Never put secret keys (sk_*, service_role) in this file!
window.APP_CONFIG = {
    // Supabase public config (anon key is designed to be public)
    SUPABASE_URL: 'https://vsrwtovpzokqndnlccnr.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzcnd0b3Zwem9rcW5kbmxjY25yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMzY0MTYsImV4cCI6MjA4MjYxMjQxNn0.yQOqc14omdvrD489LrfDeKAvTwT7SK5HPvQbh2YiTrM',

    // Stripe public config (publishable key is designed to be public)
    STRIPE_PUBLISHABLE_KEY: 'pk_live_51SjshoItLSMazAtcRKfIH7pSCJgyEtSmTJLMMTJDcnmDaZ1O3s5HEhy03KZDwBBOL4ZUIUWJK1eeDtsGe5R86luJ00v8dzcQQd',
    STRIPE_PRO_PRICE_ID: 'price_1Sjt6vItLSMazAtctgz1QKJP',
    STRIPE_LIFE_PRICE_ID: 'price_1Sk7i4ItLSMazAtc37r7ut3m'
};

console.log('Public config loaded');
