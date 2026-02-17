// Add Candidate
// POST : /api/candidates
// Protected(only admin can add candidate)
const addCandidate = (req, res, next) => {
    res.json({message: 'Candidate added successfully!'});
}

// Get All Candidates
// GET : /api/candidates
// Protected
const getCandidates = (req, res, next) => {
    res.json({message: 'Candidates retrieved successfully!'});
}

// Get Single Candidate
// GET : /api/candidates/:id
// Protected
const getSingleCandidate = (req, res, next) => {
    res.json({message: 'Single Candidate retrieved successfully!'});
}

// // Update Candidate
// // PATCH : /api/candidates/:id
// // Protected (only admin can update candidate)
// const updateCandidate = (req, res, next) => {
//     res.json({message: 'Candidate updated successfully!'}); 
// }

// Vote for Candidate
// PATCH : /api/candidates/:id/vote
// Protected 
const voteForCandidate = (req, res, next) => {
    res.json({message: 'Voted for candidate successfully!'});
}


// Delete Candidate
// DELETE : /api/candidates/:id
// Protected (only admin can delete candidate)
const deleteCandidate = (req, res, next) => {
    res.json({message: 'Candidate deleted successfully!'});
}

module.exports = {addCandidate, getCandidates, getSingleCandidate, voteForCandidate, deleteCandidate};