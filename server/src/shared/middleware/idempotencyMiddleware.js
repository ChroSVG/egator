const HttpError = require('../models/errorModel');
const IdempotencyModel = require('../models/idempotency.model');
const crypto = require('crypto');

/**
 * Idempotency Guard Middleware
 * 
 * Prevents duplicate requests from being processed.
 */
const idempotencyGuard = async (req, res, next) => {
    const key = req.headers['x-idempotency-key'];

    if (!key) {
        return next();
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(key) && key.length < 32) {
        return next(new HttpError("Invalid idempotency key format. Please provide a valid UUID.", 400));
    }

    try {
        await IdempotencyModel.create({ key });

        const originalJson = res.json.bind(res);
        res.json = (body) => {
            return originalJson(body);
        };

        next();
    } catch (error) {
        if (error.code === 11000) {
            return next(new HttpError(
                "Request is being processed or already completed. Please wait.",
                429,
                { retryAfter: 300 }
            ));
        }
        next(new HttpError("Idempotency check failed", 500));
    }
};

module.exports = idempotencyGuard;
