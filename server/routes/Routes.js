const { Router } = require('express');
const router = Router();

const { registerVoter, loginVoter, getVoter } = require('../controllers/voterController');
const {
    addElection,
    getElections,
    getSingleElection,
    getCandidatesOfElection,
    getVotersOfElection,
    getElectionVoters,
    getElectionResults,
    updateElection,
    deleteElection
} = require('../controllers/electionController');
const {
    addCandidate,
    getCandidates,
    getSingleCandidate,
    voteForCandidate,
    deleteCandidate
} = require('../controllers/candidateController');

const { authMiddleware, adminOnly } = require('../middleware/authMiddleware');
const { loginLimiter, registerLimiter, voteLimiter, adminLimiter, generalLimiter } = require('../middleware/rateLimitMiddleware');
const { validateEmail, validatePassword, validatePasswordConfirmation, validateCreateElection, validateCreateCandidate, validateVote } = require('../middleware/validationMiddleware');
const idempotencyGuard = require('../middleware/idempotencyMiddleware');

// Apply general rate limit to all routes
router.use(generalLimiter);

// ============ Voter Routes ============
router.post('/voters/register', registerLimiter, validateEmail, validatePassword, validatePasswordConfirmation, registerVoter);
router.post('/voters/login', loginLimiter, validateEmail, validatePassword, loginVoter);
router.get('/voters/:id', authMiddleware, getVoter);

// ============ Election Routes ============
router.post('/elections/', authMiddleware, adminLimiter, validateCreateElection, adminOnly, addElection);
router.get('/elections/', authMiddleware, getElections);
router.get('/elections/:id', authMiddleware, getSingleElection);
router.patch('/elections/:id', authMiddleware, adminLimiter, validateCreateElection, adminOnly, updateElection);
router.delete('/elections/:id', authMiddleware, adminLimiter, adminOnly, deleteElection);
router.get('/elections/:id/candidates', authMiddleware, getCandidatesOfElection);
router.get('/elections/:id/voters', authMiddleware, getVotersOfElection);
router.get('/elections/:electionId/results', authMiddleware, getElectionResults);
router.get('/elections/:electionId/voters', authMiddleware, getElectionVoters);

// ============ Candidate Routes ============
router.post('/candidates/', authMiddleware, adminLimiter, validateCreateCandidate, adminOnly, addCandidate);
router.get('/candidates/', authMiddleware, getCandidates);
router.get('/candidates/:id', authMiddleware, getSingleCandidate);
router.delete('/candidates/:id', authMiddleware, adminLimiter, adminOnly, deleteCandidate);
router.patch('/candidates/:id/vote', authMiddleware, voteLimiter, idempotencyGuard, validateVote, voteForCandidate);

module.exports = router;
