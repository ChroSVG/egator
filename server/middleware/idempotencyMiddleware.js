const HttpError = require('../models/errorModel');
const IdempotencyModel = require('../models/idempotencyModel');
const crypto = require('crypto');

/**
 * Idempotency Guard Middleware
 * 
 * Prevents duplicate requests from being processed.
 * Client must send X-Idempotency-Key header with a unique UUID.
 * 
 * Usage: Apply to endpoints that should only be executed once per request
 * (e.g., voting, payments, form submissions)
 */
const idempotencyGuard = async (req, res, next) => {
    const key = req.headers['x-idempotency-key'];

    // If no key provided, allow request but log warning
    if (!key) {
        console.warn('⚠️ Request without X-Idempotency-Key header');
        return next();
    }

    // Validate key format (should be UUID or similar)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(key) && key.length < 32) {
        return next(new HttpError("Invalid idempotency key format. Please provide a valid UUID.", 400));
    }

    try {
        // Try to insert the key - will fail if already exists (unique constraint)
        await IdempotencyModel.create({ key });

        // Store original json method to intercept response
        const originalJson = res.json.bind(res);
        const responseHashes = new Map();

        res.json = (body) => {
            // Create hash of response for duplicate detection
            const responseHash = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
            responseHashes.set(key, responseHash);
            
            return originalJson(body);
        };

        next();
    } catch (error) {
        // E11000 = Duplicate Key Error in MongoDB
        if (error.code === 11000) {
            return next(new HttpError(
                "Request is being processed or already completed. Please wait.",
                429,
                { retryAfter: 300 } // 5 minutes
            ));
        }
        next(new HttpError("Idempotency check failed", 500));
    }
};

module.exports = idempotencyGuard;
