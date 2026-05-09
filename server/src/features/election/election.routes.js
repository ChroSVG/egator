const { Router } = require('express');
const router = Router();
const {
    addElection,
    getElections,
    getSingleElection,
    getCandidatesOfElection,
    getVotersOfElection,
    getElectionResults,
    updateElection,
    deleteElection
} = require('./election.controller');

const { authMiddleware, adminOnly } = require('../../shared/middleware/authMiddleware');
const { adminLimiter } = require('../../shared/middleware/rateLimitMiddleware');
const { validate } = require('../../shared/middleware/validationMiddleware');
const { createElectionSchema, updateElectionSchema } = require('../../shared/validations/electionValidation');

router.use(authMiddleware);

router.get('/', getElections);
router.post('/', adminOnly, adminLimiter, createElectionSchema, validate, addElection);

router.get('/:id', getSingleElection);
router.patch('/:id', adminOnly, adminLimiter, updateElectionSchema, validate, updateElection);
router.delete('/:id', adminOnly, adminLimiter, deleteElection);

router.get('/:id/candidates', getCandidatesOfElection);
router.get('/:id/voters', getVotersOfElection);
router.get('/:electionId/results', getElectionResults);

module.exports = router;
