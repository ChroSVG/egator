const BaseRepository = require('../../shared/repositories/baseRepository');
const Voter = require('./auth.model');

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
     */
    async findByEmail(email) {
        return await this.findOne({ email: email.toLowerCase() });
    }

    /**
     * Find voter with selected fields
     */
    async findByIdSelective(id, fields = ['fullName', 'email', 'isAdmin', 'votedElections']) {
        return await this.findById(id, { select: fields.join(' ') });
    }

    /**
     * Check if voter has already voted in election
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
     */
    async countVotersByElection(electionId) {
        return await this.count({ votedElections: electionId });
    }

    /**
     * Find admin users
     */
    async findAdmins() {
        return await this.findAll({ isAdmin: true });
    }

    /**
     * Create admin user
     */
    async createAdmin(data) {
        return await this.create({
            ...data,
            isAdmin: true
        });
    }

    /**
     * Update voter password
     */
    async updatePassword(id, hashedPassword) {
        return await this.updateById(id, { password: hashedPassword });
    }

    /**
     * Get voter statistics
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
     *  Remove election reference from all voters
     */
    async removeElectionReference(electionId, options = {}) {
        const { session = null } = options;
        return await this.model.updateMany(
            { votedElections: electionId },
            { $pull: { votedElections: electionId } },
            { session }
        );
    }
};

module.exports = VoterRepository;
