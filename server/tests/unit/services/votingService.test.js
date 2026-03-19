const VotingService = require('../../../services/votingService');
const HttpError = require('../../../models/errorModel');

// Mock transaction helper untuk skip complex transaction logic
jest.mock('../../../utils/transactionHelper', () => ({
    withTransaction: jest.fn((op) => op({}))
}));

describe('VotingService', () => {
    let votingService;

    beforeEach(() => {
        votingService = new VotingService();
        jest.clearAllMocks();
    });

    // Test bahwa service dapat di-instantiate
    describe('Initialization', () => {
        it('should create VotingService instance', () => {
            expect(votingService).toBeDefined();
            expect(votingService.candidateRepository).toBeDefined();
            expect(votingService.electionRepository).toBeDefined();
            expect(votingService.voterRepository).toBeDefined();
            expect(votingService.voteRecordRepository).toBeDefined();
        });
    });

    // Test method existence
    describe('Method Existence', () => {
        it('should have castVote method', () => {
            expect(typeof votingService.castVote).toBe('function');
        });

        it('should have getElectionResults method', () => {
            expect(typeof votingService.getElectionResults).toBe('function');
        });

        it('should have getVoteStatistics method', () => {
            expect(typeof votingService.getVoteStatistics).toBe('function');
        });

        it('should have hasVoted method', () => {
            expect(typeof votingService.hasVoted).toBe('function');
        });

        it('should have undoVote method', () => {
            expect(typeof votingService.undoVote).toBe('function');
        });
    });

    // Integration tests for simple methods that don't require complex mocking
    describe('hasVoted', () => {
        it('should call voteRecordRepository.hasVoted', async () => {
            // Mock the repository method directly on the instance
            votingService.voteRecordRepository.hasVoted = jest.fn().mockResolvedValue(true);

            const result = await votingService.hasVoted('voter-id', 'election-id');

            expect(result).toBe(true);
            expect(votingService.voteRecordRepository.hasVoted)
                .toHaveBeenCalledWith('voter-id', 'election-id');
        });

        it('should return false when voter has not voted', async () => {
            votingService.voteRecordRepository.hasVoted = jest.fn().mockResolvedValue(false);

            const result = await votingService.hasVoted('voter-id', 'election-id');

            expect(result).toBe(false);
        });
    });

    // Test error handling
    describe('Error Handling', () => {
        it('should throw HttpError when castVote fails', async () => {
            // Mock withTransaction to throw error
            const { withTransaction } = require('../../../utils/transactionHelper');
            withTransaction.mockImplementation(() => {
                throw new HttpError('Candidate not found', 404);
            });

            await expect(votingService.castVote('voter', 'candidate', 'election'))
                .rejects.toThrow('Candidate not found');
        });
    });
});
