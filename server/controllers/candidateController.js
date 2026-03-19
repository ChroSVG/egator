const HttpError = require('../models/errorModel');
const cloudinary = require('../utils/cloudinary');
const CandidateModel = require('../models/candidateModel');
const ElectionModel = require('../models/electionModel');
const VoterModel = require('../models/voterModel');
const mongoose = require('mongoose');

const { v4: uuid } = require('uuid');
const path = require('path');

/**
 * Add Candidate
 * POST : /api/candidates
 * Protected (only admin)
 */
const addCandidate = async (req, res, next) => {
    let session;
    try {
        if (!req.user.isAdmin) {
            return next(new HttpError("You are not authorized to add a candidate", 403));
        }

        const { fullName, motto, election } = req.body;

        if (!fullName || !motto || !election) {
            return next(new HttpError("Please provide all required fields", 400));
        }

        if (!req.files || !req.files.image) {
            return next(new HttpError("Please provide an image for the candidate", 400));
        }

        const { image } = req.files;

        if (!image.mimetype.startsWith('image/')) {
            return next(new HttpError("Candidate image must be an image file", 400));
        }

        if (image.size > 1 * 1024 * 1024) {
            return next(new HttpError("Candidate image size exceeds 1MB limit", 400));
        }

        const fileName = `${image.name.split('.')[0]}-${uuid()}${path.extname(image.name)}`;
        const filePath = path.join(__dirname, '..', 'uploads', fileName);

        await image.mv(filePath);

        const result = await cloudinary.uploader.upload(filePath, {
            folder: 'candidates',
            public_id: fileName.split('.')[0],
            resource_type: 'image'
        });

        if (!result || !result.secure_url) {
            return next(new HttpError("Failed to upload candidate image to Cloudinary", 500));
        }

        session = await mongoose.startSession();
        session.startTransaction();

        const newCandidate = new CandidateModel({
            fullName,
            motto,
            image: result.secure_url,
            election
        });

        const electionExists = await ElectionModel.findById(election).session(session);
        if (!electionExists) {
            throw new Error("Election not found");
        }

        await newCandidate.save({ session });
        electionExists.candidates.push(newCandidate._id);
        await electionExists.save({ session });

        await session.commitTransaction();

        res.status(201).json({
            message: 'Candidate added successfully!',
            data: newCandidate
        });

    } catch (error) {
        if (session) {
            await session.abortTransaction();
        }
        return next(new HttpError(error.message, 500));
    } finally {
        if (session) session.endSession();
    }
};

/**
 * Get All Candidates
 * GET : /api/candidates
 * Protected
 */
const getCandidates = async (req, res, next) => {
    try {
        const { election, search, sort, page = 1, limit = 10 } = req.query;
        let query = {};

        if (election) query.election = election;

        if (search) {
            query.fullName = { $regex: search, $options: 'i' };
        }

        let sortBy = { createdAt: -1 };
        if (sort === 'votes') sortBy = { voteCount: -1 };

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const candidates = await CandidateModel.find(query)
            .populate('election', 'title')
            .sort(sortBy)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await CandidateModel.countDocuments(query);

        res.status(200).json({
            status: 200,
            count: candidates.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            data: candidates
        });
    } catch (error) {
        next(new HttpError(error.message, 500));
    }
};

/**
 * Get Single Candidate
 * GET : /api/candidates/:id
 * Protected
 */
const getSingleCandidate = async (req, res, next) => {
    try {
        const { id } = req.params;

        const candidate = await CandidateModel.findById(id).populate('election', 'title');

        if (!candidate) {
            return next(new HttpError("Candidate not found", 404));
        }

        res.status(200).json({
            message: 'Candidate retrieved successfully!',
            data: candidate
        });
    } catch (error) {
        return next(new HttpError(error.message, 500));
    }
};

/**
 * Vote for Candidate
 * PATCH : /api/candidates/:id/vote
 * Protected
 */
const voteForCandidate = async (req, res, next) => {
    let session;
    try {
        session = await mongoose.startSession();
        session.startTransaction();

        const { id: candidateId } = req.params;
        const { selectedElectionId } = req.body;
        const voterId = req.user.id;

        if (!voterId || !selectedElectionId) {
            throw new Error("Missing voter ID or election ID");
        }

        const candidateInfo = await CandidateModel.findById(candidateId).session(session);
        if (!candidateInfo) {
            throw new Error("Candidate not found");
        }

        const electionIdFromDb = candidateInfo.election;

        if (electionIdFromDb.toString() !== selectedElectionId) {
            throw new Error("Candidate does not belong to the specified election");
        }

        const voterUpdate = await VoterModel.updateOne(
            {
                _id: voterId,
                votedElections: { $ne: electionIdFromDb }
            },
            {
                $push: { votedElections: electionIdFromDb }
            },
            { session }
        );

        if (voterUpdate.matchedCount === 0) {
            throw new Error("Voter not found or you have already voted in this election");
        }

        if (voterUpdate.modifiedCount === 0) {
            throw new Error("You have already voted in this election");
        }

        const candidateUpdate = await CandidateModel.updateOne(
            { _id: candidateId },
            { $inc: { voteCount: 1 } },
            { session }
        );

        if (candidateUpdate.matchedCount === 0) {
            throw new Error("Candidate not found during update");
        }

        await session.commitTransaction();

        res.status(200).json({
            message: 'Vote registered successfully!',
            candidate: candidateId
        });

    } catch (error) {
        if (session) await session.abortTransaction();

        const statusCode = error.message.includes("already") ? 409 :
            error.message.includes("not found") ? 404 : 400;

        next(new HttpError(error.message, statusCode));
    } finally {
        if (session) session.endSession();
    }
};

/**
 * Delete Candidate
 * DELETE : /api/candidates/:id
 * Protected (only admin)
 */
const deleteCandidate = async (req, res, next) => {
    let session;
    try {
        if (!req.user.isAdmin) {
            return next(new HttpError("Unauthorized", 403));
        }

        const { id } = req.params;
        const candidate = await CandidateModel.findById(id).populate('election');
        
        if (!candidate) {
            return next(new HttpError("Candidate not found", 404));
        }

        const publicId = candidate.image.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`candidates/${publicId}`);

        session = await mongoose.startSession();
        session.startTransaction();

        await CandidateModel.findByIdAndDelete(id, { session });

        await ElectionModel.findByIdAndUpdate(
            candidate.election,
            { $pull: { candidates: id } },
            { session }
        );

        await session.commitTransaction();

        res.status(200).json({
            message: 'Candidate deleted successfully!',
            data: candidate
        });
    } catch (error) {
        if (session) await session.abortTransaction();
        next(new HttpError(error.message, 500));
    } finally {
        if (session) session.endSession();
    }
};

module.exports = {
    addCandidate,
    getCandidates,
    getSingleCandidate,
    voteForCandidate,
    deleteCandidate
};
