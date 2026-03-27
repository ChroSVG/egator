const ElectionRepository = require('../../../repositories/electionRepository');
const Election = require('../../../models/electionModel');

// Mock the model
jest.mock('../../../models/electionModel');

describe('ElectionRepository', () => {
    let repository;
    let mockElection;

    beforeEach(() => {
        repository = new ElectionRepository();
        mockElection = {
            _id: 'test-id',
            title: 'Test Election',
            description: 'Test Description',
            thumbnail: 'https://test.com/image.jpg',
            candidates: [],
            isActive: true,
            startsAt: new Date(),
            endsAt: new Date(),
            version: 0,
            save: jest.fn()
        };
        jest.clearAllMocks();
    });

    describe('findByTitle', () => {
        it('should find election by title', async () => {
            Election.findOne.mockResolvedValue(mockElection);

            const result = await repository.findByTitle('Test Election');

            expect(Election.findOne).toHaveBeenCalledWith({ title: 'Test Election' });
            expect(result).toEqual(mockElection);
        });

        it('should return null if election not found', async () => {
            Election.findOne.mockResolvedValue(null);

            const result = await repository.findByTitle('Non-existent');

            expect(result).toBeNull();
        });
    });

    describe('paginate', () => {
        it('should paginate elections without filters', async () => {
            const mockElections = [mockElection];
            Election.find.mockReturnValue({
                sort: jest.fn().mockReturnValue({
                    skip: jest.fn().mockReturnValue({
                        limit: jest.fn().mockResolvedValue(mockElections)
                    })
                })
            });
            Election.countDocuments.mockResolvedValue(1);

            const result = await repository.paginate({});

            expect(result.data).toEqual(mockElections);
            expect(result.pagination).toBeDefined();
        });

        it('should search elections by title or description', async () => {
            Election.find.mockReturnValue({
                sort: jest.fn().mockReturnValue({
                    skip: jest.fn().mockReturnValue({
                        limit: jest.fn().mockResolvedValue([mockElection])
                    })
                })
            });
            Election.countDocuments.mockResolvedValue(1);

            await repository.paginate({ search: 'Test' });

            expect(Election.find).toHaveBeenCalledWith(
                expect.objectContaining({
                    $or: expect.any(Array)
                })
            );
        });
    });

    describe('findByIdWithCandidates', () => {
        it('should find election with populated candidates', async () => {
            Election.findById.mockReturnValue({
                populate: jest.fn().mockResolvedValue(mockElection)
            });

            const result = await repository.findByIdWithCandidates('election-id');

            expect(Election.findById).toHaveBeenCalledWith('election-id');
            expect(result).toEqual(mockElection);
        });

        it('should return null if election not found', async () => {
            Election.findById.mockReturnValue({
                populate: jest.fn().mockResolvedValue(null)
            });

            const result = await repository.findByIdWithCandidates('invalid-id');

            expect(result).toBeNull();
        });
    });

    describe('getActiveElections', () => {
        it('should return all active elections', async () => {
            const mockElections = [mockElection];
            Election.find.mockResolvedValue(mockElections);

            const result = await repository.getActiveElections();

            expect(Election.find).toHaveBeenCalledWith({ isActive: true });
            expect(result).toEqual(mockElections);
        });

        it('should return empty array if no active elections', async () => {
            Election.find.mockResolvedValue([]);

            const result = await repository.getActiveElections();

            expect(result).toEqual([]);
        });
    });

    describe('search', () => {
        it('should search elections by term', async () => {
            const mockElections = [mockElection];
            Election.find.mockResolvedValue(mockElections);

            const result = await repository.search('Test');

            expect(Election.find).toHaveBeenCalledWith({
                $or: [
                    { title: { $regex: 'Test', $options: 'i' } },
                    { description: { $regex: 'Test', $options: 'i' } }
                ]
            });
            expect(result).toEqual(mockElections);
        });
    });

    describe('addCandidate', () => {
        it('should add candidate to election using $addToSet', async () => {
            Election.findByIdAndUpdate.mockResolvedValue({
                ...mockElection,
                candidates: ['candidate-id']
            });

            const result = await repository.addCandidate('election-id', 'candidate-id');

            expect(Election.findByIdAndUpdate).toHaveBeenCalledWith(
                'election-id',
                { $addToSet: { candidates: 'candidate-id' } },
                expect.objectContaining({
                    returnDocument: 'after',
                    runValidators: false
                })
            );
        });

        it('should handle session parameter', async () => {
            const mockSession = { id: 'session-123' };
            Election.findByIdAndUpdate.mockResolvedValue(mockElection);

            await repository.addCandidate('election-id', 'candidate-id', mockSession);

            expect(Election.findByIdAndUpdate).toHaveBeenCalledWith(
                expect.anything(),
                expect.anything(),
                expect.objectContaining({ session: mockSession })
            );
        });
    });

    describe('removeCandidate', () => {
        it('should remove candidate from election using $pull', async () => {
            Election.findByIdAndUpdate.mockResolvedValue({
                ...mockElection,
                candidates: []
            });

            const result = await repository.removeCandidate('election-id', 'candidate-id');

            expect(Election.findByIdAndUpdate).toHaveBeenCalledWith(
                'election-id',
                { $pull: { candidates: 'candidate-id' } },
                expect.objectContaining({
                    returnDocument: 'after',
                    runValidators: false
                })
            );
        });
    });

    describe('findByIdWithVoterCount', () => {
        it('should return election with voter count', async () => {
            const Voter = require('../../../models/voterModel');
            Election.findById.mockResolvedValue(mockElection);
            Voter.countDocuments.mockResolvedValue(50);

            const result = await repository.findByIdWithVoterCount('election-id');

            expect(result).toHaveProperty('voterCount', 50);
            expect(result).toHaveProperty('_id', 'test-id');
        });

        it('should return null if election not found', async () => {
            Election.findById.mockResolvedValue(null);

            const result = await repository.findByIdWithVoterCount('invalid-id');

            expect(result).toBeNull();
        });
    });

    describe('getElectionsWithCandidateCount', () => {
        it('should return elections with candidate count', async () => {
            const mockElectionWithCandidates = {
                ...mockElection,
                candidates: ['c1', 'c2', 'c3'],
                toObject: jest.fn().mockReturnValue({
                    ...mockElection,
                    candidates: ['c1', 'c2', 'c3']
                })
            };
            Election.find.mockResolvedValue([mockElectionWithCandidates]);

            const result = await repository.getElectionsWithCandidateCount();

            expect(result[0]).toHaveProperty('candidateCount', 3);
        });

        it('should handle elections with no candidates', async () => {
            const mockEmptyElection = {
                ...mockElection,
                candidates: [],
                toObject: jest.fn().mockReturnValue({
                    ...mockElection,
                    candidates: []
                })
            };
            Election.find.mockResolvedValue([mockEmptyElection]);

            const result = await repository.getElectionsWithCandidateCount();

            expect(result[0]).toHaveProperty('candidateCount', 0);
        });
    });

    describe('hasCandidates', () => {
        it('should return true if election has candidates', async () => {
            const electionWithCandidates = { ...mockElection, candidates: ['c1', 'c2'] };
            Election.findById.mockResolvedValue(electionWithCandidates);

            const result = await repository.hasCandidates('election-id');

            expect(result).toBe(true);
        });

        it('should return false if election has no candidates', async () => {
            const electionWithoutCandidates = { ...mockElection, candidates: [] };
            Election.findById.mockResolvedValue(electionWithoutCandidates);

            const result = await repository.hasCandidates('election-id');

            expect(result).toBe(false);
        });

        it('should return false if election not found', async () => {
            Election.findById.mockResolvedValue(null);

            const result = await repository.hasCandidates('invalid-id');

            expect(result).toBe(false);
        });
    });

    describe('getResults', () => {
        it('should return election results with candidates sorted by votes', async () => {
            const mockCandidates = [
                { _id: 'c1', fullName: 'Candidate 1', motto: 'Motto 1', image: 'img1.jpg', voteCount: 100 },
                { _id: 'c2', fullName: 'Candidate 2', motto: 'Motto 2', image: 'img2.jpg', voteCount: 50 }
            ];
            const electionWithCandidates = {
                ...mockElection,
                candidates: mockCandidates,
                toObject: jest.fn().mockReturnValue({ _id: 'election-id', title: 'Test', description: 'Desc' })
            };

            repository.findByIdWithCandidates = jest.fn().mockResolvedValue(electionWithCandidates);

            const result = await repository.getResults('election-id');

            expect(result).toHaveProperty('election');
            expect(result).toHaveProperty('totalVotes', 150);
            expect(result.results).toHaveLength(2);
            expect(result.results[0]).toHaveProperty('votes', 100);
            expect(result.results[0]).toHaveProperty('percentage');
        });

        it('should handle zero total votes', async () => {
            const mockCandidates = [
                { _id: 'c1', fullName: 'Candidate 1', motto: 'Motto 1', image: 'img1.jpg', voteCount: 0 }
            ];
            const electionWithCandidates = {
                ...mockElection,
                candidates: mockCandidates
            };

            repository.findByIdWithCandidates = jest.fn().mockResolvedValue(electionWithCandidates);

            const result = await repository.getResults('election-id');

            expect(result.results[0]).toHaveProperty('percentage', '0%');
        });

        it('should return null if election not found', async () => {
            repository.findByIdWithCandidates = jest.fn().mockResolvedValue(null);

            const result = await repository.getResults('invalid-id');

            expect(result).toBeNull();
        });
    });
});
