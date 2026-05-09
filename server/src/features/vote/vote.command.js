/**
 * Vote Command
 * 
 * Implements the Command Pattern - encapsulates a vote operation as an object.
 */

const VotingService = require('./vote.service');
const VoteRecordRepository = require('./vote.repository');
const CandidateRepository = require('../candidate/candidate.repository');
const VoterRepository = require('../auth/auth.repository');
const eventEmitter = require('../../shared/utils/eventEmitter');
const { withTransaction } = require('../../shared/utils/transactionHelper');
const HttpError = require('../../shared/models/errorModel');

class VoteCommand {
    constructor(votingService, candidateId, voterId, electionId) {
        this.voterId = voterId;
        this.candidateId = candidateId;
        this.electionId = electionId;
        
        this.votingService = votingService || new VotingService();
        this.voteRecordRepository = new VoteRecordRepository();
        this.candidateRepository = new CandidateRepository();
        this.voterRepository = new VoterRepository();
        
        this.executed = false;
        this.previousState = null;
    }

    /**
     * Execute the vote command
     */
    async execute() {
        if (this.executed) {
            throw new Error('Command already executed');
        }

        return await withTransaction(async (session) => {
            try {
                const candidate = await this.candidateRepository.findById(this.candidateId, { session });
                const hasVoted = await this.voterRepository.exists({
                    _id: this.voterId,
                    votedElections: this.electionId
                }, { session });
                
                this.previousState = {
                    candidateVoteCount: candidate?.voteCount || 0,
                    voterHasVoted: hasVoted
                };

                const result = await this.votingService.castVote(
                    this.voterId,
                    this.candidateId,
                    this.electionId,
                    { session }
                );

                this.executed = true;
                this.log('EXECUTED', result);

                return result;

            } catch (error) {
                this.log('FAILED', error.message);
                throw error;
            }
        });
    }

    /**
     * Undo the vote command
     */
    async undo() {
        if (!this.executed) {
            throw new Error('Cannot undo - command not executed');
        }

        try {
            await this.voteRecordRepository.deleteVote(
                this.voterId,
                this.electionId
            );

            await this.candidateRepository.decrementVoteCount(this.candidateId, 1);

            const voter = await this.voterRepository.findById(this.voterId);
            if (voter && voter.votedElections) {
                voter.votedElections = voter.votedElections.filter(
                    id => id.toString() !== this.electionId
                );
                await voter.save();
            }

            this.executed = false;

            eventEmitter.emit('vote:undone', {
                voterId: this.voterId,
                candidateId: this.candidateId,
                electionId: this.electionId,
                timestamp: new Date().toISOString()
            });

            this.log('UNDONE');

            return { message: 'Vote successfully undone' };

        } catch (error) {
            this.log('UNDO_FAILED', error.message);
            throw error;
        }
    }

    /**
     * Redo the vote command
     */
    async redo() {
        if (this.executed) {
            throw new Error('Cannot redo - command already executed');
        }

        return await this.execute();
    }

    /**
     * Log command execution
     */
    log(status, data = null) {
        const logEntry = {
            command: 'VoteCommand',
            voterId: this.voterId,
            candidateId: this.candidateId,
            electionId: this.electionId,
            status,
            data,
            timestamp: new Date().toISOString()
        };

        console.log('📝 COMMAND LOG:', JSON.stringify(logEntry, null, 2));
    }

    /**
     * Get command info
     */
    getInfo() {
        return {
            type: 'VoteCommand',
            voterId: this.voterId,
            candidateId: this.candidateId,
            electionId: this.electionId,
            executed: this.executed,
            previousState: this.previousState
        };
    }
}

/**
 * Command Handler
 */
class CommandHandler {
    constructor() {
        this.history = [];
        this.pendingCommands = [];
    }

    /**
     * Execute a command
     */
    async execute(command) {
        try {
            const result = await command.execute();
            this.history.push({
                command,
                executedAt: new Date().toISOString(),
                status: 'success'
            });
            return result;
        } catch (error) {
            this.history.push({
                command,
                executedAt: new Date().toISOString(),
                status: 'failed',
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Queue command for later execution
     */
    queueCommand(command) {
        this.pendingCommands.push({
            command,
            queuedAt: new Date().toISOString()
        });
    }

    /**
     * Process queued commands
     */
    async processQueue() {
        const results = [];
        
        while (this.pendingCommands.length > 0) {
            const { command } = this.pendingCommands.shift();
            try {
                const result = await this.execute(command);
                results.push({ success: true, result });
            } catch (error) {
                results.push({ success: false, error: error.message });
            }
        }
        
        return results;
    }

    /**
     * Get command history
     */
    getHistory(limit = 10) {
        return this.history.slice(-limit);
    }

    /**
     * Clear command history
     */
    clearHistory() {
        this.history = [];
    }
}

module.exports = {
    VoteCommand,
    CommandHandler
};
