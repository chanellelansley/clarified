// Vercel Serverless Function for Clarity Check feedback submission
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase with service role key (server-side only)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

// Valid clarity scores
const VALID_SCORES = ['high', 'medium', 'low'];

// Valid reason tags per score
const VALID_TAGS = {
    high: [
        'Seeing tradeoffs clearly',
        'Confirmed what I already felt',
        'Helped me stop spiraling',
        'The comparison view',
        'Something else'
    ],
    medium: [
        'Needed more nuance',
        "Didn't reflect my priorities",
        'Too generic',
        'Wanted another angle',
        'Hard to trust the result'
    ],
    low: [
        'Felt off / wrong',
        'Oversimplified',
        'Missed something important',
        "Didn't match my situation",
        'Confusing'
    ]
};

// UUID regex for validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'method_not_allowed' });
    }

    // Check Supabase configuration
    if (!supabase) {
        console.error('[Feedback] Supabase not configured');
        return res.status(500).json({ error: 'database_not_configured' });
    }

    const {
        decision_id,
        clarity_score,
        reason_tags = [],
        free_text,
        page,
        user_id // Optional - passed from client if user is logged in
    } = req.body || {};

    console.log('[Feedback] Request received:', {
        decision_id: decision_id ? `${decision_id.substring(0, 8)}...` : null,
        clarity_score,
        reason_tags,
        free_text_length: free_text?.length || 0,
        page,
        user_id: user_id ? `${user_id.substring(0, 8)}...` : null
    });

    // Validate clarity_score (required)
    if (!clarity_score || !VALID_SCORES.includes(clarity_score)) {
        console.error('[Feedback] Invalid clarity_score:', clarity_score);
        return res.status(400).json({
            error: 'invalid_clarity_score',
            message: 'clarity_score must be one of: high, medium, low'
        });
    }

    // Validate reason_tags (must be array, max 2 items)
    if (!Array.isArray(reason_tags)) {
        console.error('[Feedback] reason_tags is not an array');
        return res.status(400).json({
            error: 'invalid_reason_tags',
            message: 'reason_tags must be an array'
        });
    }

    if (reason_tags.length > 2) {
        console.error('[Feedback] Too many reason_tags:', reason_tags.length);
        return res.status(400).json({
            error: 'too_many_tags',
            message: 'Maximum 2 reason tags allowed'
        });
    }

    // Validate that tags are valid for the given score
    const validTagsForScore = VALID_TAGS[clarity_score];
    for (const tag of reason_tags) {
        if (!validTagsForScore.includes(tag)) {
            console.error('[Feedback] Invalid tag for score:', { tag, clarity_score });
            return res.status(400).json({
                error: 'invalid_tag',
                message: `Tag "${tag}" is not valid for clarity_score "${clarity_score}"`
            });
        }
    }

    // Validate free_text (optional, max 240 chars)
    if (free_text && typeof free_text !== 'string') {
        return res.status(400).json({
            error: 'invalid_free_text',
            message: 'free_text must be a string'
        });
    }

    if (free_text && free_text.length > 240) {
        console.error('[Feedback] free_text too long:', free_text.length);
        return res.status(400).json({
            error: 'free_text_too_long',
            message: 'free_text must be 240 characters or less'
        });
    }

    // Validate decision_id format if provided
    if (decision_id && !UUID_REGEX.test(decision_id)) {
        console.error('[Feedback] Invalid decision_id format');
        return res.status(400).json({
            error: 'invalid_decision_id',
            message: 'decision_id must be a valid UUID'
        });
    }

    // Validate user_id format if provided
    if (user_id && !UUID_REGEX.test(user_id)) {
        console.error('[Feedback] Invalid user_id format');
        return res.status(400).json({
            error: 'invalid_user_id',
            message: 'user_id must be a valid UUID'
        });
    }

    try {
        // Build the insert object
        const feedbackRecord = {
            clarity_score,
            reason_tags,
            page: page || null,
            recommendation_version: null // Can be added later if needed
        };

        // Only add optional fields if they have values
        if (free_text && free_text.trim()) {
            feedbackRecord.free_text = free_text.trim();
        }
        if (decision_id) {
            feedbackRecord.decision_id = decision_id;
        }
        if (user_id) {
            feedbackRecord.user_id = user_id;
        }

        console.log('[Feedback] Inserting record:', {
            ...feedbackRecord,
            free_text: feedbackRecord.free_text ? `${feedbackRecord.free_text.substring(0, 20)}...` : null
        });

        const { data, error } = await supabase
            .from('clarity_check')
            .insert(feedbackRecord)
            .select('id')
            .single();

        if (error) {
            console.error('[Feedback] Supabase insert error:', error);
            return res.status(500).json({
                error: 'database_error',
                message: error.message
            });
        }

        console.log('[Feedback] Successfully inserted:', data.id);
        return res.status(200).json({ ok: true, id: data.id });

    } catch (error) {
        console.error('[Feedback] Unexpected error:', error);
        return res.status(500).json({
            error: 'server_error',
            message: error.message
        });
    }
};
