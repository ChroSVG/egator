const request = require('supertest');
const app = require('../../index');
const Voter = require('../../models/voterModel');
const Election = require('../../models/electionModel');
const Candidate = require('../../models/candidateModel');
const VoteRecord = require('../../models/voteRecordModel');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

describe('Voting API Tests', () => {
    let voterToken;
    let voterId;
    let election;
    let candidate1;
    let candidate2;
    let testVoter;

    // Setup test data untuk setiap test
    beforeEach(async () => {
        // Create election
        election = new Election({
            title: `Test Election ${Date.now()}`,
            description: 'Test voting',
            thumbnail: 'https://res.cloudinary.com/test/image/upload/test.jpg'
        });
        await election.save();

        // Create candidates
        candidate1 = new Candidate({
            fullName: 'Candidate One',
            motto: 'First candidate',
            image: 'https://res.cloudinary.com/test/image/upload/candidate1.jpg',
            election: election._id,
            voteCount: 0
        });
        await candidate1.save();

        candidate2 = new Candidate({
            fullName: 'Candidate Two',
            motto: 'Second candidate',
            image: 'https://res.cloudinary.com/test/image/upload/candidate2.jpg',
            election: election._id,
            voteCount: 0
        });
        await candidate2.save();

        // Add candidates to election
        election.candidates.push(candidate1._id, candidate2._id);
        await election.save();

        // Create voter
        const hashedPassword = await bcrypt.hash('Password@123', 10);
        testVoter = new Voter({
            fullName: 'Test Voter',
            email: `voter${Date.now()}@example.com`,
            password: hashedPassword,
            isAdmin: false,
            votedElections: []
        });
        await testVoter.save();
        voterId = testVoter._id;

        // Login voter
        const loginRes = await request(app)
            .post('/api/voters/login')
            .send({ email: testVoter.email, password: 'Password@123' });

        voterToken = loginRes.body.token;
    });

    // Cleanup setelah setiap test
    afterEach(async () => {
        // Cleanup vote records
        await VoteRecord.deleteMany({ voter: voterId });
        
        // Cleanup candidates
        if (candidate1) await Candidate.findByIdAndDelete(candidate1._id);
        if (candidate2) await Candidate.findByIdAndDelete(candidate2._id);
        
        // Cleanup election
        if (election) await Election.findByIdAndDelete(election._id);
        
        // Cleanup voter
        if (testVoter) await Voter.findByIdAndDelete(testVoter._id);
    });

    describe('PATCH /api/candidates/:id/vote', () => {
        it('should require authentication', async () => {
            const res = await request(app)
                .patch(`/api/candidates/${candidate1._id}/vote`)
                .send({ selectedElectionId: election._id });

            expect(res.statusCode).toBe(401);
        });

        it('should vote successfully for valid candidate', async () => {
            const res = await request(app)
                .patch(`/api/candidates/${candidate1._id}/vote`)
                .set('Authorization', `Bearer ${voterToken}`)
                .set('X-Idempotency-Key', `vote-${Date.now()}`)
                .send({ selectedElectionId: election._id });

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('message', 'Vote registered successfully!');

            // Verify vote count increased
            const updatedCandidate = await Candidate.findById(candidate1._id);
            expect(updatedCandidate.voteCount).toBe(1);
        });

        it('should prevent double voting (same voter, same election)', async () => {
            const res = await request(app)
                .patch(`/api/candidates/${candidate2._id}/vote`)
                .set('Authorization', `Bearer ${voterToken}`)
                .set('X-Idempotency-Key', `vote-${Date.now()}`)
                .send({ selectedElectionId: election._id });

            expect(res.statusCode).toBe(409);
            expect(res.body.message).toContain('already voted');
        });

        it('should reject duplicate idempotency key', async () => {
            const idempotencyKey = `duplicate-key-${Date.now()}`;

            // First vote with key
            await request(app)
                .patch(`/api/candidates/${candidate1._id}/vote`)
                .set('Authorization', `Bearer ${voterToken}`)
                .set('X-Idempotency-Key', idempotencyKey)
                .send({ selectedElectionId: election._id });

            // Second vote with same key
            const res = await request(app)
                .patch(`/api/candidates/${candidate1._id}/vote`)
                .set('Authorization', `Bearer ${voterToken}`)
                .set('X-Idempotency-Key', idempotencyKey)
                .send({ selectedElectionId: election._id });

            expect(res.statusCode).toBe(429);
            expect(res.body.message).toContain('already completed');
        });

        it('should fail with invalid election ID', async () => {
            // Create new voter for this test
            const hashedPassword = await bcrypt.hash('Password@123', 10);
            const voter2 = new Voter({
                fullName: 'Voter Two',
                email: `voter2${Date.now()}@example.com`,
                password: hashedPassword
            });
            await voter2.save();

            const loginRes = await request(app)
                .post('/api/voters/login')
                .send({ email: voter2.email, password: 'Password@123' });
            
            const voter2Token = loginRes.body.token;

            const res = await request(app)
                .patch(`/api/candidates/${candidate1._id}/vote`)
                .set('Authorization', `Bearer ${voter2Token}`)
                .set('X-Idempotency-Key', `vote-${Date.now()}`)
                .send({ selectedElectionId: new mongoose.Types.ObjectId() });

            expect(res.statusCode).toBe(400);
        });

        it('should fail for non-existent candidate', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .patch(`/api/candidates/${fakeId}/vote`)
                .set('Authorization', `Bearer ${voterToken}`)
                .set('X-Idempotency-Key', `vote-${Date.now()}`)
                .send({ selectedElectionId: election._id });

            expect(res.statusCode).toBe(404);
        });
    });

    describe('Vote Record Creation', () => {
        it('should create vote record in database', async () => {
            // Create new voter and election for clean test
            const hashedPassword = await bcrypt.hash('Password@123', 10);
            const voter3 = new Voter({
                fullName: 'Voter Three',
                email: `voter3${Date.now()}@example.com`,
                password: hashedPassword
            });
            await voter3.save();

            const election2 = new Election({
                title: 'Election 2',
                description: 'Test',
                thumbnail: 'test.jpg'
            });
            await election2.save();

            const candidate3 = new Candidate({
                fullName: 'Candidate Three',
                motto: 'Test',
                image: 'test.jpg',
                election: election2._id
            });
            await candidate3.save();

            const loginRes = await request(app)
                .post('/api/voters/login')
                .send({ email: voter3.email, password: 'Password@123' });
            
            const voter3Token = loginRes.body.token;

            await request(app)
                .patch(`/api/candidates/${candidate3._id}/vote`)
                .set('Authorization', `Bearer ${voter3Token}`)
                .set('X-Idempotency-Key', `vote-${Date.now()}`)
                .send({ selectedElectionId: election2._id });

            // Check vote record exists
            const voteRecord = await VoteRecord.findOne({
                voter: voter3._id,
                election: election2._id
            });

            expect(voteRecord).not.toBeNull();
            expect(voteRecord.candidate.toString()).toBe(candidate3._id.toString());
        });
    });

    describe('Election Results', () => {
        it('should return correct vote percentages', async () => {
            const res = await request(app)
                .get(`/api/elections/${election._id}/results`)
                .set('Authorization', `Bearer ${voterToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.data).toHaveProperty('results');
            
            const results = res.body.data.results;
            expect(Array.isArray(results)).toBe(true);
            
            // Check percentages are calculated
            results.forEach(result => {
                expect(result).toHaveProperty('percentage');
                expect(result.percentage).toMatch(/^\d+\.\d{2}%$/);
            });
        });

        it('should sort candidates by vote count', async () => {
            const res = await request(app)
                .get(`/api/elections/${election._id}/results`)
                .set('Authorization', `Bearer ${voterToken}`);

            const results = res.body.data.results;
            
            // Verify sorted by votes (descending)
            for (let i = 1; i < results.length; i++) {
                expect(results[i-1].votes).toBeGreaterThanOrEqual(results[i].votes);
            }
        });
    });
});

// Cleanup global setelah semua test
afterAll(async () => {
    await Election.deleteMany({ title: { $regex: /Test Election|Concurrent Test/ } });
    await Candidate.deleteMany({ fullName: { $regex: /Candidate One|Candidate Two|Concurrent Candidate|Candidate Three/ } });
    await Voter.deleteMany({ email: { $regex: /voter\d*@example\.com|concurrent.*@example\.com/ } });
    await VoteRecord.deleteMany({});
});

// Helper for concurrent testing
describe('Concurrent Voting Tests', () => {
    it('should handle concurrent vote requests', async () => {
        // Create fresh voter and election
        const hashedPassword = await bcrypt.hash('Password@123', 10);
        const voter = new Voter({
            fullName: 'Concurrent Voter',
            email: `concurrent${Date.now()}@example.com`,
            password: hashedPassword
        });
        await voter.save();

        const election = new Election({
            title: 'Concurrent Test',
            description: 'Test',
            thumbnail: 'test.jpg'
        });
        await election.save();

        const candidate = new Candidate({
            fullName: 'Concurrent Candidate',
            motto: 'Test',
            image: 'test.jpg',
            election: election._id,
            voteCount: 0
        });
        await candidate.save();

        const loginRes = await request(app)
            .post('/api/voters/login')
            .send({ email: voter.email, password: 'Password@123' });
        
        const token = loginRes.body.token;

        // Send 5 concurrent vote requests
        const promises = Array(5).fill(null).map((_, i) => 
            request(app)
                .patch(`/api/candidates/${candidate._id}/vote`)
                .set('Authorization', `Bearer ${token}`)
                .set('X-Idempotency-Key', `concurrent-${Date.now()}-${i}`)
                .send({ selectedElectionId: election._id })
        );

        const results = await Promise.allSettled(promises);
        
        // Count successful votes
        const successful = results.filter(r => 
            r.status === 'fulfilled' && r.value.statusCode === 200
        ).length;

        // Only 1 vote should succeed (per voter per election)
        expect(successful).toBe(1);

        // Verify final vote count
        const updatedCandidate = await Candidate.findById(candidate._id);
        expect(updatedCandidate.voteCount).toBe(1);
    });
});
