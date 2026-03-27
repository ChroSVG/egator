const VoteRecordRepository = require('../../../repositories/voteRecordRepository');
const VoteRecord = require('../../../models/voteRecordModel');

// Mock the model
jest.mock('../../../models/voteRecordModel');

describe('VoteRecordRepository', () => {
    let repository;
    let mockVoteRecord;

    beforeEach(() => {
        repository = new VoteRecordRepository();
        mockVoteRecord = {
            _id: 'vote-record-id',
            voter: 'voter-id',
            election: 'election-id',
            candidate: 'candidate-id',
            votedAt: new Date(),
            version: 0,
            save: jest.fn()
        };
        jest.clearAllMocks();
    });

    describe('findByVoterAndElection', () => {
        it('should find vote record by voter and election', async () => {
            VoteRecord.findOne.mockResolvedValue(mockVoteRecord);

            const result = await repository.findByVoterAndElection('voter-id', 'election-id');

            expect(VoteRecord.findOne).toHaveBeenCalledWith({
                voter: 'voter-id',
                election: 'election-id'
            });
            expect(result).toEqual(mockVoteRecord);
        });

        it('should return null if vote record not found', async () => {
            VoteRecord.findOne.mockResolvedValue(null);

            const result = await repository.findByVoterAndElection('voter-id', 'election-id');

            expect(result).toBeNull();
        });
    });

    describe('hasVoted', () => {
        it('should return true if voter has voted in election', async () => {
            VoteRecord.findOne.mockResolvedValue(mockVoteRecord);

            const result = await repository.hasVoted('voter-id', 'election-id');

            expect(result).toBe(true);
        });

        it('should return false if voter has not voted', async () => {
            VoteRecord.findOne.mockResolvedValue(null);

            const result = await repository.hasVoted('voter-id', 'election-id');

            expect(result).toBe(false);
        });
    });

    describe('createVoteRecord', () => {
        it('should create a new vote record', async () => {
            const voteData = {
                voter: 'voter-id',
                election: 'election-id',
                candidate: 'candidate-id'
            };

            VoteRecord.mockImplementation(() => mockVoteRecord);
            mockVoteRecord.save.mockResolvedValue(mockVoteRecord);

            const result = await repository.create(voteData);

            expect(VoteRecord).toHaveBeenCalledWith(voteData);
            expect(mockVoteRecord.save).toHaveBeenCalled();
            expect(result).toEqual(mockVoteRecord);
        });
    });

    describe('deleteVote', () => {
        it('should delete vote record by voter and election', async () => {
            VoteRecord.findOneAndDelete.mockResolvedValue(mockVoteRecord);

            const result = await repository.deleteVote('voter-id', 'election-id');

            expect(VoteRecord.findOneAndDelete).toHaveBeenCalledWith({
                voter: 'voter-id',
                election: 'election-id'
            });
            expect(result).toEqual(mockVoteRecord);
        });

        it('should return null if vote record not found', async () => {
            VoteRecord.findOneAndDelete.mockResolvedValue(null);

            const result = await repository.deleteVote('voter-id', 'election-id');

            expect(result).toBeNull();
        });
    });

    describe('findByElection', () => {
        it('should find all vote records for an election', async () => {
            const mockVoteRecords = [mockVoteRecord];
            VoteRecord.find.mockResolvedValue(mockVoteRecords);

            const result = await repository.findByElection('election-id');

            expect(VoteRecord.find).toHaveBeenCalledWith({ election: 'election-id' });
            expect(result).toEqual(mockVoteRecords);
        });

        it('should return empty array if no votes found', async () => {
            VoteRecord.find.mockResolvedValue([]);

            const result = await repository.findByElection('election-id');

            expect(result).toEqual([]);
        });
    });

    describe('findByVoter', () => {
        it('should find all vote records for a voter', async () => {
            const mockVoteRecords = [mockVoteRecord];
            VoteRecord.find.mockResolvedValue(mockVoteRecords);

            const result = await repository.findByVoter('voter-id');

            expect(VoteRecord.find).toHaveBeenCalledWith({ voter: 'voter-id' });
            expect(result).toEqual(mockVoteRecords);
        });
    });

    describe('countByElection', () => {
        it('should count total votes for an election', async () => {
            VoteRecord.countDocuments.mockResolvedValue(150);

            const result = await repository.countByElection('election-id');

            expect(VoteRecord.countDocuments).toHaveBeenCalledWith({
                election: 'election-id'
            });
            expect(result).toBe(150);
        });

        it('should return 0 if no votes found', async () => {
            VoteRecord.countDocuments.mockResolvedValue(0);

            const result = await repository.countByElection('election-id');

            expect(result).toBe(0);
        });
    });

    describe('getVoteStatistics', () => {
        it('should return vote statistics for an election', async () => {
            const mockVotes = [
                { voter: 'v1', candidate: 'c1' },
                { voter: 'v2', candidate: 'c1' },
                { voter: 'v3', candidate: 'c2' }
            ];
            VoteRecord.find.mockResolvedValue(mockVotes);
            VoteRecord.countDocuments.mockResolvedValue(3);

            const result = await repository.getVoteStatistics('election-id');

            expect(result).toHaveProperty('totalVotes', 3);
            expect(result).toHaveProperty('votesByCandidate');
        });

        it('should handle empty election', async () => {
            VoteRecord.find.mockResolvedValue([]);
            VoteRecord.countDocuments.mockResolvedValue(0);

            const result = await repository.getVoteStatistics('election-id');

            expect(result.totalVotes).toBe(0);
        });
    });

    describe('bulkCreate', () => {
        it('should create multiple vote records', async () => {
            const voteRecords = [
                { voter: 'v1', election: 'e1', candidate: 'c1' },
                { voter: 'v2', election: 'e1', candidate: 'c2' }
            ];

            VoteRecord.bulkWrite.mockResolvedValue({ insertedCount: 2 });

            const result = await repository.bulkCreate(voteRecords);

            expect(VoteRecord.bulkWrite).toHaveBeenCalled();
            expect(result.insertedCount).toBe(2);
        });
    });

    describe('deleteByElection', () => {
        it('should delete all vote records for an election', async () => {
            VoteRecord.deleteMany.mockResolvedValue({ deletedCount: 50 });

            const result = await repository.deleteByElection('election-id');

            expect(VoteRecord.deleteMany).toHaveBeenCalledWith({
                election: 'election-id'
            });
            expect(result.deletedCount).toBe(50);
        });
    });

    describe('deleteByVoter', () => {
        it('should delete all vote records for a voter', async () => {
            VoteRecord.deleteMany.mockResolvedValue({ deletedCount: 5 });

            const result = await repository.deleteByVoter('voter-id');

            expect(VoteRecord.deleteMany).toHaveBeenCalledWith({
                voter: 'voter-id'
            });
            expect(result.deletedCount).toBe(5);
        });
    });

    describe('getVotersByElection', () => {
        it('should get all voters who voted in an election', async () => {
            const mockVotes = [
                { voter: 'v1', election: 'e1', candidate: 'c1' },
                { voter: 'v2', election: 'e1', candidate: 'c2' }
            ];
            VoteRecord.find.mockResolvedValue(mockVotes);

            const result = await repository.getVotersByElection('election-id');

            expect(VoteRecord.find).toHaveBeenCalledWith(
                { election: 'election-id' },
                { voter: 1, _id: 0 }
            );
            expect(result).toEqual(['v1', 'v2']);
        });

        it('should return empty array if no voters found', async () => {
            VoteRecord.find.mockResolvedValue([]);

            const result = await repository.getVotersByElection('election-id');

            expect(result).toEqual([]);
        });
    });
});
