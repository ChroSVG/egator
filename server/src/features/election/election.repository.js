const BaseRepository = require('../../shared/repositories/baseRepository');
const Election = require('./election.model');

/**
 * Election Repository
 * 
 * Extends base repository with election-specific queries.
 */
class ElectionRepository extends BaseRepository {
    constructor() {
        super(Election);
    }
    
    /**
     * Find election by title
     */
    async findByTitle(title) {
        return await this.model.findOne({ title });
    }

    /**
     * Get elections with pagination and optional filters
     */
    async paginate(query = {}, page = 1, limit = 10, options = {}) {
        return await super.paginate(query, page, limit, options);
    }

    /**
     * Find election with candidates populated
     */
    async findByIdWithCandidates(id) {
        return await this.findById(id, { 
            populate: { path: 'candidates', select: 'fullName image motto voteCount' } 
        });
    }

    /**
     * Get all active elections
     */
    async getActiveElections() {
        return await this.findAll({ isActive: true });
    }

    /**
     * Search elections by title or description
     */
    async search(searchTerm) {
        return await this.findAll({
            $or: [
                { title: { $regex: searchTerm, $options: 'i' } },
                { description: { $regex: searchTerm, $options: 'i' } }
            ]
        });
    }

    /**
     * Add candidate to election
     */
    async addCandidate(electionId, candidateId, session = null) {
        return await this.updateById(
            electionId,
            { $addToSet: { candidates: candidateId } },
            { session }
        );
    }

    /**
     * Remove candidate from election
     */
    async removeCandidate(electionId, candidateId, session = null) {
        return await this.updateById(
            electionId,
            { $pull: { candidates: candidateId } },
            { session }
        );
    }

    /**
     * Get election with voter count
     */
    async findByIdWithVoterCount(id) {
        const election = await this.findById(id);
        
        if (!election) return null;

        const Voter = require('../auth/auth.model');
        const voterCount = await Voter.countDocuments({
            votedElections: id
        });

        return {
            ...election.toObject(),
            voterCount
        };
    }

    /**
     * Get elections with candidate count
     */
    async getElectionsWithCandidateCount() {
        const elections = await this.findAll({}, { sort: { createdAt: -1 } });
        
        return Promise.all(elections.map(async (election) => ({
            ...election.toObject(),
            candidateCount: election.candidates.length
        })));
    }

    /**
     * Check if election has candidates
     */
    async hasCandidates(electionId) {
        const election = await this.findById(electionId);
        return election && election.candidates.length > 0;
    }

    /**
     * Get election results (candidates sorted by votes)
     */
    async getResults(electionId) {
        const election = await this.findByIdWithCandidates(electionId);
        
        if (!election) return null;

        const totalVotes = election.candidates.reduce(
            (sum, c) => sum + c.voteCount, 
            0
        );

        return {
            election: {
                id: election._id,
                title: election.title,
                description: election.description
            },
            totalVotes,
            results: election.candidates.map(c => ({
                candidateId: c._id,
                name: c.fullName,
                motto: c.motto,
                image: c.image,
                votes: c.voteCount,
                percentage: totalVotes > 0 
                    ? ((c.voteCount / totalVotes) * 100).toFixed(2) + '%' 
                    : '0%'
            }))
        };
    }
}

module.exports = ElectionRepository;
