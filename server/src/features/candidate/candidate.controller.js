const CandidateService = require('./candidate.service');
const VotingService = require('../vote/vote.service');
const { VoteCommand, CommandHandler } = require('../vote/vote.command');
const cacheService = require('../../shared/utils/cacheService');
const HttpError = require('../../shared/models/errorModel');
const responseHelper = require('../../shared/utils/responseHelper');
const ElectionService = require('../election/election.service');
const VoterRepository = require('../auth/auth.repository');

const candidateService = new CandidateService();
const votingService = new VotingService();
const voteHandler = new CommandHandler();
const electionService = new ElectionService();
const voterRepo = new VoterRepository();

/**
 * Add Candidate
 */
const addCandidate = async (req, res, next) => {
    try {
        const { fullName, motto, election } = req.body;

        if (!req.files || !req.files.image) {
            throw new HttpError('Please provide a candidate image', 400);
        }

        const candidate = await candidateService.createCandidate(
            { fullName, motto, election },
            req.files.image
        );

        await cacheService.invalidateCandidate();
        await cacheService.invalidateElection(election);

        return responseHelper.success(res, {
            statusCode: 201,
            message: 'Candidate added successfully!',
            data: candidate
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get All Candidates
 */
const getCandidates = async (req, res, next) => {
    try {
        const candidates = await cacheService.getOrSet(
            'candidates:all',
            async () => await candidateService.getAllCandidates(),
            300
        );

        return responseHelper.success(res, {
            message: 'Candidates retrieved successfully!',
            data: candidates
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get Single Candidate
 */
const getSingleCandidate = async (req, res, next) => {
    try {
        const { id } = req.params;
        const candidate = await cacheService.getOrSet(
            `candidate:${id}`,
            async () => await candidateService.getCandidateById(id),
            600
        );

        return responseHelper.success(res, {
            message: 'Candidate retrieved successfully!',
            data: candidate
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Vote For Candidate
 */
const voteForCandidate = async (req, res, next) => {
    try {
        const { id: candidateId } = req.params;
        const { selectedElectionId } = req.body;
        const voterId = req.user.id;

        const voteCommand = new VoteCommand(
            votingService,
            candidateId,
            voterId,
            selectedElectionId
        );

        await voteHandler.execute(voteCommand);

        // Fetch updated voter data
        const updatedVoter = await voterRepo.findByIdSelective(voterId);

        return responseHelper.success(res, {
            message: 'Vote registered successfully!',
            data: {
                candidate: candidateId,
                voter: updatedVoter
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get Vote History
 */
const getVoteHistory = async (req, res) => {
    return responseHelper.success(res, {
        message: 'Vote history retrieved successfully',
        data: voteHandler.getHistory()
    });
};

/**
 * Update Candidate
 */
const updateCandidate = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { fullName, motto } = req.body;

        const candidate = await candidateService.updateCandidate(
            id,
            { fullName, motto },
            req.files?.image || null
        );

        await cacheService.invalidateCandidate(id);

        return responseHelper.success(res, {
            message: 'Candidate updated successfully!',
            data: candidate
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete Candidate
 */
const deleteCandidate = async (req, res, next) => {
    try {
        const { id } = req.params;
        const candidate = await candidateService.deleteCandidate(id);

        await cacheService.invalidateCandidate(id);

        return responseHelper.success(res, {
            message: 'Candidate deleted successfully!',
            data: candidate
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Add Candidate to Election
 */
const addCandidateToElection = async (req, res, next) => {
    try {
        const { id: candidateId, electionId } = req.params;
        const { fullName, motto } = req.body;

        const effectiveCandidateId = candidateId === 'new' ? null : candidateId;
        const effectiveElectionId = electionId || req.body.election;

        const result = await candidateService.addCandidateToElection(
            effectiveCandidateId,
            effectiveElectionId,
            { fullName, motto },
            req.files?.image || null
        );

        await cacheService.invalidateCandidate(effectiveCandidateId);
        await cacheService.invalidateElection(effectiveElectionId);

        return responseHelper.success(res, {
            message: fullName ? 'Candidate created and added to election successfully!' : 'Candidate added to election successfully!',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Remove Candidate from Election
 */
const removeCandidateFromElection = async (req, res, next) => {
    try {
        const { id: candidateId, electionId } = req.params;
        const candidate = await candidateService.removeCandidateFromElection(candidateId, electionId);

        await cacheService.invalidateCandidate(candidateId);
        await cacheService.invalidateElection(electionId);

        return responseHelper.success(res, {
            message: 'Candidate removed from election successfully!',
            data: candidate
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Move Candidate between Elections
 */
const moveCandidateToElection = async (req, res, next) => {
    try {
        const { id: candidateId } = req.params;
        const { fromElectionId, toElectionId } = req.body;

        const candidate = await candidateService.moveCandidateToElection(candidateId, fromElectionId, toElectionId);

        await cacheService.invalidateCandidate(candidateId);
        await cacheService.invalidateElection(fromElectionId);
        await cacheService.invalidateElection(toElectionId);

        return responseHelper.success(res, {
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
    getVoteHistory,
    updateCandidate,
    deleteCandidate,
    addCandidateToElection,
    removeCandidateFromElection,
    moveCandidateToElection
};
