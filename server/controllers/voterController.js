
// Register a new voter
// post : /api/voters/register
// unprotected
const registerVoter = (req, res, next) => {
    res.json({message: 'Voter registered successfully!'});}


// Login a voter
// post : /api/voters/login
// unprotected
const loginVoter = (req, res, next) => {
    res.json({message: 'Voter logged in successfully!'});}


// Get voter details
// post : /api/voters/:id
// protected
const getVoter = (req, res, next) => {
    res.json({message: 'Voter details retrieved successfully!'});}




module.exports = {registerVoter, loginVoter, getVoter};