const BaseRepository = require('../../shared/repositories/baseRepository');
const Candidate = require('./candidate.model');

/**
 * Candidate Repository
 * 
 * Extends base repository with candidate-specific queries.
 */
class CandidateRepository extends BaseRepository {
    constructor() {
        super(Candidate);
    }

    /**
     * Find candidates by election
     */
    async findByElection(electionId, options = {}) {
        return await this.findAll(
            { elections: electionId },
            {
                sort: { voteCount: -1 },
                ...options
            }
        );
    }

    /**
     * Find candidate with election details
     */
    async findByIdWithElection(id) {
        return await this.findById(id, { populate: { path: 'elections', select: 'title' } });
    }

    /**
     * Search candidates by name
     */
    async searchByName(searchTerm, options = {}) {
        return await this.findAll(
            { fullName: { $regex: searchTerm, $options: 'i' } },
            options
        );
    }

    /**
     * Get candidates sorted by votes
     */
    async getTopCandidates(electionId, limit = 10) {
        return await this.findAll(
            { elections: electionId },
            {
                sort: { voteCount: -1 },
                limit
            }
        );
    }

    /**
     * Increment vote count atomically
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
     * Decrement vote count
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
     */
    async getVoteStatistics(electionId) {
        const candidates = await this.findAll({ elections: electionId });

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
     */
    async deleteByElection(electionId, options = {}) {
        return await this.deleteMany({ elections: electionId }, options);
    }
}

module.exports = CandidateRepository;
