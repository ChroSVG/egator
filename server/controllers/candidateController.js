const CandidateService = require('../services/candidateService');
const VotingService = require('../services/votingService');
const {VoteCommand, CommandHandler} = require('../commands/voteCommand');
const cacheService = require('../utils/cacheService');
const HttpError = require('../models/errorModel');

const candidateService = new CandidateService();
const votingService = new VotingService();
const voteHandler = new CommandHandler();

/**
 * Add Candidate
 * POST /api/candidates
 */
const addCandidate = async (req, res, next) => {
    try {
        // if (!req.user.isAdmin) {
        //     throw new HttpError('You are not authorized to add a candidate', 403);
        // }

        const { fullName, motto, election } = req.body;

        if (!req.files || !req.files.image) {
            throw new HttpError('Please provide an image for the candidate', 400);
        }

        const candidate = await candidateService.createCandidate(
            { fullName, motto, election },
            req.files.image
        );


        // Invalidate cache
        await cacheService.invalidateCandidate();

        return res.status(201).json({
            message: 'Candidate added successfully!',
            data: candidate
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get All Candidates
 * GET /api/candidates
 */
const getCandidates = async (req, res, next) => {
    try {
        const { election, search, sort, page = 1, limit = 10 } = req.query;

        // Try cache first
        const cacheKey = `candidates:${election || 'all'}:${search || ''}:${sort || 'createdAt'}:${page}:${limit}`;

        const result = await cacheService.getOrSet(
            cacheKey,
            async () => {
                return await candidateService.getCandidates({
                    election,
                    search,
                    sort,
                    page,
                    limit
                });
            },
            300 // 5 minutes TTL
        );

        return res.json({
            status: 200,
            ...result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get Single Candidate
 * GET /api/candidates/:id
 */
const getSingleCandidate = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Try cache first
        const cacheKey = `candidate:${id}`;

        const candidate = await cacheService.getOrSet(
            cacheKey,
            async () => {
                return await candidateService.getCandidateById(id);
            },
            600 // 10 minutes TTL
        );

        return res.json({
            message: 'Candidate retrieved successfully!',
            data: candidate
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Vote for Candidate
 * PATCH /api/candidates/:id/vote
 * 
 * Uses Command Pattern for better control and audit trail.
 */
const voteForCandidate = async (req, res, next) => {
    try {
        const { id: candidateId } = req.params;
        const { selectedElectionId } = req.body;
        const voterId = req.user.id;

        if (!voterId || !selectedElectionId) {
            throw new HttpError('Missing voter ID or election ID', 400);
        }

        // Create vote command
        const voteCommand = new VoteCommand(voterId, candidateId, selectedElectionId);

        // Validate before executing
        const validation = await voteCommand.validate();
        if (!validation.valid) {
            throw new HttpError(validation.errors.join(', '), 400);
        }

        // Execute command
        await voteHandler.executeCommand(voteCommand);
        // Invalidate cache for this election
        await cacheService.invalidateElection(selectedElectionId);
        await cacheService.invalidateCandidate(candidateId);

        return res.json({
            message: 'Vote registered successfully!',
            candidate: candidateId
        });
    } catch (error) {
        next(error);
    }
};

    // Tambahkan fungsi baru untuk melihat history jika diperlukan
const getVoteHistory = async (req, res) => {
    return res.json(voteHandler.getHistory()); // Mengambil 10 history terakhir
};



/**
 * Update Candidate
 * PATCH /api/candidates/:id
 */
const updateCandidate = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { fullName, motto } = req.body;

        // Build update data (partial update supported)
        const updateData = {};
        if (fullName !== undefined) updateData.fullName = fullName;
        if (motto !== undefined) updateData.motto = motto;

        // Handle optional image upload
        const file = req.files?.image || null;

        const candidate = await candidateService.updateCandidate(id, updateData, file);

        // Invalidate cache
        await cacheService.invalidateCandidate(id);

        return res.json({
            message: 'Candidate updated successfully!',
            data: candidate
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete Candidate
 * DELETE /api/candidates/:id
 */
const deleteCandidate = async (req, res, next) => {
    try {
        // if (!req.user.isAdmin) {
        //     throw new HttpError('Unauthorized', 403);
        // }

        const { id } = req.params;

        const candidate = await candidateService.deleteCandidate(id);

        // Invalidate cache
        await cacheService.invalidateCandidate(id);

        return res.json({
            message: 'Candidate deleted successfully!',
            data: candidate
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Add Candidate to Election
 * POST /api/candidates/:id/elections/:electionId
 * Link existing candidate to another election
 */
const addCandidateToElection = async (req, res, next) => {
    try {
        // if (!req.user.isAdmin) {
        //     throw new HttpError('Unauthorized', 403);
        // }

        const { id: candidateId } = req.params;
        const { electionId } = req.params;

        const candidate = await candidateService.addCandidateToElection(candidateId, electionId);

        // Invalidate cache
        await cacheService.invalidateCandidate(candidateId);
        await cacheService.invalidateElection(electionId);

        return res.json({
            message: 'Candidate added to election successfully!',
            data: candidate
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Remove Candidate from Election
 * DELETE /api/candidates/:id/elections/:electionId
 * Unlink candidate from election (without deleting candidate)
 */
const removeCandidateFromElection = async (req, res, next) => {
    try {
        // if (!req.user.isAdmin) {
        //     throw new HttpError('Unauthorized', 403);
        // }

        const { id: candidateId } = req.params;
        const { electionId } = req.params;

        const candidate = await candidateService.removeCandidateFromElection(candidateId, electionId);

        // Invalidate cache
        await cacheService.invalidateCandidate(candidateId);
        await cacheService.invalidateElection(electionId);

        return res.json({
            message: 'Candidate removed from election successfully!',
            data: candidate
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Move Candidate to Different Election
 * POST /api/candidates/:id/move
 * Move candidate from one election to another
 */
const moveCandidateToElection = async (req, res, next) => {
    try {
        // if (!req.user.isAdmin) {
        //     throw new HttpError('Unauthorized', 403);
        // }

        const { id: candidateId } = req.params;
        const { fromElectionId, toElectionId } = req.body;

        if (!fromElectionId || !toElectionId) {
            throw new HttpError('Please provide fromElectionId and toElectionId', 400);
        }

        const candidate = await candidateService.moveCandidateToElection(
            candidateId,
            fromElectionId,
            toElectionId
        );

        // Invalidate cache
        await cacheService.invalidateCandidate(candidateId);
        await cacheService.invalidateElection(fromElectionId);
        await cacheService.invalidateElection(toElectionId);

        return res.json({
            message: 'Candidate moved successfully!',
            data: candidate
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    addCandidate,
    getCandidates,
    getSingleCandidate,
    voteForCandidate,
    deleteCandidate,
    getVoteHistory,
    addCandidateToElection,
    removeCandidateFromElection,
    moveCandidateToElection,
    updateCandidate
};
