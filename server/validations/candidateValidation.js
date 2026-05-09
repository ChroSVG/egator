const { body, param } = require('express-validator');

const createCandidateSchema = [
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

const voteSchema = [
    param('id').isMongoId().withMessage('Invalid candidate ID format'),
    body('selectedElectionId')
        .notEmpty().withMessage('Election ID is required')
        .isMongoId().withMessage('Invalid election ID format'),
];

module.exports = {
    createCandidateSchema,
    voteSchema
};
