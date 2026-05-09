const mongoose = require('mongoose');
const CandidateRepository = require('../repositories/candidateRepository');
const ElectionRepository = require('../repositories/electionRepository');
const VoterRepository = require('../repositories/voterRepository');
const VoteRecordRepository = require('../repositories/voteRecordRepository');
const eventEmitter = require('../utils/eventEmitter');
const HttpError = require('../models/errorModel');
const { withTransaction } = require('../utils/transactionHelper');
const { startSession } = require('../models/candidateModel');

/**
 * Voting Service
 * 
 * Handles all vote-related business logic.
 * Implements Service Layer pattern with Repository pattern.
 * Uses Unit of Work pattern for transactions.
 */
class VotingService {
    constructor() {
        this.candidateRepository = new CandidateRepository();
        this.electionRepository = new ElectionRepository();
        this.voterRepository = new VoterRepository();
        this.voteRecordRepository = new VoteRecordRepository();
    }

    /**
     * Cast a vote for a candidate
     * Uses transaction to ensure atomicity
     * @param {string} voterId - Voter ID
     * @param {string} candidateId - Candidate ID
     * @param {string} electionId - Election ID
     * @returns {Promise<object>}
     */
    async castVote(voterId, candidateId, electionId,       options = {}) {

        const { session } = options;
        // 1. Verify candidate exists and belongs to election
        const candidate = await this.candidateRepository.findById(candidateId, { session });
        if (!candidate) {
            throw new HttpError('Candidate not found', 404);
        }

        // Check candidate belongs to this election (elections is now an array)
        if (!candidate.elections || !candidate.elections.includes(electionId)) {
            throw new HttpError('Candidate does not belong to the specified election', 400);
        }

        // 2. Verify voter exists
        const voter = await this.voterRepository.findById(voterId, { session });
        if (!voter) {
            throw new HttpError('Voter not found', 404);
        }

        // 3. Check if voter already voted (using VoteRecord for authoritative check)
        const alreadyVoted = await this.voteRecordRepository.hasVoted(voterId, electionId, {session});
        if (alreadyVoted) {
            throw new HttpError('You have already voted in this election', 409);
        }

        // 4. Record the vote (with unique constraint protection)
        await this.voteRecordRepository.recordVote({
            voter: voterId,
            election: electionId,
            candidate: candidateId
        }, session);

        // 5. Update voter's voted elections
        await this.voterRepository.recordVote(voterId, electionId, session);

        // 6. Increment candidate's vote count (atomic operation)
        await this.candidateRepository.incrementVoteCount(candidateId, 1, session);

        // 7. Emit event for observers
        eventEmitter.emitVoteCast({
            voterId,
            candidateId,
            electionId
        });

        return {
            message: 'Vote registered successfully!',
            candidate: {
                id: candidateId,
                name: candidate.fullName,
                voteCount: candidate.voteCount + 1
            }
        };
    }


    /**
     * Get vote statistics for an election
     * @param {string} electionId - Election ID
     * @returns {Promise<object>}
     */
    async getVoteStatistics(electionId) {
        const election = await this.electionRepository.findById(electionId);
        
        if (!election) {
            throw new HttpError('Election not found', 404);
        }

        const candidateStats = await this.candidateRepository.getVoteStatistics(electionId);
        const voterCount = await this.voterRepository.countVotersByElection(electionId);

        return {
            election: {
                id: election._id,
                title: election.title
            },
            ...candidateStats,
            totalVotersWhoVoted: voterCount,
            turnoutPercentage: candidateStats.totalCandidates > 0
                ? ((voterCount / candidateStats.totalCandidates) * 100).toFixed(2) + '%'
                : '0%'
        };
    }

    /**
     * Get voter's vote history
     * @param {string} voterId - Voter ID
     * @returns {Promise<Array>}
     */
    async getVoterVoteHistory(voterId) {
        return await this.voteRecordRepository.getVoterAuditTrail(voterId);
    }

    /**
     * Check if voter has voted in election
     * @param {string} voterId - Voter ID
     * @param {string} electionId - Election ID
     * @returns {Promise<boolean>}
     */
    async hasVoted(voterId, electionId) {
        return await this.voteRecordRepository.hasVoted(voterId, electionId);
    }

    /**
     * Get recent votes for an election (for real-time updates)
     * @param {string} electionId - Election ID
     * @param {number} limit - Max results
     * @returns {Promise<Array>}
     */
    async getRecentVotes(electionId, limit = 10) {
        return await this.voteRecordRepository.getRecentVotes(electionId, limit);
    }

    /**
     * Undo a vote (admin only, for correction purposes)
     * @param {string} voterId - Voter ID
     * @param {string} electionId - Election ID
     * @returns {Promise<object>}
     */
    async undoVote(voterId, electionId) {
        return await withTransaction(async (session) => {
            // Get the vote record
            const voteRecord = await this.voteRecordRepository.getVote(voterId, electionId);
            
            if (!voteRecord) {
                throw new HttpError('No vote record found', 404);
            }

            // Decrement candidate's vote count
            await this.candidateRepository.decrementVoteCount(
                voteRecord.candidate._id, 
                1, 
                session
            );

            // Remove from voter's voted elections
            const voter = await this.voterRepository.findById(voterId, { session });
            voter.votedElections = voter.votedElections.filter(
                id => id.toString() !== electionId
            );
            await voter.save({ session });

            // Delete vote record
            await this.voteRecordRepository.deleteVote(voterId, electionId, session);

            return { message: 'Vote successfully undone' };
        });
    }
}

module.exports = VotingService;
