/**
 * Error Middleware
 * 
 * Centralized error handling for the application.
 * Ensures consistent error response format across all endpoints.
 */

/**
 * 404 Not Found Handler
 * Called when no route matches the request
 */
const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    error.statusCode = 404;
    res.status(404);
    next(error);
};

/**
 * Global Error Handler
 * Formats and sends error responses in a consistent structure
 */
const errorHandler = (err, req, res, next) => {
    // If headers already sent, pass to next error handler
    if (res.headersSent) {
        return next(err);
    }

    // Determine status code
    const statusCode = res.statusCode === 200 ? (err.statusCode || err.status || 500) : res.statusCode;
    res.status(statusCode);

    // Prepare error response
    const errorResponse = {
        success: false,
        message: err.message || 'Internal Server Error',
        statusCode
    };

    // Add request ID if available
    if (req.id) {
        errorResponse.requestId = req.id;
    }

    // Add retry-after header for rate limit errors
    if (statusCode === 429 && err.retryAfter) {
        res.set('Retry-After', err.retryAfter.toString());
        errorResponse.retryAfter = err.retryAfter;
    }

    // Add stack trace in development only
    if (process.env.NODE_ENV === 'development') {
        errorResponse.stack = err.stack;
    }

    // Log error for debugging
    console.error(`❌ [${statusCode}] ${req.method} ${req.originalUrl}`);
    console.error(`   Message: ${err.message}`);
    if (process.env.NODE_ENV === 'development') {
        console.error(`   Stack: ${err.stack}`);
    }

    res.json(errorResponse);
};

module.exports = { notFound, errorHandler };
