const BaseRepository = require('./baseRepository');
const Voter = require('../models/voterModel');

/**
 * Voter Repository
 * 
 * Extends base repository with voter-specific queries.
 */
class VoterRepository extends BaseRepository {
    constructor() {
        super(Voter);
    }

    /**
     * Find voter by email
     * @param {string} email - Email address
     * @returns {Promise<object|null>}
     */
    async findByEmail(email) {
        return await this.findOne({ email: email.toLowerCase() });
    }

    /**
     * Find voter with selected fields
     * @param {string} id - Voter ID
     * @param {Array<string>} fields - Fields to select
     * @returns {Promise<object|null>}
     */
    async findByIdSelective(id, fields = ['fullName', 'email', 'isAdmin', 'votedElections']) {
        return await this.findById(id, { select: fields.join(' ') });
    }

    /**
     * Check if voter has already voted in election
     * @param {string} voterId - Voter ID
     * @param {string} electionId - Election ID
     * @returns {Promise<boolean>}
     */
    async hasVotedInElection(voterId, electionId) {
        const voter = await this.findById(voterId, { select: 'votedElections' });
        
        if (!voter) return false;
        
        return voter.votedElections.some(
            id => id.toString() === electionId.toString()
        );
    }

    /**
     * Record that voter has voted in election
     * @param {string} voterId - Voter ID
     * @param {string} electionId - Election ID
     * @param {object} session - MongoDB session
     * @returns {Promise<object>}
     */
    async recordVote(voterId, electionId, session = null) {
        return await this.updateOne(
            {
                _id: voterId,
                votedElections: { $ne: electionId }
            },
            { $addToSet: { votedElections: electionId } },
            { session }
        );
    }

    /**
     * Find all voters who voted in specific election
     * @param {string} electionId - Election ID
     * @param {object} options - Query options
     * @returns {Promise<Array>}
     */
    async findVotersByElection(electionId, options = {}) {
        const { select = 'fullName email createdAt', ...restOptions } = options;
        
        return await this.findAll(
            { votedElections: electionId },
            { select, ...restOptions }
        );
    }

    /**
     * Count voters who voted in specific election
     * @param {string} electionId - Election ID
     * @returns {Promise<number>}
     */
    async countVotersByElection(electionId) {
        return await this.count({ votedElections: electionId });
    }

    /**
     * Find admin users
     * @returns {Promise<Array>}
     */
    async findAdmins() {
        return await this.findAll({ isAdmin: true });
    }

    /**
     * Create admin user
     * @param {object} data - User data
     * @returns {Promise<object>}
     */
    async createAdmin(data) {
        return await this.create({
            ...data,
            isAdmin: true
        });
    }

    /**
     * Update voter password
     * @param {string} id - Voter ID
     * @param {string} hashedPassword - New hashed password
     * @returns {Promise<object>}
     */
    async updatePassword(id, hashedPassword) {
        return await this.updateById(id, { password: hashedPassword });
    }

    /**
     * Get voter statistics
     * @returns {Promise<object>}
     */
    async getStatistics() {
        const totalVoters = await this.count();
        const totalAdmins = await this.count({ isAdmin: true });
        
        return {
            totalVoters,
            totalAdmins,
            totalRegularVoters: totalVoters - totalAdmins
        };
    };


    /**
     *  Update Many Voters after deleting election
     *  @param {string} id
     *  @return {Promise<object>}
     */
    // Di VoterRepository.js
    async removeElectionReference(electionId, options = {}) {
        const { session = null } = options; // Mengambil session dari objek options
        return await this.model.updateMany(
            { votedElections: electionId },
            { $pull: { votedElections: electionId } },
            { session } // Mongoose mengharapkan session di dalam objek opsi
        );
    }



};

module.exports = VoterRepository;
