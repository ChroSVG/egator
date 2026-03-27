const CandidateService = require('../../../services/candidateService');
const CandidateRepository = require('../../../repositories/candidateRepository');
const ElectionRepository = require('../../../repositories/electionRepository');
const { cloudinaryBreaker } = require('../../../utils/circuitBreaker');
const eventEmitter = require('../../../utils/eventEmitter');
const HttpError = require('../../../models/errorModel');
const { withTransaction } = require('../../../utils/transactionHelper');
const { safeCloudinaryDelete } = require('../../../utils/helper');

// Mock dependencies
jest.mock('../../../repositories/candidateRepository');
jest.mock('../../../repositories/electionRepository');
jest.mock('../../../utils/circuitBreaker');
jest.mock('../../../utils/eventEmitter');
jest.mock('../../../utils/transactionHelper');
jest.mock('../../../utils/helper');

describe('CandidateService', () => {
    let candidateService;
    let mockCandidate;
    let mockElection;
    let mockFile;

    beforeEach(() => {
        candidateService = new CandidateService();
        
        mockCandidate = {
            _id: 'candidate-id',
            fullName: 'John Doe',
            motto: 'Vote for change',
            image: 'https://cloudinary.com/image.jpg',
            elections: ['election-id'],
            voteCount: 0,
            save: jest.fn()
        };

        mockElection = {
            _id: 'election-id',
            title: 'Test Election',
            description: 'Test Description',
            thumbnail: 'https://cloudinary.com/thumb.jpg',
            candidates: [],
            isActive: true
        };

        mockFile = {
            name: 'test-image.jpg',
            mv: jest.fn().mockResolvedValue(),
            mimetype: 'image/jpeg',
            size: 500000
        };

        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        it('should initialize with repositories', () => {
            expect(candidateService.candidateRepository).toBeDefined();
            expect(candidateService.electionRepository).toBeDefined();
            expect(CandidateRepository).toHaveBeenCalled();
            expect(ElectionRepository).toHaveBeenCalled();
        });
    });

    describe('createCandidate', () => {
        const candidateData = {
            fullName: 'John Doe',
            motto: 'Vote for change',
            election: 'election-id'
        };

        beforeEach(() => {
            // Mock withTransaction to execute the callback immediately
            withTransaction.mockImplementation(async (callback) => {
                return await callback({});
            });
        });

        it('should create a new candidate successfully', async () => {
            // Mock election exists
            candidateService.electionRepository.findById.mockResolvedValue(mockElection);
            
            // Mock no existing candidate with same name
            candidateService.candidateRepository.findOne.mockResolvedValue(null);
            
            // Mock cloudinary upload
            cloudinaryBreaker.execute.mockResolvedValue('https://cloudinary.com/image.jpg');
            
            // Mock candidate creation
            candidateService.candidateRepository.create.mockResolvedValue(mockCandidate);
            
            // Mock add candidate to election
            candidateService.electionRepository.addCandidate.mockResolvedValue({});

            const result = await candidateService.createCandidate(candidateData, mockFile);

            expect(result).toEqual(mockCandidate);
            expect(candidateService.electionRepository.findById).toHaveBeenCalledWith(
                'election-id',
                expect.any(Object)
            );
            expect(candidateService.candidateRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    fullName: 'John Doe',
                    motto: 'Vote for change',
                    image: 'https://cloudinary.com/image.jpg',
                    elections: ['election-id']
                }),
                expect.any(Object)
            );
            expect(candidateService.electionRepository.addCandidate).toHaveBeenCalledWith(
                'election-id',
                'candidate-id',
                expect.any(Object)
            );
            expect(eventEmitter.emitCandidateCreated).toHaveBeenCalledWith(
                expect.objectContaining({
                    candidateId: 'candidate-id',
                    electionId: 'election-id'
                })
            );
        });

        it('should link existing candidate to new election', async () => {
            const existingCandidate = {
                _id: 'existing-candidate-id',
                fullName: 'John Doe',
                motto: 'Vote for change',
                elections: ['old-election-id']
            };

            candidateService.electionRepository.findById.mockResolvedValue(mockElection);
            candidateService.candidateRepository.findOne.mockResolvedValue(existingCandidate);
            candidateService.candidateRepository.updateById.mockResolvedValue({
                ...existingCandidate,
                elections: ['old-election-id', 'election-id']
            });
            candidateService.electionRepository.addCandidate.mockResolvedValue({});

            const result = await candidateService.createCandidate(candidateData, mockFile);

            // Should not upload image for existing candidate
            expect(cloudinaryBreaker.execute).not.toHaveBeenCalled();
            expect(candidateService.candidateRepository.updateById).toHaveBeenCalledWith(
                'existing-candidate-id',
                { $addToSet: { elections: 'election-id' } },
                expect.any(Object)
            );
            expect(candidateService.electionRepository.addCandidate).toHaveBeenCalledWith(
                'election-id',
                'existing-candidate-id',
                expect.any(Object)
            );
        });

        it('should throw error if election not found', async () => {
            candidateService.electionRepository.findById.mockResolvedValue(null);

            await expect(candidateService.createCandidate(candidateData, mockFile))
                .rejects.toThrow(HttpError);
            await expect(candidateService.createCandidate(candidateData, mockFile))
                .rejects.toThrow('Election not found');
        });

        it('should throw error if cloudinary upload fails', async () => {
            candidateService.electionRepository.findById.mockResolvedValue(mockElection);
            candidateService.candidateRepository.findOne.mockResolvedValue(null);
            cloudinaryBreaker.execute.mockResolvedValue(null);

            await expect(candidateService.createCandidate(candidateData, mockFile))
                .rejects.toThrow(HttpError);
            await expect(candidateService.createCandidate(candidateData, mockFile))
                .rejects.toThrow('Failed to upload candidate image');
        });

        it('should cleanup uploaded image if database operation fails', async () => {
            candidateService.electionRepository.findById.mockResolvedValue(mockElection);
            candidateService.candidateRepository.findOne.mockResolvedValue(null);
            cloudinaryBreaker.execute.mockResolvedValue('https://cloudinary.com/image.jpg');
            
            const dbError = new Error('Database error');
            candidateService.candidateRepository.create.mockRejectedValue(dbError);

            await expect(candidateService.createCandidate(candidateData, mockFile))
                .rejects.toThrow('Database error');

            // Should cleanup uploaded image
            expect(safeCloudinaryDelete).toHaveBeenCalled();
        });
    });

    describe('getCandidates', () => {
        it('should get candidates with filters', async () => {
            const mockResult = {
                data: [mockCandidate],
                count: 1,
                total: 1,
                pagination: { page: 1, limit: 10, total: 1, pages: 1 }
            };

            candidateService.candidateRepository.paginate.mockResolvedValue(mockResult);

            const result = await candidateService.getCandidates({
                election: 'election-id',
                page: 1,
                limit: 10
            });

            expect(result).toEqual(mockResult);
            expect(candidateService.candidateRepository.paginate).toHaveBeenCalled();
        });

        it('should search candidates by name', async () => {
            const mockCandidates = [mockCandidate];
            candidateService.candidateRepository.searchByName.mockResolvedValue(mockCandidates);

            const result = await candidateService.getCandidates({ search: 'John' });

            expect(result.data).toEqual(mockCandidates);
            expect(result.count).toBe(1);
            expect(result.total).toBe(1);
            expect(candidateService.candidateRepository.searchByName).toHaveBeenCalledWith('John');
        });

        it('should sort by votes when sort=votes', async () => {
            const mockResult = {
                data: [mockCandidate],
                count: 1,
                total: 1,
                pagination: { page: 1, limit: 10, total: 1, pages: 1 }
            };

            candidateService.candidateRepository.paginate.mockResolvedValue(mockResult);

            await candidateService.getCandidates({ sort: 'votes' });

            expect(candidateService.candidateRepository.paginate).toHaveBeenCalledWith(
                expect.anything(),
                expect.anything(),
                expect.anything(),
                expect.objectContaining({
                    populate: expect.anything(),
                    sort: { voteCount: -1 }
                })
            );
        });
    });

    describe('getCandidateById', () => {
        it('should get candidate by ID', async () => {
            candidateService.candidateRepository.findByIdWithElection.mockResolvedValue(mockCandidate);

            const result = await candidateService.getCandidateById('candidate-id');

            expect(result).toEqual(mockCandidate);
            expect(candidateService.candidateRepository.findByIdWithElection)
                .toHaveBeenCalledWith('candidate-id');
        });

        it('should throw 404 if candidate not found', async () => {
            candidateService.candidateRepository.findByIdWithElection.mockResolvedValue(null);

            await expect(candidateService.getCandidateById('invalid-id'))
                .rejects.toThrow(HttpError);
            await expect(candidateService.getCandidateById('invalid-id'))
                .rejects.toThrow('Candidate not found');
        });
    });

    describe('getCandidatesByElection', () => {
        it('should get candidates by election ID', async () => {
            const mockCandidates = [mockCandidate];
            candidateService.candidateRepository.findByElection.mockResolvedValue(mockCandidates);

            const result = await candidateService.getCandidatesByElection('election-id');

            expect(result).toEqual(mockCandidates);
            expect(candidateService.candidateRepository.findByElection)
                .toHaveBeenCalledWith('election-id', expect.any(Object));
        });
    });

    describe('deleteCandidate', () => {
        it('should delete candidate successfully', async () => {
            candidateService.candidateRepository.findById.mockResolvedValue(mockCandidate);
            candidateService.electionRepository.removeCandidate.mockResolvedValue({});
            candidateService.candidateRepository.deleteById.mockResolvedValue({});
            safeCloudinaryDelete.mockResolvedValue({});

            const result = await candidateService.deleteCandidate('candidate-id');

            expect(result).toEqual(mockCandidate);
            expect(candidateService.candidateRepository.findById).toHaveBeenCalledWith(
                'candidate-id',
                expect.any(Object)
            );
            // Since elections is now an array, we check the first election
            expect(candidateService.electionRepository.removeCandidate).toHaveBeenCalledWith(
                mockCandidate.elections[0],
                'candidate-id',
                expect.any(Object)
            );
            expect(candidateService.candidateRepository.deleteById).toHaveBeenCalledWith(
                'candidate-id',
                expect.any(Object)
            );
            expect(safeCloudinaryDelete).toHaveBeenCalledWith(mockCandidate.image);
            expect(eventEmitter.emitCandidateDeleted).toHaveBeenCalledWith(
                expect.objectContaining({
                    candidateId: 'candidate-id',
                    name: 'John Doe'
                })
            );
        });

        it('should throw 404 if candidate not found', async () => {
            candidateService.candidateRepository.findById.mockResolvedValue(null);

            await expect(candidateService.deleteCandidate('invalid-id'))
                .rejects.toThrow(HttpError);
            await expect(candidateService.deleteCandidate('invalid-id'))
                .rejects.toThrow('Candidate not found');
        });

        it('should still emit event even if cloudinary delete fails', async () => {
            candidateService.candidateRepository.findById.mockResolvedValue(mockCandidate);
            candidateService.electionRepository.removeCandidate.mockResolvedValue({});
            candidateService.candidateRepository.deleteById.mockResolvedValue({});
            safeCloudinaryDelete.mockRejectedValue(new Error('Cloudinary error'));

            // Should still complete deletion even if cloudinary fails
            await candidateService.deleteCandidate('candidate-id');

            expect(eventEmitter.emitCandidateDeleted).toHaveBeenCalled();
        });
    });

    describe('uploadImage', () => {
        const path = require('path');
        const fs = require('fs').promises;

        it('should upload image to cloudinary', async () => {
            const mockImageUrl = 'https://cloudinary.com/uploaded-image.jpg';
            
            // Mock fs.unlink for cleanup
            fs.unlink = jest.fn().mockResolvedValue();

            // We need to test this through createCandidate since uploadImage is private
            candidateService.electionRepository.findById.mockResolvedValue(mockElection);
            candidateService.candidateRepository.findOne.mockResolvedValue(null);
            cloudinaryBreaker.execute.mockResolvedValue(mockImageUrl);
            candidateService.candidateRepository.create.mockResolvedValue(mockCandidate);
            candidateService.electionRepository.addCandidate.mockResolvedValue({});

            await candidateService.createCandidate(
                { fullName: 'Test', motto: 'Test', election: 'election-id' },
                mockFile
            );

            expect(mockFile.mv).toHaveBeenCalled();
            expect(cloudinaryBreaker.execute).toHaveBeenCalled();
        });

        it('should cleanup local file after upload', async () => {
            cloudinaryBreaker.execute.mockResolvedValue('https://cloudinary.com/image.jpg');
            fs.unlink = jest.fn().mockResolvedValue();

            candidateService.electionRepository.findById.mockResolvedValue(mockElection);
            candidateService.candidateRepository.findOne.mockResolvedValue(null);
            candidateService.candidateRepository.create.mockResolvedValue(mockCandidate);
            candidateService.electionRepository.addCandidate.mockResolvedValue({});

            await candidateService.createCandidate(
                { fullName: 'Test', motto: 'Test', election: 'election-id' },
                mockFile
            );

            expect(fs.unlink).toHaveBeenCalled();
        });
    });
});
