const BaseRepository = require('../../shared/repositories/baseRepository');
const VoteRecord = require('./vote.model');

/**
 * VoteRecord Repository
 * 
 * Handles vote recording with database-level uniqueness guarantee.
 */
class VoteRecordRepository extends BaseRepository {
    constructor() {
        super(VoteRecord);
    }

    /**
     * Record a vote
     */
    async recordVote(voteData, session = null) {
        const { voter, election, candidate } = voteData;
        
        try {
            return await this.create({
                voter,
                election,
                candidate
            }, { session });
        } catch (error) {
            if (error.code === 11000) {
                throw new Error('You have already voted in this election');
            }
            throw error;
        }
    }

    /**
     * Check if voter has voted in election
     */
    async hasVoted(voterId, electionId, options = {}) {
        return await this.exists({ voter: voterId, election: electionId }, options);
    }

    /**
     * Get vote record with details
     */
    async getVote(voterId, electionId) {
        return await this.findOne(
            { voter: voterId, election: electionId },
            { 
                populate: [
                    { path: 'candidate', select: 'fullName image' },
                    { path: 'election', select: 'title' }
                ] 
            }
        );
    }

    /**
     * Get all votes for an election
     */
    async getElectionVotes(electionId, options = {}) {
        return await this.findAll(
            { election: electionId },
            {
                populate: [
                    { path: 'voter', select: 'fullName email' },
                    { path: 'candidate', select: 'fullName' }
                ],
                sort: { votedAt: -1 },
                ...options
            }
        );
    }

    /**
     * Get recent votes
     */
    async getRecentVotes(electionId, limit = 10) {
        return await this.findAll(
            { election: electionId },
            {
                populate: [
                    { path: 'candidate', select: 'fullName' },
                    { path: 'voter', select: 'fullName' }
                ],
                sort: { votedAt: -1 },
                limit
            }
        );
    }

    /**
     * Delete vote
     */
    async deleteVote(voterId, electionId, session = null) {
        return await this.deleteMany(
            { voter: voterId, election: electionId },
            { session }
        );
    }

    /**
     * Get vote audit trail for voter
     */
    async getVoterAuditTrail(voterId) {
        return await this.findAll(
            { voter: voterId },
            {
                populate: [
                    { path: 'election', select: 'title' },
                    { path: 'candidate', select: 'fullName' }
                ],
                sort: { votedAt: -1 }
            }
        );
    }
}

module.exports = VoteRecordRepository;
