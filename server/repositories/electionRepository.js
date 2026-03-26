const BaseRepository = require('./baseRepository');
const Election = require('../models/electionModel');

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
     * @param {string} title - Election title
     * @returns {Promise<object|null>}
     */
    async findByTitle(title) {
        return await this.model.findOne({ title });
    }

    /**
     * Get elections with pagination and optional filters
     * @param {object} filters - Filter options (search, sort, page, limit)
     * @returns {Promise<object>}
     */
    async paginate(filters = {}) {
        const { search, sort, page = 1, limit = 10 } = filters;

        let query = {};
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const options = {
            sort: sort === 'createdAt' ? { createdAt: -1 } : { createdAt: 1 }
        };

        return await super.paginate(query, page, limit, options);
    }


    /**
     * Find election with candidates populated
     * @param {string} id - Election ID
     * @returns {Promise<object|null>}
     */
    async findByIdWithCandidates(id) {
        return await this.findById(id, { 
            populate: { path: 'candidates', select: 'fullName image motto voteCount' } 
        });
    }

    /**
     * Get all active elections
     * @returns {Promise<Array>}
     */
    async getActiveElections() {
        return await this.findAll({ isActive: true });
    }

    /**
     * Search elections by title or description
     * @param {string} searchTerm - Search term
     * @returns {Promise<Array>}
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
     * @param {string} electionId - Election ID
     * @param {string} candidateId - Candidate ID
     * @param {object} session - MongoDB session
     * @returns {Promise<object>}
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
     * @param {string} electionId - Election ID
     * @param {string} candidateId - Candidate ID
     * @param {object} session - MongoDB session
     * @returns {Promise<object>}
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
     * @param {string} id - Election ID
     * @returns {Promise<object>}
     */
    async findByIdWithVoterCount(id) {
        const election = await this.findById(id);
        
        if (!election) return null;

        const Voter = require('../models/voterModel');
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
     * @returns {Promise<Array>}
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
     * @param {string} electionId - Election ID
     * @returns {Promise<boolean>}
     */
    async hasCandidates(electionId) {
        const election = await this.findById(electionId);
        return election && election.candidates.length > 0;
    }

    /**
     * Get election results (candidates sorted by votes)
     * @param {string} electionId - Election ID
     * @returns {Promise<Array>}
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
