const { Router } = require('express');
const router = Router();
const {
    addCandidate,
    getCandidates,
    getSingleCandidate,
    voteForCandidate,
    deleteCandidate,
    addCandidateToElection,
    removeCandidateFromElection,
    moveCandidateToElection,
    updateCandidate
} = require('./candidate.controller');

const { authMiddleware, adminOnly } = require('../../shared/middleware/authMiddleware');
const { voteLimiter, adminLimiter } = require('../../shared/middleware/rateLimitMiddleware');
const { validate } = require('../../shared/middleware/validationMiddleware');
const { createCandidateSchema, voteSchema } = require('../../shared/validations/candidateValidation');
const idempotencyGuard = require('../../shared/middleware/idempotencyMiddleware');

router.use(authMiddleware);

router.get('/', getCandidates);
router.post('/', adminOnly, adminLimiter, createCandidateSchema, validate, addCandidate);

router.get('/:id', getSingleCandidate);
router.patch('/:id', adminOnly, adminLimiter, updateCandidate);
router.delete('/:id', adminOnly, adminLimiter, deleteCandidate);

router.patch('/:id/vote', voteLimiter, idempotencyGuard, voteSchema, validate, voteForCandidate);

// Candidate-Election Management
router.post('/elections/:id', adminOnly, adminLimiter, createCandidateSchema, validate, addCandidateToElection);
router.post('/:id/elections/:electionId', adminOnly, adminLimiter, addCandidateToElection);
router.delete('/:id/elections/:electionId', adminOnly, adminLimiter, removeCandidateFromElection);
router.post('/:id/move', adminOnly, adminLimiter, moveCandidateToElection);

module.exports = router;
