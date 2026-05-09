const AuthService = require('./auth.service');
const HttpError = require('../../shared/models/errorModel');
const responseHelper = require('../../shared/utils/responseHelper');

const authService = new AuthService();

/**
 * Register a new voter
 */
const registerVoter = async (req, res, next) => {
    try {
        const { fullName, email, password, password2 } = req.body;

        const result = await authService.register({
            fullName,
            email,
            password,
            password2
        });

        return responseHelper.success(res, {
            statusCode: 201,
            message: 'Voter registered successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Login voter
 */
const loginVoter = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const result = await authService.login({ email, password });

        return responseHelper.success(res, {
            message: 'Login successful',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get voter details
 */
const getVoter = async (req, res, next) => {
    try {
        const { id } = req.params;

        // User can only view their own profile unless admin
        if (req.user.id !== id && !req.user.isAdmin) {
            throw new HttpError('Access denied', 403);
        }

        const voter = await authService.getVoterById(id);

        return responseHelper.success(res, {
            message: 'Voter details retrieved successfully',
            data: voter
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { registerVoter, loginVoter, getVoter };
