const CandidateRepository = require('../../../repositories/candidateRepository');
const Candidate = require('../../../models/candidateModel');

// Mock the model
jest.mock('../../../models/candidateModel');

describe('CandidateRepository', () => {
    let repository;
    let mockCandidate;

    beforeEach(() => {
        repository = new CandidateRepository();
        mockCandidate = {
            _id: 'test-id',
            fullName: 'Test Candidate',
            motto: 'Test motto',
            image: 'https://test.com/image.jpg',
            election: 'election-id',
            voteCount: 0,
            version: 0,
            save: jest.fn()
        };
        jest.clearAllMocks();
    });

    describe('findByElection', () => {
        it('should find candidates by election ID', async () => {
            const mockCandidates = [mockCandidate];
            Candidate.find.mockReturnValue({
                sort: jest.fn().mockResolvedValue(mockCandidates)
            });

            const result = await repository.findByElection('election-id');

            expect(Candidate.find).toHaveBeenCalledWith({ election: 'election-id' });
            expect(result).toEqual(mockCandidates);
        });

        it('should return empty array if no candidates found', async () => {
            Candidate.find.mockReturnValue({
                sort: jest.fn().mockResolvedValue([])
            });

            const result = await repository.findByElection('election-id');

            expect(result).toEqual([]);
        });
    });

    describe('findByIdWithElection', () => {
        it('should find candidate with populated election', async () => {
            Candidate.findById.mockReturnValue({
                populate: jest.fn().mockResolvedValue(mockCandidate)
            });

            const result = await repository.findByIdWithElection('candidate-id');

            expect(Candidate.findById).toHaveBeenCalledWith('candidate-id');
            expect(result).toEqual(mockCandidate);
        });

        it('should return null if candidate not found', async () => {
            Candidate.findById.mockReturnValue({
                populate: jest.fn().mockResolvedValue(null)
            });

            const result = await repository.findByIdWithElection('invalid-id');

            expect(result).toBeNull();
        });
    });

    describe('searchByName', () => {
        it('should search candidates by name (case-insensitive)', async () => {
            const mockResults = [mockCandidate];
            Candidate.find.mockReturnValue({
                sort: jest.fn().mockResolvedValue(mockResults)
            });

            const result = await repository.searchByName('test');

            expect(Candidate.find).toHaveBeenCalledWith({
                fullName: { $regex: 'test', $options: 'i' }
            });
            expect(result).toEqual(mockResults);
        });
    });

    describe('getTopCandidates', () => {
        it('should return top candidates sorted by votes', async () => {
            const mockCandidates = [
                { ...mockCandidate, voteCount: 100 },
                { ...mockCandidate, voteCount: 50 }
            ];
            Candidate.find.mockReturnValue({
                sort: jest.fn().mockReturnValue({
                    limit: jest.fn().mockResolvedValue(mockCandidates)
                })
            });

            const result = await repository.getTopCandidates('election-id', 10);

            expect(Candidate.find).toHaveBeenCalledWith({ election: 'election-id' });
            expect(result).toHaveLength(2);
        });
    });

    describe('incrementVoteCount', () => {
        it('should increment vote count atomically', async () => {
            Candidate.updateOne.mockResolvedValue({ modifiedCount: 1 });

            const result = await repository.incrementVoteCount('candidate-id', 1);

            expect(Candidate.updateOne).toHaveBeenCalledWith(
                { _id: 'candidate-id' },
                { $inc: { voteCount: 1, version: 1 } },
                expect.any(Object)
            );
            expect(result.modifiedCount).toBe(1);
        });

        it('should throw error if candidate not found', async () => {
            Candidate.updateOne.mockResolvedValue({ modifiedCount: 0 });

            await expect(repository.incrementVoteCount('invalid-id', 1))
                .rejects.toThrow('Candidate not found or concurrent modification detected');
        });
    });

    describe('decrementVoteCount', () => {
        it('should decrement vote count', async () => {
            Candidate.updateOne.mockResolvedValue({ modifiedCount: 1 });

            await repository.decrementVoteCount('candidate-id', 1);

            expect(Candidate.updateOne).toHaveBeenCalledWith(
                { _id: 'candidate-id' },
                { $inc: { voteCount: -1, version: 1 } },
                expect.any(Object)
            );
        });
    });

    describe('getVoteStatistics', () => {
        it('should return vote statistics', async () => {
            const mockCandidates = [
                { _id: '1', fullName: 'Candidate 1', voteCount: 100 },
                { _id: '2', fullName: 'Candidate 2', voteCount: 50 }
            ];
            Candidate.find.mockReturnValue({
                sort: jest.fn().mockResolvedValue(mockCandidates)
            });

            const result = await repository.getVoteStatistics('election-id');

            expect(result).toEqual({
                electionId: 'election-id',
                totalVotes: 150,
                totalCandidates: 2,
                averageVotesPerCandidate: '75.00',
                leadingCandidate: {
                    id: '1',
                    name: 'Candidate 1',
                    votes: 100
                }
            });
        });

        it('should handle empty candidates', async () => {
            Candidate.find.mockReturnValue({
                sort: jest.fn().mockResolvedValue([])
            });

            const result = await repository.getVoteStatistics('election-id');

            expect(result.totalVotes).toBe(0);
            expect(result.totalCandidates).toBe(0);
            expect(result.leadingCandidate).toBeNull();
        });
    });

    describe('deleteByElection', () => {
        it('should delete all candidates for an election', async () => {
            Candidate.deleteMany.mockResolvedValue({ deletedCount: 5 });

            const result = await repository.deleteByElection('election-id');

            expect(Candidate.deleteMany).toHaveBeenCalledWith({ election: 'election-id' }, expect.any(Object));
            expect(result.deletedCount).toBe(5);
        });
    });
});
