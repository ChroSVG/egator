const AuthService = require('../services/authService');
const { validateEmail, validatePassword } = require('../middleware/validationMiddleware');
const HttpError = require('../models/errorModel');

const authService = new AuthService();

/**
 * Register a new voter
 * POST /api/voters/register
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

        return res.status(201).json(result);
    } catch (error) {
        next(error);
    }
};

/**
 * Login voter
 * POST /api/voters/login
 */
const loginVoter = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const result = await authService.login({ email, password });

        return res.json(result);
    } catch (error) {
        next(error);
    }
};

/**
 * Get voter details
 * GET /api/voters/:id
 */
const getVoter = async (req, res, next) => {
    try {
        const { id } = req.params;

        // User can only view their own profile unless admin
        if (req.user.id !== id && !req.user.isAdmin) {
            throw new HttpError('Access denied', 403);
        }

        const voter = await authService.getVoterById(id);

        return res.json({ voter });
    } catch (error) {
        next(error);
    }
};

module.exports = { registerVoter, loginVoter, getVoter };
