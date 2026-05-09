/**
 * Standardized API Response Helper
 */

const success = (res, { message, data = null, statusCode = 200, pagination = null }) => {
    const response = {
        success: true,
        message,
        data
    };

    if (pagination) {
        response.pagination = pagination;
    }

    return res.status(statusCode).json(response);
};

const error = (res, { message = 'Internal Server Error', statusCode = 500, errors = null }) => {
    const response = {
        success: false,
        message
    };

    if (errors) {
        response.errors = errors;
    }

    return res.status(statusCode).json(response);
};

module.exports = {
    success,
    error
};
