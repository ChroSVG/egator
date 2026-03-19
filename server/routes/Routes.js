const {Router} = require('express');
const router = Router();

const {registerVoter, loginVoter, getVoter} = require('../controllers/voterController');

const {addElection, getElections, getSingleElection, getCandidatesOfElection, getVotersOfElection, updateElection, deleteElection} = require('../controllers/electionController');

const {addCandidate, getCandidates, getSingleCandidate, voteForCandidate, deleteCandidate} = require('../controllers/candidateController');

const authMiddleware = require('../middleware/authMiddleware');

router.post('/voters/register', registerVoter);
router.post('/voters/login', loginVoter);
router.get('/voters/:id', authMiddleware, getVoter);


router.post('/elections/', authMiddleware, addElection);
router.get('/elections/', authMiddleware, getElections);
router.get('/elections/:id', authMiddleware, getSingleElection);
router.delete('/elections/:id', authMiddleware, deleteElection);
router.patch('/elections/:id', authMiddleware, updateElection);
router.get('/elections/:id/candidates', authMiddleware, getCandidatesOfElection);
router.get('/elections/:id/voters', authMiddleware, getVotersOfElection);


router.post('/candidates/', authMiddleware, addCandidate);
router.get('/candidates/', authMiddleware, getCandidates);
router.get('/candidates/:id', authMiddleware, getSingleCandidate);
router.delete('/candidates/:id', authMiddleware, deleteCandidate);
// router.patch('/candidates/:id', updateCandidate);
router.patch('/candidates/:id', authMiddleware, voteForCandidate);



module.exports = router;