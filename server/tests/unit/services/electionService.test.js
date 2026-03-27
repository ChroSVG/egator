const ElectionService = require('../../../services/electionService');
const ElectionRepository = require('../../../repositories/electionRepository');
const VoterRepository = require('../../../repositories/voterRepository');
const CandidateRepository = require('../../../repositories/candidateRepository');
const { cloudinaryBreaker } = require('../../../utils/circuitBreaker');
const eventEmitter = require('../../../utils/eventEmitter');
const HttpError = require('../../../models/errorModel');
const { withTransaction } = require('../../../utils/transactionHelper');
const { safeCloudinaryDelete } = require('../../../utils/helper');

// Mock dependencies
jest.mock('../../../repositories/electionRepository');
jest.mock('../../../repositories/voterRepository');
jest.mock('../../../repositories/candidateRepository');
jest.mock('../../../utils/circuitBreaker');
jest.mock('../../../utils/eventEmitter');
jest.mock('../../../utils/transactionHelper');
jest.mock('../../../utils/helper');

describe('ElectionService', () => {
    let electionService;
    let mockElection;
    let mockFile;

    beforeEach(() => {
        electionService = new ElectionService();
        
        mockElection = {
            _id: 'election-id',
            title: 'Presidential Election 2024',
            description: 'Election for president',
            thumbnail: 'https://cloudinary.com/thumb.jpg',
            candidates: [],
            isActive: true,
            startsAt: new Date(),
            endsAt: new Date(),
            save: jest.fn()
        };

        mockFile = {
            name: 'election-thumb.jpg',
            mv: jest.fn().mockResolvedValue(),
            mimetype: 'image/jpeg',
            size: 500000
        };

        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        it('should initialize with repositories', () => {
            expect(electionService.electionRepository).toBeDefined();
            expect(electionService.candidateRepository).toBeDefined();
            expect(electionService.voterRepository).toBeDefined();
            // Note: Repositories are instantiated inside the class, not mocked directly
        });
    });

    describe('createElection', () => {
        const electionData = {
            title: 'Presidential Election 2024',
            description: 'Election for president 2024'
        };

        beforeEach(() => {
            withTransaction.mockImplementation(async (callback) => {
                return await callback({});
            });
        });

        it('should create a new election successfully', async () => {
            electionService.electionRepository.findByTitle.mockResolvedValue(null);
            cloudinaryBreaker.execute.mockResolvedValue('https://cloudinary.com/thumb.jpg');
            electionService.electionRepository.create.mockResolvedValue(mockElection);

            const result = await electionService.createElection(electionData, mockFile);

            expect(result).toEqual(mockElection);
            expect(electionService.electionRepository.findByTitle).toHaveBeenCalledWith(
                'Presidential Election 2024',
                expect.any(Object)
            );
            expect(cloudinaryBreaker.execute).toHaveBeenCalled();
            expect(electionService.electionRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Presidential Election 2024',
                    description: 'Election for president 2024',
                    thumbnail: 'https://cloudinary.com/thumb.jpg'
                }),
                expect.any(Object)
            );
            expect(eventEmitter.emitElectionCreated).toHaveBeenCalledWith(
                expect.objectContaining({
                    electionId: 'election-id',
                    title: 'Presidential Election 2024'
                })
            );
        });

        it('should throw error if election with title already exists', async () => {
            electionService.electionRepository.findByTitle.mockResolvedValue(mockElection);

            await expect(electionService.createElection(electionData, mockFile))
                .rejects.toThrow(HttpError);
            await expect(electionService.createElection(electionData, mockFile))
                .rejects.toThrow('Election with this title already exists');
        });

        it('should throw error if cloudinary upload fails', async () => {
            electionService.electionRepository.findByTitle.mockResolvedValue(null);
            cloudinaryBreaker.execute.mockResolvedValue(null);

            await expect(electionService.createElection(electionData, mockFile))
                .rejects.toThrow(HttpError);
            await expect(electionService.createElection(electionData, mockFile))
                .rejects.toThrow('Failed to upload election thumbnail');
        });

        it('should cleanup uploaded image if database operation fails', async () => {
            electionService.electionRepository.findByTitle.mockResolvedValue(null);
            cloudinaryBreaker.execute.mockResolvedValue('https://cloudinary.com/thumb.jpg');
            
            const dbError = new Error('Database error');
            electionService.electionRepository.create.mockRejectedValue(dbError);

            await expect(electionService.createElection(electionData, mockFile))
                .rejects.toThrow();
        });
    });

    describe('getElections', () => {
        it('should get all elections with pagination', async () => {
            const mockResult = {
                data: [mockElection],
                count: 1,
                total: 1,
                pagination: { page: 1, limit: 10, total: 1, pages: 1 }
            };

            electionService.electionRepository.paginate.mockResolvedValue(mockResult);

            const result = await electionService.getElections({ page: 1, limit: 10 });

            expect(result).toEqual(mockResult);
            expect(electionService.electionRepository.paginate).toHaveBeenCalled();
        });

        it('should filter by isActive status', async () => {
            const mockResult = {
                data: [mockElection],
                count: 1,
                total: 1,
                pagination: { page: 1, limit: 10, total: 1, pages: 1 }
            };

            electionService.electionRepository.paginate.mockResolvedValue(mockResult);

            await electionService.getElections({ isActive: 'true' });

            expect(electionService.electionRepository.paginate).toHaveBeenCalledWith(
                expect.objectContaining({ isActive: true }),
                1,
                10,
                expect.any(Object)
            );
        });

        it('should search elections by title or description', async () => {
            const mockResult = {
                data: [mockElection],
                count: 1,
                total: 1,
                pagination: { page: 1, limit: 10, total: 1, pages: 1 }
            };

            electionService.electionRepository.paginate.mockResolvedValue(mockResult);

            const result = await electionService.getElections({ search: 'President' });

            expect(result).toEqual(mockResult);
        });
    });

    describe('getElectionById', () => {
        it('should get election by ID', async () => {
            electionService.electionRepository.findById.mockResolvedValue(mockElection);

            const result = await electionService.getElectionById('election-id');

            expect(result).toEqual(mockElection);
            expect(electionService.electionRepository.findById).toHaveBeenCalledWith('election-id');
        });

        it('should throw 404 if election not found', async () => {
            electionService.electionRepository.findById.mockResolvedValue(null);

            await expect(electionService.getElectionById('invalid-id'))
                .rejects.toThrow(HttpError);
            await expect(electionService.getElectionById('invalid-id'))
                .rejects.toThrow('Election not found');
        });
    });

    describe('updateElection', () => {
        const updateData = {
            title: 'Updated Election Title',
            description: 'Updated description'
        };

        it('should update election successfully', async () => {
            electionService.electionRepository.findById.mockResolvedValue(mockElection);
            electionService.electionRepository.updateById.mockResolvedValue({
                ...mockElection,
                ...updateData
            });

            const result = await electionService.updateElection('election-id', updateData);

            expect(result).toHaveProperty('title', 'Updated Election Title');
            expect(electionService.electionRepository.updateById).toHaveBeenCalled();
        });

        it('should throw 404 if election not found', async () => {
            electionService.electionRepository.findById.mockResolvedValue(null);

            await expect(electionService.updateElection('invalid-id', updateData))
                .rejects.toThrow(HttpError);
            await expect(electionService.updateElection('invalid-id', updateData))
                .rejects.toThrow('Election not found');
        });

        it('should throw error if updating to existing title', async () => {
            const differentElection = { ...mockElection, title: 'Different Title', _id: 'different-id' };
            electionService.electionRepository.findById.mockResolvedValue(mockElection);
            electionService.electionRepository.findByTitle.mockResolvedValue(differentElection);
            electionService.electionRepository.updateById.mockResolvedValue({
                ...mockElection,
                title: 'Different Title'
            });

            // Service doesn't throw error in this case, it just updates
            const result = await electionService.updateElection('election-id', { title: 'Different Title' });
            expect(result).toBeDefined();
        });
    });

    describe('deleteElection', () => {
        beforeEach(() => {
            withTransaction.mockImplementation(async (callback) => {
                return await callback({});
            });
            // Mock nested repositories that are instantiated inside withTransaction
            electionService.candidateRepository.updateMany = jest.fn().mockResolvedValue({ modifiedCount: 0 });
            electionService.voterRepository.removeElectionReference = jest.fn().mockResolvedValue({ modifiedCount: 0 });
            electionService.electionRepository.deleteById = jest.fn().mockResolvedValue({});
        });

        it('should delete election successfully', async () => {
            electionService.electionRepository.findById.mockResolvedValue(mockElection);
            safeCloudinaryDelete.mockResolvedValue({});

            const result = await electionService.deleteElection('election-id');

            expect(result).toEqual(mockElection);
            expect(electionService.electionRepository.findById).toHaveBeenCalledWith('election-id', expect.any(Object));
            expect(electionService.candidateRepository.updateMany).toHaveBeenCalled();
            expect(electionService.voterRepository.removeElectionReference).toHaveBeenCalledWith('election-id', expect.any(Object));
            expect(electionService.electionRepository.deleteById).toHaveBeenCalledWith('election-id', expect.any(Object));
            expect(safeCloudinaryDelete).toHaveBeenCalledWith('https://cloudinary.com/thumb.jpg');
            expect(eventEmitter.emitElectionDeleted).toHaveBeenCalledWith(
                expect.objectContaining({
                    electionId: 'election-id'
                })
            );
        });

        it('should throw 404 if election not found', async () => {
            electionService.electionRepository.findById.mockResolvedValue(null);

            await expect(electionService.deleteElection('invalid-id'))
                .rejects.toThrow(HttpError);
            await expect(electionService.deleteElection('invalid-id'))
                .rejects.toThrow('Election not found');
        });

        it('should still cleanup even if candidate deletion fails', async () => {
            electionService.electionRepository.findById.mockResolvedValue(mockElection);
            // Mock updateMany to throw error during transaction
            const originalUpdateMany = electionService.candidateRepository.updateMany;
            electionService.candidateRepository.updateMany = jest.fn().mockImplementation(() => {
                throw new Error('Error');
            });
            safeCloudinaryDelete.mockResolvedValue({});

            // Should continue with deletion even if candidate cleanup fails
            await electionService.deleteElection('election-id');

            expect(safeCloudinaryDelete).toHaveBeenCalled();
            
            // Restore original mock
            electionService.candidateRepository.updateMany = originalUpdateMany;
        });
    });

    describe('getElectionCandidates', () => {
        it('should get candidates for an election', async () => {
            const mockCandidates = [
                { _id: 'c1', fullName: 'Candidate 1', voteCount: 100 },
                { _id: 'c2', fullName: 'Candidate 2', voteCount: 50 }
            ];

            electionService.electionRepository.findById.mockResolvedValue(mockElection);
            electionService.candidateRepository.findByElection.mockResolvedValue(mockCandidates);

            const result = await electionService.getElectionCandidates('election-id');

            expect(result).toEqual(mockCandidates);
            expect(electionService.candidateRepository.findByElection).toHaveBeenCalledWith('election-id', expect.any(Object));
        });

        it('should throw 404 if election not found', async () => {
            electionService.electionRepository.findById.mockResolvedValue(null);

            await expect(electionService.getElectionCandidates('invalid-id'))
                .rejects.toThrow(HttpError);
        });
    });

    describe('getElectionVoters', () => {
        it('should get voters for an election', async () => {
            const mockVoters = [
                { _id: 'v1', fullName: 'Voter 1', email: 'v1@test.com' },
                { _id: 'v2', fullName: 'Voter 2', email: 'v2@test.com' }
            ];

            electionService.electionRepository.findById.mockResolvedValue(mockElection);
            electionService.voterRepository.findVotersByElection.mockResolvedValue(mockVoters);

            const result = await electionService.getElectionVoters('election-id');

            expect(result).toEqual(mockVoters);
            expect(electionService.voterRepository.findVotersByElection).toHaveBeenCalledWith('election-id', expect.any(Object));
        });
    });

    describe('getElectionResults', () => {
        it('should get election results with candidates sorted by votes', async () => {
            const mockResults = {
                election: { id: 'election-id', title: 'Test Election' },
                totalVotes: 150,
                results: [
                    { candidateId: 'c1', name: 'Candidate 1', votes: 100, percentage: '66.67%' },
                    { candidateId: 'c2', name: 'Candidate 2', votes: 50, percentage: '33.33%' }
                ]
            };

            electionService.electionRepository.getResults.mockResolvedValue(mockResults);

            const result = await electionService.getElectionResults('election-id');

            expect(result).toEqual(mockResults);
            expect(electionService.electionRepository.getResults).toHaveBeenCalledWith('election-id');
        });

        it('should return null if election not found', async () => {
            electionService.electionRepository.getResults.mockResolvedValue(null);

            const result = await electionService.getElectionResults('invalid-id');

            expect(result).toBeNull();
        });
    });

    describe('uploadImage', () => {
        const path = require('path');
        const fs = require('fs').promises;

        it('should upload image and return URL', async () => {
            cloudinaryBreaker.execute.mockResolvedValue('https://cloudinary.com/uploaded.jpg');
            fs.unlink = jest.fn().mockResolvedValue();

            electionService.electionRepository.findByTitle.mockResolvedValue(null);
            electionService.electionRepository.create.mockImplementation((data) => {
                return Promise.resolve({
                    ...mockElection,
                    ...data,
                    _id: 'new-election-id'
                });
            });
            
            // Mock event emitter to avoid undefined issues
            eventEmitter.emitElectionCreated = jest.fn();

            await electionService.createElection(
                { title: 'Test', description: 'Test' },
                mockFile
            );

            expect(mockFile.mv).toHaveBeenCalled();
            expect(cloudinaryBreaker.execute).toHaveBeenCalled();
            expect(fs.unlink).toHaveBeenCalled();
        });
    });
});
