const {Router} = require('express');
const router = Router();

const {registerVoter, loginVoter, getVoter} = require('../controllers/voterController');

const {addElection, getElections, getSingleElection, getCandidatesOfElection, getVotersOfElection, updateElection, deleteElection} = require('../controllers/electionController');

const {addCandidate, getCandidates, getSingleCandidate, voteForCandidate, deleteCandidate} = require('../controllers/candidateController');


router.post('/voters/register', registerVoter);
router.post('/voters/login', loginVoter);
router.get('/voters/:id', getVoter);


router.post('/elections/', addElection);
router.get('/elections/', getElections);
router.get('/elections/:id', getSingleElection);
router.delete('/elections/:id', deleteElection);
router.patch('/elections/:id', updateElection);
router.get('/elections/:id/candidates', getCandidatesOfElection);
router.get('/elections/:id/voters', getVotersOfElection);


router.post('/candidates/', addCandidate);
router.get('/candidates/', getCandidates);
router.get('/candidates/:id', getSingleCandidate);
router.delete('/candidates/:id', deleteCandidate);
// router.patch('/candidates/:id', updateCandidate);
router.patch('/candidates/:id', voteForCandidate);



module.exports = router;