const HttpError = require('../models/errorModel');
const cloudinary = require('../utils/cloudinary');
const CandidateModel = require('../models/candidateModel');
const ElectionModel = require('../models/electionModel');

const mongoose = require('mongoose');

const {v4 : uuid} = require('uuid');
const path = require('path');


// Add Candidate
// POST : /api/candidates
// Protected(only admin can add candidate)
const addCandidate = async (req, res, next) => {
    let session;
    try {
        if(!req.user.isAdmin) {
          return next(new HttpError("You are not authorized to add a candidate", 403));
        }

        const {fullName, motto, election} = req.body;

        if(!fullName || !motto || !election) {
            return next(new HttpError("Please provide all required fields", 422));
        }
        if (!req.files || !req.files.image) {
            return next(new HttpError("Please provide an image for the candidate", 422));
        }

        const {image} = req.files;

        // Check if image is an image
        if(!image.mimetype.startsWith('image/')) {
            return next(new HttpError("Candidate image must be an image file", 422));
        }
        // Check if image size is less than 1MB
        if (image.size > 1 * 1024 * 1024) {
            return next(new HttpError("Candidate image size exceeds 1MB limit", 422));
        }

        // rename the image file to a unique name using current timestamp and original name

        let fileName = `${image.name.split('.')[0]}-${uuid()}${path.extname(image.name)}`;
        const filePath = path.join(__dirname, '..', 'uploads', fileName);
        // Upload to uploads folder
        await image.mv(filePath, async (err) => {
            if (err) {
                return next(new HttpError("Failed to upload candidate image", 500));
            }
        });

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(filePath, {
            folder: 'candidates',
            resource_type: 'image'
        });

        if (!result || !result.secure_url) {
            return next(new HttpError("Failed to upload candidate image to Cloudinary", 500));
        }

        // 4. Database Transaction
        session = await mongoose.startSession();
        session.startTransaction();

        const newCandidate = new CandidateModel({
            fullName, motto, image: result.secure_url, election
        });

        const electionExists = await ElectionModel.findById(election);
        if (!electionExists) throw new Error("Election not found");

        await newCandidate.save({ session });
        electionExists.candidates.push(newCandidate._id);
        await electionExists.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({ message: 'Candidate added!', data: newCandidate });

    } catch (error) {
        if (session) {
            await session.abortTransaction();
            session.endSession();
        }
        return next(new HttpError(error.message, 500));
    }
}


// Get All Candidates
// GET : /api/candidates
// Protected
const getCandidates = async (req, res, next) => {
    try {
        // Jika route-nya adalah /api/candidates/:electionId
        const { electionId } = req.query;

        if (!electionId) {
            return next(new HttpError("Election ID is required", 422));
        }

        // Gunakan .find() karena kita mencari SEMUA kandidat yang punya electionId tersebut
        const candidates = await CandidateModel.find({ election: electionId }).sort({ createdAt: -1 });

        res.status(200).json({
            message: 'Candidates retrieved successfully!',
            status: 200,
            count: candidates.length,
            data: candidates
        });
    } catch (error) {
        return next(new HttpError(error.message, 500));
    }
}
// Get Single Candidate
// GET : /api/candidates/:id
// Protected
const getSingleCandidate = async (req, res, next) => {
    try {
        const { id } = req.params; // Ini adalah ID si Kandidat (_id)
        
        // Gunakan findById untuk mencari berdasarkan Primary Key kandidat
        const candidate = await CandidateModel.findById(id).populate('election', 'title');

        if (!candidate) {
            return next(new HttpError("Candidate not found", 404));
        }

        res.status(200).json({
            message: 'Single Candidate retrieved successfully!',
            status: 200,
            data: candidate
        });
    } catch (error) {
        return next(new HttpError(error.message, 500));
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