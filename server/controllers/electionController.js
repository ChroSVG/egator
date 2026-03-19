const HttpError = require('../models/errorModel');
const cloudinary = require('../utils/cloudinary');
const CandidateModel = require('../models/candidateModel');
const ElectionModel = require('../models/electionModel');
const VoterModel = require('../models/voterModel');

const { v4: uuid } = require('uuid');
const path = require('path');

/**
 * Add New Election
 * POST : /api/elections
 * Protected (only admin can add election)
 */
const addElection = async (req, res, next) => {
    try {
        if (!req.user.isAdmin) {
            return next(new HttpError("You are not authorized to add an election", 403));
        }

        const { title, description } = req.body;

        if (!title || !description) {
            return next(new HttpError("Please provide title and description", 400));
        }

        if (!req.files || !req.files.thumbnail) {
            return next(new HttpError("Please provide a thumbnail image", 400));
        }

        const { thumbnail } = req.files;

        if (!thumbnail.mimetype.startsWith('image/')) {
            return next(new HttpError("Thumbnail must be an image file", 400));
        }

        if (thumbnail.size > 1 * 1024 * 1024) {
            return next(new HttpError("Thumbnail image size exceeds 1MB limit", 400));
        }

        const fileExtension = thumbnail.name.split('.').pop();
        const fileName = `${thumbnail.name.split('.')[0]}-${uuid()}.${fileExtension}`;
        const filePath = path.join(__dirname, '..', 'uploads', fileName);

        await thumbnail.mv(filePath);

        const result = await cloudinary.uploader.upload(filePath, {
            folder: 'elections',
            public_id: fileName.split('.')[0],
            resource_type: 'image'
        });

        if (!result.secure_url) {
            return next(new HttpError("Failed to upload thumbnail image to Cloudinary", 500));
        }

        const newElection = new ElectionModel({
            title,
            description,
            thumbnail: result.secure_url
        });

        await newElection.save();

        res.status(201).json({
            message: 'Election added successfully!',
            data: newElection
        });

    } catch (error) {
        return next(new HttpError(error.message, 500));
    }
};

/**
 * Get All Elections
 * GET : /api/elections
 * Protected
 */
const getElections = async (req, res, next) => {
    try {
        const elections = await ElectionModel.find().sort({ createdAt: -1 });
        res.status(200).json({
            message: 'Elections retrieved successfully!',
            count: elections.length,
            data: elections
        });
    } catch (error) {
        return next(new HttpError(error.message, 500));
    }
};

/**
 * Get Single Election
 * GET : /api/elections/:id
 * Protected
 */
const getSingleElection = async (req, res, next) => {
    try {
        const { id } = req.params;
        const election = await ElectionModel.findById(id);
        
        if (!election) {
            return next(new HttpError("Election not found", 404));
        }
        
        res.status(200).json({
            message: 'Election retrieved successfully!',
            data: election
        });
    } catch (error) {
        return next(new HttpError(error.message, 500));
    }
};

/**
 * Get Election Candidates
 * GET : /api/elections/:id/candidates
 * Protected
 */
const getCandidatesOfElection = async (req, res, next) => {
    try {
        const { id } = req.params;
        const election = await ElectionModel.findById(id).populate('candidates');
        
        if (!election) {
            return next(new HttpError("Election not found", 404));
        }
        
        res.status(200).json({
            message: 'Election candidates retrieved successfully!',
            count: election.candidates.length,
            data: election.candidates
        });
    } catch (error) {
        return next(new HttpError(error.message, 500));
    }
};

/**
 * Get Election Voters
 * GET : /api/elections/:id/voters
 * Protected
 */
const getVotersOfElection = async (req, res, next) => {
    try {
        const { id } = req.params;
        const election = await ElectionModel.findById(id);
        
        if (!election) {
            return next(new HttpError("Election not found", 404));
        }

        const voters = await VoterModel.find({ votedElections: id })
            .select('fullName email createdAt');
        
        res.status(200).json({
            message: 'Election voters retrieved successfully!',
            count: voters.length,
            data: voters
        });
    } catch (error) {
        return next(new HttpError(error.message, 500));
    }
};

/**
 * Update Election
 * PATCH : /api/elections/:id
 * Protected (only admin)
 */
const updateElection = async (req, res, next) => {
    try {
        if (!req.user.isAdmin) {
            return next(new HttpError("You are not authorized to update an election", 403));
        }

        const { id } = req.params;
        const { title, description } = req.body;

        if (!title || !description) {
            return next(new HttpError("Please provide title and description", 400));
        }

        const existingElection = await ElectionModel.findById(id);
        if (!existingElection) {
            return next(new HttpError("Election not found", 404));
        }

        const updateData = { title, description };

        if (req.files && req.files.thumbnail) {
            const { thumbnail } = req.files;

            if (!thumbnail.mimetype.startsWith('image/')) {
                return next(new HttpError("Thumbnail must be an image file", 400));
            }

            if (thumbnail.size > 1 * 1024 * 1024) {
                return next(new HttpError("Thumbnail must be less than 1MB", 400));
            }

            const fileExtension = thumbnail.name.split('.').pop();
            const fileName = `${thumbnail.name.split('.')[0]}-${uuid()}.${fileExtension}`;
            const filePath = path.join(__dirname, '..', 'uploads', fileName);

            await thumbnail.mv(filePath);

            const result = await cloudinary.uploader.upload(filePath, {
                folder: 'elections',
                public_id: fileName.split('.')[0],
                resource_type: 'image'
            });

            if (!result.secure_url) {
                return next(new HttpError("Failed to upload thumbnail image to Cloudinary", 500));
            }

            updateData.thumbnail = result.secure_url;
        }

        const updatedElection = await ElectionModel.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            message: 'Election updated successfully!',
            data: updatedElection
        });

    } catch (error) {
        return next(new HttpError(error.message, 500));
    }
};

/**
 * Delete Election
 * DELETE : /api/elections/:id
 * Protected (only admin)
 */
const deleteElection = async (req, res, next) => {
    try {
        if (!req.user.isAdmin) {
            return next(new HttpError("You are not authorized to delete an election", 403));
        }

        const { id } = req.params;
        const election = await ElectionModel.findByIdAndDelete(id);
        
        if (!election) {
            return next(new HttpError("Election not found", 404));
        }

        await CandidateModel.deleteMany({ election: id });

        res.status(200).json({
            message: 'Election deleted successfully!',
            data: election
        });
    } catch (error) {
        return next(new HttpError(error.message, 500));
    }
};

/**
 * Get All Voters of an Election
 * GET : /api/elections/:electionId/voters
 * Protected
 */
const getElectionVoters = async (req, res, next) => {
    try {
        const { electionId } = req.params;

        const participants = await VoterModel.find({
            votedElections: electionId
        })
        .select('fullName email createdAt')
        .lean();

        res.status(200).json({
            count: participants.length,
            voters: participants
        });
    } catch (error) {
        next(new HttpError(error.message, 500));
    }
};

/**
 * Get Election Results
 * GET : /api/elections/:electionId/results
 * Protected
 */
const getElectionResults = async (req, res, next) => {
    try {
        const { electionId } = req.params;

        const candidates = await CandidateModel.find({ election: electionId })
            .sort({ voteCount: -1 });

        const totalVotes = candidates.reduce((sum, cand) => sum + cand.voteCount, 0);

        res.status(200).json({
            electionId,
            totalVotes,
            results: candidates.map(c => ({
                candidateId: c._id,
                name: c.fullName,
                votes: c.voteCount,
                percentage: totalVotes > 0 ? ((c.voteCount / totalVotes) * 100).toFixed(2) + '%' : '0%'
            }))
        });
    } catch (error) {
        next(new HttpError(error.message, 500));
    }
};

module.exports = {
    addElection,
    getElections,
    getSingleElection,
    getCandidatesOfElection,
    getVotersOfElection,
    getElectionVoters,
    getElectionResults,
    updateElection,
    deleteElection
};
