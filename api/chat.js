// Vercel Serverless Function for Claude AI chat
const fetch = require('node-fetch');

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { messages, system, prompt_version } = req.body;

        console.log('📨 [API/chat] Request received');
        console.log('📨 [API/chat] Prompt version:', prompt_version || 'not specified');
        console.log('📨 [API/chat] Messages count:', messages?.length || 0);
        console.log('📨 [API/chat] System prompt length:', system?.length || 0);
        console.log('📨 [API/chat] First message content length:', messages?.[0]?.content?.length || 0);

        // Log actual content for debugging (first 200 chars)
        if (messages?.[0]?.content) {
            console.log('📨 [API/chat] User message preview:', messages[0].content.substring(0, 200));
        }

        // Check for missing API key
        if (!CLAUDE_API_KEY) {
            console.error('❌ [API/chat] CLAUDE_API_KEY not configured');
            return res.status(500).json({ error: 'API key not configured' });
        }

        // Check for empty/missing data
        if (!messages || messages.length === 0 || !messages[0]?.content) {
            console.error('❌ [API/chat] Empty or missing messages');
            return res.status(400).json({ error: 'No messages provided' });
        }

        // Call Claude API
        const response = await fetch(CLAUDE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 1024,
                system: system,
                messages: messages
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ [API/chat] Claude API error:', errorData);
            return res.status(response.status).json({
                error: errorData.error?.message || 'API request failed'
            });
        }

        const data = await response.json();
        console.log('✅ [API/chat] Claude response received, content length:', data.content?.[0]?.text?.length || 0);

        return res.status(200).json(data);
    } catch (error) {
        console.error('❌ [API/chat] Server error:', error);
        return res.status(500).json({
            error: 'Internal server error: ' + error.message
        });
    }
};
