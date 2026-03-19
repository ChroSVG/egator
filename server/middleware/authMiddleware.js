const jwt = require('jsonwebtoken');
const HttpError = require('../models/errorModel');

/**
 * Authentication Middleware
 * 
 * Verifies JWT tokens and attaches user information to the request.
 * Must be applied to protected routes.
 * 
 * Expected header: Authorization: Bearer <token>
 */
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || req.headers.Authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(new HttpError("No token provided or invalid format", 401));
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            return next(new HttpError("Invalid token format", 401));
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (!decoded || !decoded.user) {
            return next(new HttpError("Invalid token payload", 401));
        }

        // Attach user info to request
        req.user = decoded.user;
        
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return next(new HttpError("Invalid token", 401));
        }
        if (error.name === 'TokenExpiredError') {
            return next(new HttpError("Token expired, please login again", 401));
        }
        return next(new HttpError(error.message || "Authentication failed", 500));
    }
};

/**
 * Optional Auth Middleware
 * 
 * Attaches user info if token is valid, but doesn't require authentication.
 * Useful for routes that behave differently for authenticated users.
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || req.headers.Authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // No token, continue without user info
            return next();
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (decoded && decoded.user) {
            req.user = decoded.user;
        }
        
        next();
    } catch (error) {
        // Token invalid, continue without user info
        next();
    }
};

/**
 * Admin Authorization Middleware
 * 
 * Checks if the authenticated user has admin privileges.
 * Must be used after authMiddleware.
 */
const adminOnly = (req, res, next) => {
    if (!req.user || !req.user.isAdmin) {
        return next(new HttpError("Access denied. Admin privileges required.", 403));
    }
    next();
};

module.exports = {
    authMiddleware,
    optionalAuth,
    adminOnly
};
