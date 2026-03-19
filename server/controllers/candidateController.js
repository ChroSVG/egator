const HttpError = require('../models/errorModel');
const cloudinary = require('../utils/cloudinary');
const CandidateModel = require('../models/candidateModel');
const ElectionModel = require('../models/electionModel');
const VoterModel = require('../models/voterModel');
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
        const { election, search, sort } = req.query;
        let query = {};

        // Filter berdasarkan Election ID
        if (election) query.election = election;

        // Cari berdasarkan nama (Case-insensitive)
        if (search) query.fullName = { $regex: search, $options: 'i' };

        // Sorting: default terbaru, atau bisa berdasarkan vote terbanyak
        let sortBy = { createdAt: -1 };
        if (sort === 'votes') sortBy = { voteCount: -1 };

        const candidates = await CandidateModel.find(query)
            .populate('election', 'title') // Ambil info judul pemilihan saja
            .sort(sortBy);

        res.status(200).json({
            status: 200,
            count: candidates.length,
            data: candidates
        });
    } catch (error) {
        next(new HttpError(error.message, 500));
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
const voteForCandidate = async (req, res, next) => {
    let session;
    try {
        session = await mongoose.startSession();
        session.startTransaction();

        const { id: candidateId } = req.params; 
        const { currentVoterId, selectedElectionId } = req.body;

        if (!currentVoterId || !selectedElectionId) {
            throw new Error("Missing voter ID or election ID");
        }

        // 1. Ambil data kandidat (Opsional: hanya jika butuh verifikasi awal)
        const candidateInfo = await CandidateModel.findById(candidateId).session(session);
        if (!candidateInfo) throw new Error("Candidate not found");

        // Ambil ID Election dari kandidat yang dipilih
        const electionIdFromDb = candidateInfo.election; 

        // 2. Update voter menggunakan ID Election yang valid dari DB
        const voterUpdate = await VoterModel.updateOne(
            { 
                _id: currentVoterId, 
                votedElections: { $ne: electionIdFromDb } // Cek pakai ID asli dari DB
            },
            { 
                $push: { votedElections: electionIdFromDb } 
            },
            { session }
        );

        if (voterUpdate.matchedCount === 0) {
            throw new Error("Voter not found during update");
        }

        // Jika modifiedCount 0, artinya syarat di atas tidak terpenuhi (User sudah pilih)
        if (voterUpdate.modifiedCount === 0) {
            throw new Error("You have already voted in this election");
        }

        // 3. ATOMIC INCREMENT KANDIDAT
        // Menggunakan $inc agar kalkulasi dilakukan di Database, bukan di RAM Node.js
        const candidateUpdate = await CandidateModel.updateOne(
            { _id: candidateId },
            { $inc: { voteCount: 1 } },
            { session }
        );

        if (candidateUpdate.matchedCount === 0) {
            throw new Error("Candidate not found during update");
        }

        // 4. COMMIT TRANSAKSI
        await session.commitTransaction();
        
        res.status(200).json({ 
            message: 'Vote registered successfully!',
            candidate: candidateId
        });

    } catch (error) {
        // Jika ada error di tengah jalan, batalkan SEMUA perubahan
        if (session) await session.abortTransaction();
        
        // Pemetaan status code sederhana
        const statusCode = error.message.includes("already") ? 422 : 
                           error.message.includes("not found") ? 404 : 500;
                           
        next(new HttpError(error.message, statusCode));
    } finally {
        // Selalu tutup session untuk menghindari Memory Leak / Connection Exhaustion
        if (session) session.endSession();
    }
}

// Delete Candidate
// DELETE : /api/candidates/:id
// Protected (only admin can delete candidate)
const deleteCandidate = async (req, res, next) => {
    let session;
    try {
        if (!req.user.isAdmin) return next(new HttpError("Unauthorized", 403));

        const { id } = req.params;
        const candidate = await CandidateModel.findById(id).populate('election');
        if (!candidate) return next(new HttpError("Candidate not found", 404));

        // Hapus di Cloudinary (opsional tapi disarankan)
        const publicId = candidate.image.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`candidates/${publicId}`);

        session = await mongoose.startSession();
        session.startTransaction();

        await CandidateModel.findByIdAndDelete(id, { session });

        // Update Election agar ID kandidat ini hilang dari list
        await ElectionModel.findByIdAndUpdate(
            candidate.election, 
            { $pull: { candidates: id } }, 
            { session }
        );

        await session.commitTransaction();
        res.status(200).json({
            message: 'Candidate deleted successfully!',
            status: 200,
            data: candidate
        });
    } catch (error) {
        if (session) await session.abortTransaction();
        next(new HttpError(error.message, 500));
    }
}

module.exports = {addCandidate, getCandidates, getSingleCandidate, voteForCandidate, deleteCandidate};