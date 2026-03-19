const VotingService = require('../../../services/votingService');
const CandidateRepository = require('../../../repositories/candidateRepository');
const ElectionRepository = require('../../../repositories/electionRepository');
const VoterRepository = require('../../../repositories/voterRepository');
const VoteRecordRepository = require('../../../repositories/voteRecordRepository');
const HttpError = require('../../../models/errorModel');

// Mock repositories
jest.mock('../../../repositories/candidateRepository');
jest.mock('../../../repositories/electionRepository');
jest.mock('../../../repositories/voterRepository');
jest.mock('../../../repositories/voteRecordRepository');

// Mock transaction helper to execute operation immediately and return result
jest.mock('../../../utils/transactionHelper', () => ({
    withTransaction: jest.fn(async (operation) => {
        const mockSession = {};
        return await operation(mockSession);
    })
}));

describe('VotingService', () => {
    let votingService;
    let mockCandidate;
    let mockVoter;
    let mockElection;

    beforeEach(() => {
        votingService = new VotingService();
        
        mockCandidate = {
            _id: 'candidate-id',
            fullName: 'Test Candidate',
            election: 'election-id',
            voteCount: 0
        };

        mockVoter = {
            _id: 'voter-id',
            fullName: 'Test Voter',
            email: 'test@example.com',
            votedElections: []
        };

        mockElection = {
            _id: 'election-id',
            title: 'Test Election'
        };

        jest.clearAllMocks();
    });

    describe('castVote', () => {
        it('should cast vote successfully', async () => {
            // Mock repository responses
            CandidateRepository.prototype.findById.mockResolvedValue(mockCandidate);
            VoterRepository.prototype.findById.mockResolvedValue(mockVoter);
            VoteRecordRepository.prototype.hasVoted.mockResolvedValue(false);
            VoteRecordRepository.prototype.recordVote.mockResolvedValue({});
            VoterRepository.prototype.recordVote.mockResolvedValue({});
            CandidateRepository.prototype.incrementVoteCount.mockResolvedValue({ modifiedCount: 1 });

            const result = await votingService.castVote('voter-id', 'candidate-id', 'election-id');

            expect(result).toBeDefined();
            expect(VoteRecordRepository.prototype.recordVote).toHaveBeenCalled();
            expect(CandidateRepository.prototype.incrementVoteCount).toHaveBeenCalled();
        });

        it('should fail if candidate not found', async () => {
            CandidateRepository.prototype.findById.mockResolvedValue(null);

            await expect(votingService.castVote('voter-id', 'invalid-candidate', 'election-id'))
                .rejects.toThrow('Candidate not found');
        });

        it('should fail if candidate does not belong to election', async () => {
            const wrongCandidate = { ...mockCandidate, election: 'different-election' };
            CandidateRepository.prototype.findById.mockResolvedValue(wrongCandidate);

            await expect(votingService.castVote('voter-id', 'candidate-id', 'election-id'))
                .rejects.toThrow('does not belong to the specified election');
        });

        it('should fail if voter not found', async () => {
            CandidateRepository.prototype.findById.mockResolvedValue(mockCandidate);
            VoterRepository.prototype.findById.mockResolvedValue(null);

            await expect(votingService.castVote('invalid-voter', 'candidate-id', 'election-id'))
                .rejects.toThrow('Voter not found');
        });

        it('should fail if voter already voted', async () => {
            CandidateRepository.prototype.findById.mockResolvedValue(mockCandidate);
            VoterRepository.prototype.findById.mockResolvedValue(mockVoter);
            VoteRecordRepository.prototype.hasVoted.mockResolvedValue(true);

            await expect(votingService.castVote('voter-id', 'candidate-id', 'election-id'))
                .rejects.toThrow('already voted');
        });
    });

    describe('getElectionResults', () => {
        it('should return election results', async () => {
            const mockResults = {
                election: { id: 'election-id', title: 'Test' },
                totalVotes: 100,
                results: [
                    { candidateId: '1', name: 'Candidate 1', votes: 60, percentage: '60.00%' },
                    { candidateId: '2', name: 'Candidate 2', votes: 40, percentage: '40.00%' }
                ]
            };

            ElectionRepository.prototype.getResults.mockResolvedValue(mockResults);

            const result = await votingService.getElectionResults('election-id');

            expect(ElectionRepository.prototype.getResults)
                .toHaveBeenCalledWith('election-id');
            expect(result).toEqual(mockResults);
        });

        it('should fail if election not found', async () => {
            ElectionRepository.prototype.getResults.mockResolvedValue(null);

            await expect(votingService.getElectionResults('invalid-id'))
                .rejects.toThrow(HttpError);
            await expect(votingService.getElectionResults('invalid-id'))
                .rejects.toHaveProperty('statusCode', 404);
        });
    });

    describe('getVoteStatistics', () => {
        it('should return vote statistics', async () => {
            ElectionRepository.prototype.findById.mockResolvedValue(mockElection);
            CandidateRepository.prototype.getVoteStatistics.mockResolvedValue({
                electionId: 'election-id',
                totalVotes: 100,
                totalCandidates: 2
            });
            VoterRepository.prototype.countVotersByElection.mockResolvedValue(80);

            const result = await votingService.getVoteStatistics('election-id');

            expect(result).toHaveProperty('totalVotes', 100);
            expect(result).toHaveProperty('totalVotersWhoVoted', 80);
        });

        it('should fail if election not found', async () => {
            ElectionRepository.prototype.findById.mockResolvedValue(null);

            await expect(votingService.getVoteStatistics('invalid-id'))
                .rejects.toThrow(HttpError);
        });
    });

    describe('hasVoted', () => {
        it('should return true if voter has voted', async () => {
            VoteRecordRepository.prototype.hasVoted.mockResolvedValue(true);

            const result = await votingService.hasVoted('voter-id', 'election-id');

            expect(result).toBe(true);
        });

        it('should return false if voter has not voted', async () => {
            VoteRecordRepository.prototype.hasVoted.mockResolvedValue(false);

            const result = await votingService.hasVoted('voter-id', 'election-id');

            expect(result).toBe(false);
        });
    });

    describe('undoVote', () => {
        it('should undo vote successfully', async () => {
            const mockVoteRecord = {
                candidate: { _id: 'candidate-id' }
            };
            const mockVoterWithSave = {
                ...mockVoter,
                save: jest.fn().mockResolvedValue(mockVoter)
            };

            VoteRecordRepository.prototype.getVote.mockResolvedValue(mockVoteRecord);
            CandidateRepository.prototype.decrementVoteCount.mockResolvedValue({});
            VoterRepository.prototype.findById.mockResolvedValue(mockVoterWithSave);
            VoteRecordRepository.prototype.deleteVote.mockResolvedValue({});

            const result = await votingService.undoVote('voter-id', 'election-id');

            expect(result).toBeDefined();
            expect(CandidateRepository.prototype.decrementVoteCount).toHaveBeenCalled();
            expect(VoteRecordRepository.prototype.deleteVote).toHaveBeenCalled();
        });

        it('should fail if no vote record found', async () => {
            VoteRecordRepository.prototype.getVote.mockResolvedValue(null);

            await expect(votingService.undoVote('voter-id', 'election-id'))
                .rejects.toThrow('No vote record found');
        });
    });
});
