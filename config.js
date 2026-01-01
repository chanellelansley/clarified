// Configuration file for API settings
const CONFIG = {
    CLAUDE_API_KEY: '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',
    CLAUDE_API_URL: 'https://api.anthropic.com/v1/messages',
    CLAUDE_MODEL: 'claude-3-5-sonnet-20241022',
    MAX_TOKENS: 1024
};

// Export for use in script.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
