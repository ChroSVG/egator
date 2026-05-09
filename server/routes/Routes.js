const { Router } = require('express');
const router = Router();

// Controllers
const { registerVoter, loginVoter, getVoter } = require('../controllers/voterController');
const {
    addElection,
    getElections,
    getSingleElection,
    getCandidatesOfElection,
    getVotersOfElection,
    getElectionResults,
    updateElection,
    deleteElection
} = require('../controllers/electionController');
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
} = require('../controllers/candidateController');

// Middlewares
const { authMiddleware, adminOnly } = require('../middleware/authMiddleware');
const { loginLimiter, registerLimiter, voteLimiter, adminLimiter, generalLimiter } = require('../middleware/rateLimitMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const idempotencyGuard = require('../middleware/idempotencyMiddleware');

// Validation Schemas
const { registerSchema, loginSchema } = require('../validations/authValidation');
const { createElectionSchema, updateElectionSchema } = require('../validations/electionValidation');
const { createCandidateSchema, voteSchema } = require('../validations/candidateValidation');

// Apply general rate limit to all routes
router.use(generalLimiter);

// ============ Voter Routes ============
router.post('/voters/register', registerLimiter, registerSchema, validate, registerVoter);
router.post('/voters/login', loginLimiter, loginSchema, validate, loginVoter);
router.get('/voters/:id', authMiddleware, getVoter);

// ============ Election Routes ============
router.post('/elections/', authMiddleware, adminLimiter, adminOnly, createElectionSchema, validate, addElection);
router.get('/elections/', authMiddleware, getElections);
router.get('/elections/:id', authMiddleware, getSingleElection);
router.patch('/elections/:id', authMiddleware, adminLimiter, adminOnly, updateElectionSchema, validate, updateElection);
router.delete('/elections/:id', authMiddleware, adminLimiter, adminOnly, deleteElection);
router.get('/elections/:id/candidates', authMiddleware, getCandidatesOfElection);
router.get('/elections/:id/voters', authMiddleware, getVotersOfElection);
router.get('/elections/:electionId/results', authMiddleware, getElectionResults);

// ============ Candidate Routes ============
router.post('/candidates/', authMiddleware, adminLimiter, adminOnly, createCandidateSchema, validate, addCandidate);
router.post('/candidates/elections/:id', authMiddleware, adminLimiter, adminOnly, createCandidateSchema, validate, addCandidateToElection);
router.get('/candidates/', authMiddleware, getCandidates);
router.get('/candidates/:id', authMiddleware, getSingleCandidate);
router.patch('/candidates/:id', authMiddleware, adminLimiter, adminOnly, updateCandidate);
router.delete('/candidates/:id', authMiddleware, adminLimiter, adminOnly, deleteCandidate);
router.patch('/candidates/:id/vote', authMiddleware, voteLimiter, idempotencyGuard, voteSchema, validate, voteForCandidate);

// Candidate-Election Management (Many-to-Many)
router.post('/candidates/:id/elections/:electionId', authMiddleware, adminLimiter, adminOnly, addCandidateToElection);
router.delete('/candidates/:id/elections/:electionId', authMiddleware, adminLimiter, adminOnly, removeCandidateFromElection);
router.post('/candidates/:id/move', authMiddleware, adminLimiter, adminOnly, moveCandidateToElection);

module.exports = router;
