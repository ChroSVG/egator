const {Router} = require('express');
const router = Router();

const {registerVoter, loginVoter, getVoter} = require('../controllers/voterController');

const {addElection, getElections, getSingleElection, getCandidatesOfElection, getVotersOfElection, updateElection, deleteElection} = require('../controllers/electionController');


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




module.exports = router;