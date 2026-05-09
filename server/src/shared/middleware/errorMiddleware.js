const config = require('../config');
const logger = require('../utils/logger');

/**
 * 404 Not Found Handler
 */
const notFoundHandler = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    error.statusCode = 404;
    res.status(404);
    next(error);
};

/**
 * Global Error Handler
 */
const errorMiddleware = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    const statusCode = res.statusCode === 200 ? (err.statusCode || err.status || 500) : res.statusCode;
    res.status(statusCode);

    const errorResponse = {
        success: false,
        message: err.message || 'Internal Server Error',
    };

    if (req.id) {
        errorResponse.requestId = req.id;
    }

    if (statusCode === 429 && err.retryAfter) {
        res.set('Retry-After', err.retryAfter.toString());
        errorResponse.retryAfter = err.retryAfter;
    }

    if (config.env === 'development') {
        errorResponse.stack = err.stack;
    }

    logger.error(`${req.method} ${req.originalUrl} - ${statusCode}`, {
        statusCode,
        message: err.message,
        stack: err.stack,
        requestId: req.id
    });

    res.json(errorResponse);
};

module.exports = { notFoundHandler, errorMiddleware };
