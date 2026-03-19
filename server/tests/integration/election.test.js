const request = require('supertest');
const app = require('../../index');
const mongoose = require('mongoose');
const Voter = require('../../models/voterModel');
const Election = require('../../models/electionModel');
const Candidate = require('../../models/candidateModel');
const bcrypt = require('bcryptjs');

describe('Election API Tests', () => {
    let adminToken;
    let voterToken;
    let testElection;
    let testCandidate;

    // Helper function to create test data
    const createTestElection = async () => {
        testElection = new Election({
            title: 'Test Election',
            description: 'Test Description',
            thumbnail: 'https://res.cloudinary.com/test/image/upload/v1234567890/elections/test-election.jpg'
        });
        await testElection.save();
        return testElection;
    };

    const createTestCandidate = async (electionId) => {
        testCandidate = new Candidate({
            fullName: 'Test Candidate',
            motto: 'Vote for me!',
            image: 'https://res.cloudinary.com/test/image/upload/v1234567890/candidates/test-candidate.jpg',
            election: electionId
        });
        await testCandidate.save();
        
        // Add candidate to election
        testElection.candidates.push(testCandidate._id);
        await testElection.save();
        
        return testCandidate;
    };

    beforeAll(async () => {
        // Create admin user
        const hashedPassword = await bcrypt.hash('Admin@123456', 10);
        const admin = new Voter({
            fullName: 'Admin User',
            email: `admin${Date.now()}@example.com`,
            password: hashedPassword,
            isAdmin: true
        });
        await admin.save();

        // Login as admin
        const loginRes = await request(app)
            .post('/api/voters/login')
            .send({ email: admin.email, password: 'Admin@123456' });
        
        adminToken = loginRes.body.token;

        // Create regular voter
        const voter = new Voter({
            fullName: 'Regular Voter',
            email: `voter${Date.now()}@example.com`,
            password: hashedPassword,
            isAdmin: false
        });
        await voter.save();

        // Login as voter
        const voterLoginRes = await request(app)
            .post('/api/voters/login')
            .send({ email: voter.email, password: 'Admin@123456' });
        
        voterToken = voterLoginRes.body.token;

        // Create test election
        await createTestElection();
        await createTestCandidate(testElection._id);
    });

    describe('GET /api/elections', () => {
        it('should get all elections', async () => {
            const res = await request(app)
                .get('/api/elections')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('data');
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .get('/api/elections');

            expect(res.statusCode).toBe(401);
        });

        it('should support pagination', async () => {
            const res = await request(app)
                .get('/api/elections?page=1&limit=5')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('page', 1);
            expect(res.body).toHaveProperty('limit', 5);
        });
    });

    describe('GET /api/elections/:id', () => {
        it('should get single election', async () => {
            const res = await request(app)
                .get(`/api/elections/${testElection._id}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.data).toHaveProperty('title', 'Test Election');
        });

        it('should return 404 for non-existent election', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .get(`/api/elections/${fakeId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toBe(404);
        });
    });

    describe('GET /api/elections/:id/candidates', () => {
        it('should get election candidates', async () => {
            const res = await request(app)
                .get(`/api/elections/${testElection._id}/candidates`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('count');
            expect(res.body.data).toHaveLength(1);
        });
    });

    describe('GET /api/elections/:id/results', () => {
        it('should get election results', async () => {
            const res = await request(app)
                .get(`/api/elections/${testElection._id}/results`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.data).toHaveProperty('electionId', testElection._id.toString());
            expect(res.body.data).toHaveProperty('results');
        });
    });

    describe('POST /api/elections', () => {
        it('should require admin privileges', async () => {
            const res = await request(app)
                .post('/api/elections')
                .set('Authorization', `Bearer ${voterToken}`)
                .field('title', 'New Election')
                .field('description', 'New Description');

            expect(res.statusCode).toBe(403);
        });

        it('should create election with valid data', async () => {
            // Create a test image file
            const testImage = Buffer.from(
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                'base64'
            );

            const res = await request(app)
                .post('/api/elections')
                .set('Authorization', `Bearer ${adminToken}`)
                .field('title', 'New Election')
                .field('description', 'New Description')
                .attach('thumbnail', testImage, 'test.png');

            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveProperty('message');
            expect(res.body.data).toHaveProperty('title', 'New Election');
        });

        it('should fail without thumbnail', async () => {
            const res = await request(app)
                .post('/api/elections')
                .set('Authorization', `Bearer ${adminToken}`)
                .field('title', 'New Election')
                .field('description', 'New Description');

            expect(res.statusCode).toBe(400);
        });
    });

    describe('PATCH /api/elections/:id', () => {
        it('should require admin privileges', async () => {
            const res = await request(app)
                .patch(`/api/elections/${testElection._id}`)
                .set('Authorization', `Bearer ${voterToken}`)
                .field('title', 'Updated Title');

            expect(res.statusCode).toBe(403);
        });

        it('should update election', async () => {
            const res = await request(app)
                .patch(`/api/elections/${testElection._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .field('title', 'Updated Title')
                .field('description', 'Updated Description');

            expect(res.statusCode).toBe(200);
            expect(res.body.data).toHaveProperty('title', 'Updated Title');
        });
    });

    describe('DELETE /api/elections/:id', () => {
        it('should require admin privileges', async () => {
            const res = await request(app)
                .delete(`/api/elections/${testElection._id}`)
                .set('Authorization', `Bearer ${voterToken}`);

            expect(res.statusCode).toBe(403);
        });

        it('should delete election', async () => {
            // Create a new election to delete
            const electionToDelete = await createTestElection();

            const res = await request(app)
                .delete(`/api/elections/${electionToDelete._id}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toBe(200);
            
            // Verify deletion
            const deletedElection = await Election.findById(electionToDelete._id);
            expect(deletedElection).toBeNull();
        });
    });
});
