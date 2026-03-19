const HttpError = require('../models/errorModel');
const cloudinary = require('../utils/cloudinary');
const CandidateModel = require('../models/candidateModel');
const ElectionModel = require('../models/electionModel');

const {v4 : uuid} = require('uuid');
const path = require('path');
const electionModel = require('../models/electionModel');

// Add New Election
// POST : /api/elections
// Protected(only admin can add election)
const addElection = async (req, res, next) => {
    try {
    // only admin can add election
    if(!req.user.isAdmin) {
        return next(new HttpError("You are not authorized to add an election", 403));
    }

    const {title, description} = req.body;

    if(!title || !description || !req.files || !req.files.thumbnail) {
        return next(new HttpError("Please provide all required fields", 422));
    }

    if(!req.files.thumbnail) {
        return next(new HttpError("Please provide a thumbnail image", 422));
    }

    const {thumbnail} = req.files;

    // Check if thumbnail is an image
    if(!thumbnail.mimetype.startsWith('image/')) {
        return next(new HttpError("Thumbnail must be an image", 422));
    }

    // Check if thumbnail size is less than 1MB
    if (thumbnail.size > 1 * 1024 * 1024) {
        return next(new HttpError("Thumbnail image size exceeds 1MB limit", 422));
    }

    // rename the thumbnail file to a unique name using current timestamp and original name

    let fileName = thumbnail.name.split('.')[0];
    const fileExtension = thumbnail.name.split('.').pop();
    fileName = `${fileName}-${uuid()}.${fileExtension}`;

    // Upload to uploads folder 
    await thumbnail.mv(path.join(__dirname, '..', 'uploads', fileName), async (err) => {
        if (err) {
            return next(new HttpError("Failed to upload thumbnail image", 500));
        }

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(path.join(__dirname, '..', 'uploads', fileName), {
            folder: 'elections',
            public_id: fileName.split('.')[0],
            resource_type: 'image'
        });

        if(!result.secure_url) {
            return next(new HttpError("Failed to upload thumbnail image to Cloudinary", 500));
        }

        // Save election data to database
        const newElection = new ElectionModel({
            title,
            description,
            thumbnail: result.secure_url
        });

        await newElection.save();

        res.status(201).json({message: 'Election added successfully!', status: 201, data : newElection}); 
    });

    } catch (error) {
        return next(new HttpError(error, 500));
    }


}


// Get All Election
// GET : /api/elections
// Protected
const getElections = async (req, res, next) => {
    try {
        const elections = await ElectionModel.find();
        res.status(200).json({message: 'Elections retrieved successfully!', status: 200, data: elections});
    } catch (error) {
        return next(new HttpError(error, 500));
    }

}


// Get Single Election
// GET : /api/elections/:id
// Protected
const getSingleElection = async (req, res, next) => {
    try {
        const {id} = req.params;
        const election = await ElectionModel.findById(id);
        if (!election) {
            return next(new HttpError("Election not found", 404));
        }
        res.status(200).json({message: 'Single Election retrieved successfully!', status: 200, data: election});
    } catch (error) {
        return next(new HttpError(error, 500));
    }


}


// Get Election Candidates
// GET : /api/elections/:id/candidates
// Protected
const getCandidatesOfElection = async (req, res, next) => {
    try {
        const {id} = req.params;
        const election = await ElectionModel.findById(id).populate('candidates');
        if (!election) {
            return next(new HttpError("Election not found", 404));
        }
        res.status(200).json({message: 'Election Candidates retrieved successfully!', status: 200, data: election.candidates});
    } catch (error) {
        return next(new HttpError(error, 500));
    }

    // try {
    //     const {id} = req.params;
    //     const candidates = await CandidateModel.find({election: id});
    //     res.status(200).json({message: 'Election Candidates retrieved successfully!', status: 200, data: candidates});
    // } catch (error) {
    //     return next(new HttpError(error, 500));
    // }

}


// Get Election Voters
// GET : /api/elections/:id/voters
// Protected
const getVotersOfElection = async (req, res, next) => {
    try {
        const {id} = req.params;
        const election = await ElectionModel.findById(id).populate('voters');
        if (!election || election.voters.length === 0) {
            return next(new HttpError("Election not found or no voters", 404));
        }
        res.status(200).json({message: 'Election Voters retrieved successfully!', status: 200, data: election.voters});
    } catch (error) {
        return next(new HttpError(error, 500));
    }

}


// Update Election
// PUT : /api/elections/:id
// Protected
const updateElection = async (req, res, next) => {
    try {
        // only admin can add election
        if(!req.user.isAdmin) {
            return next(new HttpError("You are not authorized to update an election", 403));
        }

        const {id} = req.params;
        const {title, description} = req.body;

        if(!title || !description) {
            return next(new HttpError("Please provide all required fields", 422));
        }


        const existingElection = await ElectionModel.findById(id);
        if (!existingElection) {
            return next(new HttpError("Election not found", 404));
        }

        if (req.files.thumbnail) {
            const {thumbnail} = req.files;

            // Check if thumbnail is an image
            if(!thumbnail.mimetype.startsWith('image/')) {
                return next(new HttpError("Thumbnail must be an image", 422));
            }

            // Check if thumbnail is less than 1MB
            if(thumbnail.size > 1 * 1024 * 1024) {
                return next(new HttpError("Thumbnail must be less than 1MB", 422));
            }

                // rename the thumbnail file to a unique name using current timestamp and original name

            let fileName = thumbnail.name.split('.')[0];
            const fileExtension = thumbnail.name.split('.').pop();
            fileName = `${fileName}-${uuid()}.${fileExtension}`;
            // Upload to uploads folder 
            await thumbnail.mv(path.join(__dirname, '..', 'uploads', fileName), async (err) => {
                if (err) {
                    return next(new HttpError("Failed to upload thumbnail image", 500));
                }

                // Upload to Cloudinary
                const result = await cloudinary.uploader.upload(path.join(__dirname, '..', 'uploads', fileName), {
                    folder: 'elections',
                    public_id: fileName.split('.')[0],
                    resource_type: 'image'
                });

                if(!result.secure_url) {
                    return next(new HttpError("Failed to upload thumbnail image to Cloudinary", 500));
                }
                
                const Election = await ElectionModel.findByIdAndUpdate(id, {
                    title,
                    description,
                    thumbnail: result.secure_url
                }, {new: true});
                    res.status(200).json({message: 'Election updated successfully!', status: 200, data: Election});
            });
        }

    } catch (error) {
        return next(new HttpError(error, 500));
    }
}


// Delete Election
// DELETE : /api/elections/:id
// Protected
const deleteElection = async (req, res, next) => {
    try {
        // only admin can add election
        if(!req.user.isAdmin) {
            return next(new HttpError("You are not authorized to delete an election", 403));
        }

        const {id} = req.params;
        const election = await ElectionModel.findByIdAndDelete(id);
        if (!election) {
            return next(new HttpError("Election not found", 404));
        }

        // also delete all candidates of the election
        await CandidateModel.deleteMany({election: id});

        res.status(200).json({message: 'Election deleted successfully!', status: 200, data: election});
    } catch (error) {
        return next(new HttpError(error, 500));
    }

}

// Get All Voters of an Election
// GET : /api/elections/:id/voters
// Protected
const getElectionVoters = async (req, res, next) => {
    try {
        const { electionId } = req.params;

        // Cari semua Voter yang memiliki electionId di dalam array votedElections-nya
        const participants = await VoterModel.find({ 
            votedElections: electionId 
        })
        .select('fullName email createdAt') // Ambil field yang perlu saja
        .lean(); // Mengubah instance Mongoose jadi objek JS biasa (lebih cepat & hemat RAM)

        res.status(200).json({
            count: participants.length,
            voters: participants
        });
    } catch (error) {
        next(new HttpError(error.message, 500));
    }
}

// Get Election Results
// GET : /api/elections/:id/results
// Protected
const getElectionResults = async (req, res, next) => {
    try {
        const { electionId } = req.params;

        // Ambil semua kandidat yang ikut election ini
        const candidates = await CandidateModel.find({ election: electionId })
            .sort({ voteCount: -1 }); // Urutkan dari suara terbanyak

        // Hitung total suara masuk secara dinamis
        const totalVotes = candidates.reduce((sum, cand) => sum + cand.voteCount, 0);

        res.status(200).json({
            electionId,
            totalVotes,
            results: candidates.map(c => ({
                name: c.fullName,
                votes: c.voteCount,
                percentage: totalVotes > 0 ? ((c.voteCount / totalVotes) * 100).toFixed(2) + '%' : '0%'
            }))
        });
    } catch (error) {
        next(new HttpError(error.message, 500));
    }
}

module.exports = {addElection, getElections, getSingleElection, getCandidatesOfElection, getElectionVoters, getElectionResults, updateElection, deleteElection};