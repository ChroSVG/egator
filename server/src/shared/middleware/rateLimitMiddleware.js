const rateLimit = require('express-rate-limit');

/**
 * Rate Limiting Middleware
 * 
 * Prevents brute force attacks and API abuse by limiting requests per IP/user.
 */

// General API rate limit - 100 requests per 15 minutes
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again after 15 minutes'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skip: (req) => req.path === '/api/health', // Skip health check
});

// Login rate limit - 5 attempts per 15 minutes (prevent brute force)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login attempts per windowMs
    message: {
        success: false,
        message: 'Too many login attempts, please try again after 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Use IP + email combination for more granular limiting
        return req.ip + (req.body.email || '');
    },
});

// Registration rate limit - 3 registrations per hour
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 registrations per hour
    message: {
        success: false,
        message: 'Too many registration attempts, please try again after 1 hour'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Use IP + email combination
        return req.ip + (req.body.email || '');
    },
});

// Vote rate limit - 1 vote per 5 seconds per user (prevent rapid voting)
const voteLimiter = rateLimit({
    windowMs: 5 * 1000, // 5 seconds
    max: 1, // Limit each user to 1 vote per 5 seconds
    message: {
        success: false,
        message: 'You are voting too fast. Please wait 5 seconds before voting again.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Use user ID from auth middleware
        return req.user?.id || req.ip;
    },
});

// Admin operations rate limit - 30 requests per minute
const adminLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // Limit each admin to 30 operations per minute
    message: {
        success: false,
        message: 'Too many admin operations, please slow down'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    generalLimiter,
    loginLimiter,
    registerLimiter,
    voteLimiter,
    adminLimiter,
};
