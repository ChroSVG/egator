/**
 * Vote Command
 * 
 * Implements the Command Pattern - encapsulates a vote operation as an object.
 * 
 * Benefits:
 * - Encapsulates complex logic in a single class
 * - Supports undo/redo operations
 * - Enables command queuing and logging
 * - Makes testing easier
 * - Supports command history/audit trail
 */

const VotingService = require('../services/votingService');
const VoteRecordRepository = require('../repositories/voteRecordRepository');
const CandidateRepository = require('../repositories/candidateRepository');
const VoterRepository = require('../repositories/voterRepository');
const eventEmitter = require('../utils/eventEmitter');
const withTransaction = require('../utils/transactionHelper').withTransaction;
const HttpError = require('../models/errorModel');

class VoteCommand {
    constructor(voterId, candidateId, electionId) {
        this.voterId = voterId;
        this.candidateId = candidateId;
        this.electionId = electionId;
        
        this.votingService = new VotingService();
        this.voteRecordRepository = new VoteRecordRepository();
        this.candidateRepository = new CandidateRepository();
        this.voterRepository = new VoterRepository();
        
        // For undo operation
        this.executed = false;
        this.previousState = null;
    }

    /**
     * Execute the vote command
     * @returns {Promise<object>}
     */
    async execute() {
    if (this.executed) {
        throw new Error('Command already executed');
    }

    // Pastikan menggunakan return await agar error tertangkap dengan benar oleh handler
    return await withTransaction(async (session) => {
        try {
            // 1. Tambahkan { session } pada setiap pembacaan data di dalam transaksi
            const candidate = await this.candidateRepository.findById(this.candidateId, { session });
            const hasVoted = await this.voterRepository.exists({
                _id: this.voterId,
                votedElections: this.electionId
            }, { session }); // Gunakan session di sini
            
            this.previousState = {
                candidateVoteCount: candidate?.voteCount || 0,
                voterHasVoted: hasVoted
            };

            // 2. KRUSIAL: Teruskan session ke service layer
            const result = await this.votingService.castVote(
                this.voterId,
                this.candidateId,
                this.electionId,
                { session } // Pastikan fungsi castVote di votingService menerima parameter ini
            );

            this.executed = true;
            this.log('EXECUTED', result);

            return result;

        } catch (error) {
            this.log('FAILED', error.message);
            // Tetap throw error agar withTransaction memicu abortTransaction/rollback
            throw error;
        }
    });
}

    /**
     * Undo the vote command
     * Only works if the command was successfully executed
     * @returns {Promise<object>}
     */
    async undo() {
        if (!this.executed) {
            throw new Error('Cannot undo - command not executed');
        }

        try {
            // Remove vote record
            await this.voteRecordRepository.deleteVote(
                this.voterId,
                this.electionId,
                session 
            );

            // Decrement candidate vote count
            await this.candidateRepository.decrementVoteCount(this.candidateId, 1, session );

            // Update voter's voted elections
            const voter = await this.voterRepository.findById(this.voterId, {session});
            voter.votedElections = voter.votedElections.filter(
                id => id.toString() !== this.electionId
            );
            await voter.save({ session });

            this.executed = false;

            // Emit undo event
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
     * Only works if the command was previously undone
     * @returns {Promise<object>}
     */
    async redo() {
        if (this.executed) {
            throw new Error('Cannot redo - command already executed');
        }

        return await this.execute();
    }

    /**
     * Validate if command can be executed
     * @returns {Promise<object>}
     */
    async validate() {
        const errors = [];

        // Check voter exists
        const voter = await this.voterRepository.findById(this.voterId);
        if (!voter) {
            errors.push('Voter not found');
        }

        // Check candidate exists
        const candidate = await this.candidateRepository.findById(this.candidateId);
        if (!candidate) {
            errors.push('Candidate not found');
        }

        // Check candidate belongs to election
        if (candidate && candidate.election.toString() !== this.electionId) {
            errors.push('Candidate does not belong to specified election');
        }

        // Check voter hasn't already voted
        const hasVoted = await this.voteRecordRepository.hasVoted(
            this.voterId,
            this.electionId
        );
        if (hasVoted) {
            errors.push('Voter has already voted in this election');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Log command execution
     * @param {string} status - Command status
     * @param {any} data - Additional data
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

        // In production, write to audit log
        console.log('📝 COMMAND LOG:', JSON.stringify(logEntry, null, 2));
    }

    /**
     * Get command info
     * @returns {object}
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
 * 
 * Manages command execution, queuing, and history.
 */
class CommandHandler {
    constructor() {
        this.history = [];
        this.pendingCommands = [];
    }

    /**
     * Execute a command
     * @param {object} command - Command instance
     * @returns {Promise<any>}
     */
    async executeCommand(command) {
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
     * @param {object} command - Command instance
     */
    queueCommand(command) {
        this.pendingCommands.push({
            command,
            queuedAt: new Date().toISOString()
        });
    }

    /**
     * Process queued commands
     * @returns {Promise<Array>}
     */
    async processQueue() {
        const results = [];
        
        while (this.pendingCommands.length > 0) {
            const { command } = this.pendingCommands.shift();
            try {
                const result = await this.executeCommand(command);
                results.push({ success: true, result });
            } catch (error) {
                results.push({ success: false, error: error.message });
            }
        }
        
        return results;
    }

    /**
     * Get command history
     * @param {number} limit - Max history items
     * @returns {Array}
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
