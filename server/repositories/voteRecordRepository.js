const BaseRepository = require('./baseRepository');
const VoteRecord = require('../models/voteRecordModel');

/**
 * VoteRecord Repository
 * 
 * Handles vote recording with database-level uniqueness guarantee.
 * This is the authoritative record of who voted for whom.
 */
class VoteRecordRepository extends BaseRepository {
    constructor() {
        super(VoteRecord);
    }

    /**
     * Record a vote (with unique constraint protection)
     * @param {object} voteData - Vote data
     * @param {object} session - MongoDB session
     * @returns {Promise<object>}
     */
    async recordVote(voteData, session = null) {
        const { voter, election, candidate } = voteData;
        
        // Try to create vote record - will fail if voter already voted
        try {
            return await this.create({
                voter,
                election,
                candidate
            }, { session });
        } catch (error) {
            // E11000 = Duplicate key error
            if (error.code === 11000) {
                throw new Error('You have already voted in this election');
            }
            throw error;
        }
    }

    /**
     * Check if voter has voted in election
     * @param {string} voterId - Voter ID
     * @param {string} electionId - Election ID
     * @returns {Promise<boolean>}
     */
    async hasVoted(voterId, electionId, options = {}) {
        return await this.exists({ voter: voterId, election: electionId }, options);
    }

    /**
     * Get vote record with details
     * @param {string} voterId - Voter ID
     * @param {string} electionId - Election ID
     * @returns {Promise<object|null>}
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
     * @param {string} electionId - Election ID
     * @param {object} options - Query options
     * @returns {Promise<Array>}
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
     * Get votes grouped by candidate
     * @param {string} electionId - Election ID
     * @returns {Promise<Array>}
     */
    async getVotesByCandidate(electionId) {
        const votes = await this.getElectionVotes(electionId);
        
        const grouped = votes.reduce((acc, vote) => {
            const candidateId = vote.candidate._id.toString();
            if (!acc[candidateId]) {
                acc[candidateId] = {
                    candidateId,
                    candidateName: vote.candidate.fullName,
                    count: 0,
                    voters: []
                };
            }
            acc[candidateId].count++;
            acc[candidateId].voters.push({
                voterId: vote.voter._id,
                voterName: vote.voter.fullName,
                votedAt: vote.votedAt
            });
            return acc;
        }, {});
        
        return Object.values(grouped);
    }

    /**
     * Get vote count for candidate
     * @param {string} candidateId - Candidate ID
     * @param {string} electionId - Election ID (optional)
     * @returns {Promise<number>}
     */
    async countVotesForCandidate(candidateId, electionId = null) {
        const filter = { candidate: candidateId };
        if (electionId) {
            filter.election = electionId;
        }
        return await this.count(filter);
    }

    /**
     * Get recent votes
     * @param {string} electionId - Election ID
     * @param {number} limit - Max results
     * @returns {Promise<Array>}
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
     * Delete vote (for admin/correction purposes)
     * @param {string} voterId - Voter ID
     * @param {string} electionId - Election ID
     * @param {object} session - MongoDB session
     * @returns {Promise<object>}
     */
    async deleteVote(voterId, electionId, session = null) {
        return await this.deleteMany(
            { voter: voterId, election: electionId },
            { session }
        );
    }

    /**
     * Get vote audit trail for voter
     * @param {string} voterId - Voter ID
     * @returns {Promise<Array>}
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
