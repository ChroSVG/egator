const { body, param, query, validationResult } = require('express-validator');

/**
 * Input Validation Middleware
 * 
 * Reusable validation rules for API endpoints.
 * Uses express-validator for sanitization and validation.
 */

// Validation result handler
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }
    next();
};

// Email validation rule
const validateEmail = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email address')
        .normalizeEmail()
        .isLength({ max: 255 }).withMessage('Email must be less than 255 characters'),
    
];

// Password validation rule (strong password)
const validatePassword = [
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._\-,#^])[A-Za-z\d@$!%*?&._\-,#^]/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    
];

// Password confirmation validation
const validatePasswordConfirmation = [
    body('password2')
        .notEmpty().withMessage('Password confirmation is required')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords do not match');
            }
            return true;
        }),
    
];

// Full name validation
const validateFullName = [
    body('fullName')
        .trim()
        .notEmpty().withMessage('Full name is required')
        .isLength({ min: 2, max: 100 }).withMessage('Full name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z\s]+$/).withMessage('Full name can only contain letters and spaces'),
    
];

// Election ID validation
const validateElectionId = [
    param('id')
        .notEmpty().withMessage('Election ID is required')
        .isMongoId().withMessage('Invalid election ID format'),
    
];

// Candidate ID validation
const validateCandidateId = [
    param('id')
        .notEmpty().withMessage('Candidate ID is required')
        .isMongoId().withMessage('Invalid candidate ID format'),
    
];

// Voter ID validation
const validateVoterId = [
    param('id')
        .notEmpty().withMessage('Voter ID is required')
        .isMongoId().withMessage('Invalid voter ID format'),
    
];

// Election creation validation
const validateCreateElection = [
    body('title')
        .trim()
        .notEmpty().withMessage('Election title is required')
        .isLength({ min: 3, max: 200 }).withMessage('Title must be between 3 and 200 characters'),
    body('description')
        .trim()
        .notEmpty().withMessage('Election description is required')
        .isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10 and 2000 characters'),
    
];

// Candidate creation validation
const validateCreateCandidate = [
    body('fullName')
        .trim()
        .notEmpty().withMessage('Candidate name is required')
        .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
    body('motto')
        .trim()
        .notEmpty().withMessage('Candidate motto is required')
        .isLength({ min: 3, max: 200 }).withMessage('Motto must be between 3 and 200 characters'),
    body('election')
        .notEmpty().withMessage('Election ID is required')
        .isMongoId().withMessage('Invalid election ID format'),
    
];

// Vote submission validation
const validateVote = [
    body('selectedElectionId')
        .notEmpty().withMessage('Election ID is required')
        .isMongoId().withMessage('Invalid election ID format'),
    
];

// Pagination query validation
const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1 }).withMessage('Page must be a positive integer')
        .toInt(),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
        .toInt(),
    
];

// Search query validation
const validateSearch = [
    query('search')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Search query must be less than 100 characters')
        .escape(),
    
];

module.exports = {
    handleValidationErrors,
    validateEmail,
    validatePassword,
    validatePasswordConfirmation,
    validateFullName,
    validateElectionId,
    validateCandidateId,
    validateVoterId,
    validateCreateElection,
    validateCreateCandidate,
    validateVote,
    validatePagination,
    validateSearch,
};
