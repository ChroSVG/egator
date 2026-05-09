const mongoose = require('mongoose');
const CandidateRepository = require('../candidate/candidate.repository');
const ElectionRepository = require('../election/election.repository');
const VoterRepository = require('../auth/auth.repository');
const VoteRecordRepository = require('./vote.repository');
const eventEmitter = require('../../shared/utils/eventEmitter');
const HttpError = require('../../shared/models/errorModel');
const { withTransaction } = require('../../shared/utils/transactionHelper');

/**
 * Voting Service
 * 
 * Handles all vote-related business logic.
 */
class VotingService {
    constructor(candidateRepository = null, electionRepository = null, voterRepository = null, voteRecordRepository = null) {
        this.candidateRepository = candidateRepository || new CandidateRepository();
        this.electionRepository = electionRepository || new ElectionRepository();
        this.voterRepository = voterRepository || new VoterRepository();
        this.voteRecordRepository = voteRecordRepository || new VoteRecordRepository();
    }

    /**
     * Cast a vote for a candidate
     */
    async castVote(voterId, candidateId, electionId, options = {}) {
        const { session } = options;
        
        const candidate = await this.candidateRepository.findById(candidateId, { session });
        if (!candidate) {
            throw new HttpError('Candidate not found', 404);
        }

        if (!candidate.elections || !candidate.elections.includes(electionId)) {
            throw new HttpError('Candidate does not belong to the specified election', 400);
        }

        const voter = await this.voterRepository.findById(voterId, { session });
        if (!voter) {
            throw new HttpError('Voter not found', 404);
        }

        const alreadyVoted = await this.voteRecordRepository.hasVoted(voterId, electionId, { session });
        if (alreadyVoted) {
            throw new HttpError('You have already voted in this election', 409);
        }

        await this.voteRecordRepository.recordVote({
            voter: voterId,
            election: electionId,
            candidate: candidateId
        }, session);

        await this.voterRepository.recordVote(voterId, electionId, session);
        await this.candidateRepository.incrementVoteCount(candidateId, 1, session);

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
     */
    async getVoterVoteHistory(voterId) {
        return await this.voteRecordRepository.getVoterAuditTrail(voterId);
    }

    /**
     * Check if voter has voted in election
     */
    async hasVoted(voterId, electionId) {
        return await this.voteRecordRepository.hasVoted(voterId, electionId);
    }

    /**
     * Get recent votes
     */
    async getRecentVotes(electionId, limit = 10) {
        return await this.voteRecordRepository.getRecentVotes(electionId, limit);
    }

    /**
     * Undo a vote (admin only)
     */
    async undoVote(voterId, electionId) {
        return await withTransaction(async (session) => {
            const voteRecord = await this.voteRecordRepository.getVote(voterId, electionId);
            
            if (!voteRecord) {
                throw new HttpError('No vote record found', 404);
            }

            await this.candidateRepository.decrementVoteCount(
                voteRecord.candidate._id, 
                1, 
                session
            );

            const voter = await this.voterRepository.findById(voterId, { session });
            voter.votedElections = voter.votedElections.filter(
                id => id.toString() !== electionId
            );
            await voter.save({ session });

            await this.voteRecordRepository.deleteVote(voterId, electionId, session);

            return { message: 'Vote successfully undone' };
        });
    }
}

module.exports = VotingService;
