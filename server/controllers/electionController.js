

// Add New Election
// POST : /api/elections
// Protected(only admin can add election)
const addElection = (req, res, next) => {
    res.json({message: 'Election added successfully!'});
}


// Get All Election
// GET : /api/elections
// Protected
const getElections = (req, res, next) => {
    res.json({message: 'Elections retrieved successfully!'});
}


// Get Single Election
// GET : /api/elections/:id
// Protected
const getSingleElection = (req, res, next) => {
    res.json({message: 'Single Election retrieved successfully!'});
}


// Get Election Candidates
// GET : /api/elections/:id/candidates
// Protected
const getCandidatesOfElection = (req, res, next) => {
    res.json({message: 'Election Candidates retrieved successfully!'});
}


// Get Election Voters
// GET : /api/elections/:id/voters
// Protected
const getVotersOfElection = (req, res, next) => {
    res.json({message: 'Election Voters retrieved successfully!'});
}


// Update Election
// PUT : /api/elections/:id
// Protected
const updateElection = (req, res, next) => {
    res.json({message: 'Election updated successfully!'});
}


// Delete Election
// DELETE : /api/elections/:id
// Protected
const deleteElection = (req, res, next) => {
    res.json({message: 'Election deleted successfully!'});
}


module.exports = {addElection, getElections, getSingleElection, getCandidatesOfElection, getVotersOfElection, updateElection, deleteElection};