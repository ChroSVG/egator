const BaseRepository = require('./baseRepository');
const Candidate = require('../models/candidateModel');

/**
 * Candidate Repository
 * 
 * Extends base repository with candidate-specific queries.
 * Centralizes all data access logic for Candidate domain.
 */
class CandidateRepository extends BaseRepository {
    constructor() {
        super(Candidate);
    }

    /**
     * Find candidates by election
     * @param {string} electionId - Election ID
     * @param {object} options - Query options
     * @returns {Promise<Array>}
     */
    async findByElection(electionId, options = {}) {
        return await this.findAll(
            { elections: electionId },  // Fixed: use 'elections' array
            {
                sort: { voteCount: -1 },
                ...options
            }
        );
    }

    /**
     * Find candidate with election details
     * @param {string} id - Candidate ID
     * @returns {Promise<object|null>}
     */
    async findByIdWithElection(id) {
        return await this.findById(id, { populate: { path: 'elections', select: 'title' } });  // Fixed: populate 'elections'
    }

    /**
     * Search candidates by name
     * @param {string} searchTerm - Search term
     * @param {object} options - Query options
     * @returns {Promise<Array>}
     */
    async searchByName(searchTerm, options = {}) {
        return await this.findAll(
            { fullName: { $regex: searchTerm, $options: 'i' } },
            options
        );
    }

    /**
     * Get candidates sorted by votes
     * @param {string} electionId - Election ID
     * @param {number} limit - Max results
     * @returns {Promise<Array>}
     */
    async getTopCandidates(electionId, limit = 10) {
        return await this.findAll(
            { elections: electionId },  // Fixed: use 'elections' array
            {
                sort: { voteCount: -1 },
                limit
            }
        );
    }

    /**
     * Increment vote count atomically
     * Uses optimistic locking with version field
     * @param {string} id - Candidate ID
     * @param {number} amount - Amount to increment (default: 1)
     * @param {object} session - MongoDB session
     * @returns {Promise<object>}
     */
    async incrementVoteCount(id, amount = 1, session = null) {
        const result = await this.model.updateOne(
            { _id: id },
            { 
                $inc: { 
                    voteCount: amount,
                    version: 1 
                } 
            },
            { session }
        );
        
        if (result.modifiedCount === 0) {
            throw new Error('Candidate not found or concurrent modification detected');
        }
        
        return result;
    }

    /**
     * Decrement vote count (for undo operations)
     * @param {string} id - Candidate ID
     * @param {number} amount - Amount to decrement
     * @param {object} session - MongoDB session
     * @returns {Promise<object>}
     */
    async decrementVoteCount(id, amount = 1, session = null) {
        return await this.model.updateOne(
            { _id: id },
            { 
                $inc: { 
                    voteCount: -amount,
                    version: 1 
                } 
            },
            { 
                session,
                runValidators: true 
            }
        );
    }

    /**
     * Get vote statistics for election
     * @param {string} electionId - Election ID
     * @returns {Promise<object>}
     */
    async getVoteStatistics(electionId) {
        const candidates = await this.findAll({ elections: electionId });  // Fixed: use 'elections' array

        const totalVotes = candidates.reduce((sum, c) => sum + c.voteCount, 0);
        const totalCandidates = candidates.length;

        return {
            electionId,
            totalVotes,
            totalCandidates,
            averageVotesPerCandidate: totalCandidates > 0
                ? (totalVotes / totalCandidates).toFixed(2)
                : 0,
            leadingCandidate: candidates.length > 0 ? {
                id: candidates[0]._id,
                name: candidates[0].fullName,
                votes: candidates[0].voteCount
            } : null
        };
    }

    /**
     * Bulk delete candidates by election
     * @param {string} electionId - Election ID
     * @param {object} options - Delete options
     * @returns {Promise<object>}
     */
    async deleteByElection(electionId, options = {}) {
        return await this.deleteMany({ elections: electionId }, options);  // Fixed: use 'elections' array
    }
}

module.exports = CandidateRepository;
