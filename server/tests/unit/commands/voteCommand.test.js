const { VoteCommand, CommandHandler } = require('../../../commands/voteCommand');
const VotingService = require('../../../services/votingService');
const VoteRecordRepository = require('../../../repositories/voteRecordRepository');
const CandidateRepository = require('../../../repositories/candidateRepository');
const VoterRepository = require('../../../repositories/voterRepository');
const HttpError = require('../../../models/errorModel');

// Mock dependencies
jest.mock('../../../services/votingService');
jest.mock('../../../repositories/voteRecordRepository');
jest.mock('../../../repositories/candidateRepository');
jest.mock('../../../repositories/voterRepository');

describe('VoteCommand', () => {
    let voteCommand;
    let mockVoter;
    let mockCandidate;

    beforeEach(() => {
        mockVoter = { _id: 'voter-id', fullName: 'Test Voter' };
        mockCandidate = { 
            _id: 'candidate-id', 
            fullName: 'Test Candidate',
            election: 'election-id',
            voteCount: 0
        };

        voteCommand = new VoteCommand('voter-id', 'candidate-id', 'election-id');
        
        jest.clearAllMocks();
    });

    describe('execute', () => {
        it('should execute vote successfully', async () => {
            VotingService.prototype.castVote.mockResolvedValue({
                message: 'Vote registered successfully!'
            });

            const result = await voteCommand.execute();

            expect(VotingService.prototype.castVote)
                .toHaveBeenCalledWith('voter-id', 'candidate-id', 'election-id');
            expect(result).toHaveProperty('message', 'Vote registered successfully!');
            expect(voteCommand.executed).toBe(true);
        });

        it('should fail if already executed', async () => {
            voteCommand.executed = true;

            await expect(voteCommand.execute()).rejects.toThrow('Command already executed');
        });

        it('should handle execution error', async () => {
            VotingService.prototype.castVote.mockRejectedValue(
                new HttpError('Already voted', 409)
            );

            await expect(voteCommand.execute()).rejects.toThrow('Already voted');
            expect(voteCommand.executed).toBe(false);
        });
    });

    describe('undo', () => {
        it('should undo vote successfully', async () => {
            voteCommand.executed = true;
            
            const mockVoterWithSave = {
                ...mockVoter,
                votedElections: ['election-id'],
                save: jest.fn().mockResolvedValue(mockVoter)
            };

            VoteRecordRepository.prototype.deleteVote.mockResolvedValue({});
            CandidateRepository.prototype.decrementVoteCount.mockResolvedValue({});
            VoterRepository.prototype.findById.mockResolvedValue(mockVoterWithSave);

            const result = await voteCommand.undo();

            expect(VoteRecordRepository.prototype.deleteVote).toHaveBeenCalled();
            expect(CandidateRepository.prototype.decrementVoteCount).toHaveBeenCalled();
            expect(result).toHaveProperty('message', 'Vote successfully undone');
            expect(voteCommand.executed).toBe(false);
        });

        it('should fail if not executed', async () => {
            voteCommand.executed = false;

            await expect(voteCommand.undo())
                .rejects.toThrow('Cannot undo - command not executed');
        });
    });

    describe('validate', () => {
        it('should return valid if all checks pass', async () => {
            VoterRepository.prototype.findById.mockResolvedValue(mockVoter);
            CandidateRepository.prototype.findById.mockResolvedValue(mockCandidate);
            VoteRecordRepository.prototype.hasVoted.mockResolvedValue(false);

            const result = await voteCommand.validate();

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should return invalid if voter not found', async () => {
            VoterRepository.prototype.findById.mockResolvedValue(null);
            CandidateRepository.prototype.findById.mockResolvedValue(mockCandidate);

            const result = await voteCommand.validate();

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Voter not found');
        });

        it('should return invalid if candidate not found', async () => {
            VoterRepository.prototype.findById.mockResolvedValue(mockVoter);
            CandidateRepository.prototype.findById.mockResolvedValue(null);

            const result = await voteCommand.validate();

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Candidate not found');
        });

        it('should return invalid if candidate does not belong to election', async () => {
            const wrongCandidate = { ...mockCandidate, election: 'different-election' };
            VoterRepository.prototype.findById.mockResolvedValue(mockVoter);
            CandidateRepository.prototype.findById.mockResolvedValue(wrongCandidate);

            const result = await voteCommand.validate();

            expect(result.valid).toBe(false);
            expect(result.errors)
                .toContain('Candidate does not belong to specified election');
        });

        it('should return invalid if voter already voted', async () => {
            VoterRepository.prototype.findById.mockResolvedValue(mockVoter);
            CandidateRepository.prototype.findById.mockResolvedValue(mockCandidate);
            VoteRecordRepository.prototype.hasVoted.mockResolvedValue(true);

            const result = await voteCommand.validate();

            expect(result.valid).toBe(false);
            expect(result.errors)
                .toContain('Voter has already voted in this election');
        });
    });

    describe('getInfo', () => {
        it('should return command information', () => {
            const info = voteCommand.getInfo();

            expect(info).toEqual({
                type: 'VoteCommand',
                voterId: 'voter-id',
                candidateId: 'candidate-id',
                electionId: 'election-id',
                executed: false,
                previousState: null
            });
        });
    });
});

describe('CommandHandler', () => {
    let handler;
    let mockCommand;

    beforeEach(() => {
        handler = new CommandHandler();
        mockCommand = {
            execute: jest.fn(),
            getInfo: jest.fn()
        };
        jest.clearAllMocks();
    });

    describe('executeCommand', () => {
        it('should execute command and add to history', async () => {
            mockCommand.execute.mockResolvedValue({ success: true });

            const result = await handler.executeCommand(mockCommand);

            expect(mockCommand.execute).toHaveBeenCalled();
            expect(result).toEqual({ success: true });
            expect(handler.history).toHaveLength(1);
            expect(handler.history[0].status).toBe('success');
        });

        it('should handle command failure', async () => {
            const testError = new Error('Failed');
            mockCommand.execute.mockRejectedValue(testError);

            const result = await handler.executeCommand(mockCommand);

            expect(result).toEqual({ success: false, error: 'Failed' });
            expect(handler.history).toHaveLength(1);
            expect(handler.history[0].status).toBe('failed');
        });
    });

    describe('queueCommand', () => {
        it('should add command to pending queue', () => {
            handler.queueCommand(mockCommand);

            expect(handler.pendingCommands).toHaveLength(1);
            expect(handler.pendingCommands[0].command).toBe(mockCommand);
        });
    });

    describe('processQueue', () => {
        it('should process all queued commands', async () => {
            const command1 = { execute: jest.fn().mockResolvedValue({ success: true }) };
            const command2 = { execute: jest.fn().mockResolvedValue({ success: true }) };
            
            handler.queueCommand(command1);
            handler.queueCommand(command2);

            const results = await handler.processQueue();

            expect(results).toHaveLength(2);
            expect(handler.pendingCommands).toHaveLength(0);
        });
    });

    describe('getHistory', () => {
        it('should return command history', async () => {
            mockCommand.execute.mockResolvedValue({ success: true });
            
            await handler.executeCommand(mockCommand);
            await handler.executeCommand(mockCommand);

            const history = handler.getHistory(10);

            expect(history).toHaveLength(2);
        });

        it('should limit history to specified count', async () => {
            mockCommand.execute.mockResolvedValue({ success: true });
            
            for (let i = 0; i < 20; i++) {
                await handler.executeCommand(mockCommand);
            }

            const history = handler.getHistory(10);

            expect(history).toHaveLength(10);
        });
    });

    describe('clearHistory', () => {
        it('should clear all history', async () => {
            mockCommand.execute.mockResolvedValue({ success: true });
            
            await handler.executeCommand(mockCommand);
            await handler.executeCommand(mockCommand);

            handler.clearHistory();

            expect(handler.history).toHaveLength(0);
        });
    });
});
