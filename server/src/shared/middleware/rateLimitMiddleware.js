const rateLimit = require('express-rate-limit');

/**
 * Rate Limiting Middleware
 */

// General API rate limit
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again after 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === '/api/v1/health',
});

// Login rate limit
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        message: 'Too many login attempts, please try again after 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.ip + (req.body.email || '');
    },
});

// Registration rate limit
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: {
        success: false,
        message: 'Too many registration attempts, please try again after 1 hour'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.ip + (req.body.email || '');
    },
});

// Vote rate limit
const voteLimiter = rateLimit({
    windowMs: 5 * 1000,
    max: 1,
    message: {
        success: false,
        message: 'You are voting too fast. Please wait 5 seconds before voting again.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.user?.id || req.ip;
    },
});

// Admin operations rate limit
const adminLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
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
