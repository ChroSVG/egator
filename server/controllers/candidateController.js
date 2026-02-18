const HttpError = require('../models/errorModel');
const cloudinary = require('../utils/cloudinary');
const CandidateModel = require('../models/candidateModel');


const {v4 : uuid} = require('uuid');
const path = require('path');


// Add Candidate
// POST : /api/candidates
// Protected(only admin can add candidate)
const addCandidate = async (req, res, next) => {
    try {
        const {name, description, electionId} = req.body;

        if(!name || !description || !electionId) {
            return next(new HttpError("Please provide all required fields", 422));
        }

        const newCandidate = new CandidateModel({
            name,
            description,
            election: electionId
        });

        await newCandidate.save();

        res.status(201).json({message: 'Candidate added successfully!', status: 201, data : newCandidate}); 
    } catch (error) {
        return next(new HttpError(error, 500));
    }
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
const getSingleCandidate = async (req, res, next) => {
    try {
        const {id} = req.params;
        const candidate = await CandidateModel.findOne({election: id});
        if (!candidate) {
            return next(new HttpError("Candidate not found", 404));
        }
        res.status(200).json({message: 'Single Candidate retrieved successfully!', status: 200, data: candidate});
    } catch (error) {
        return next(new HttpError(error, 500));
    }
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