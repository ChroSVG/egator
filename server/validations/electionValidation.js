const { body, param } = require('express-validator');

const createElectionSchema = [
    body('title')
        .trim()
        .notEmpty().withMessage('Election title is required')
        .isLength({ min: 3, max: 200 }).withMessage('Title must be between 3 and 200 characters'),
    body('description')
        .trim()
        .notEmpty().withMessage('Election description is required')
        .isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10 and 2000 characters'),
];

const updateElectionSchema = [
    param('id').isMongoId().withMessage('Invalid election ID format'),
    body('title')
        .optional()
        .trim()
        .isLength({ min: 3, max: 200 }).withMessage('Title must be between 3 and 200 characters'),
    body('description')
        .optional()
        .trim()
        .isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10 and 2000 characters'),
];

module.exports = {
    createElectionSchema,
    updateElectionSchema
};
