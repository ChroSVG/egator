const request = require('supertest');
const app = require('../../index');
const Voter = require('../../models/voterModel');
const bcrypt = require('bcryptjs');

describe('Authentication Tests', () => {
    describe('POST /api/voters/register', () => {
        it('should register a new voter successfully', async () => {
            const voterData = {
                fullName: 'Test User',
                email: `test${Date.now()}@example.com`,
                password: 'Password@123',
                password2: 'Password@123'
            };

            const res = await request(app)
                .post('/api/voters/register')
                .send(voterData);

            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveProperty('token');
            expect(res.body.message).toContain('registered successfully');
        });

        it('should fail with missing fields', async () => {
            const res = await request(app)
                .post('/api/voters/register')
                .send({ fullName: 'Test User' });

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('should fail with weak password', async () => {
            const res = await request(app)
                .post('/api/voters/register')
                .send({
                    fullName: 'Test User',
                    email: `test${Date.now()}@example.com`,
                    password: 'weak',
                    password2: 'weak'
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toContain('8 characters');
        });

        it('should fail with mismatched passwords', async () => {
            const res = await request(app)
                .post('/api/voters/register')
                .send({
                    fullName: 'Test User',
                    email: `test${Date.now()}@example.com`,
                    password: 'Password@123',
                    password2: 'Password@456'
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toContain('do not match');
        });

        it('should fail with duplicate email', async () => {
            const email = `duplicate${Date.now()}@example.com`;
            
            // First registration
            await request(app)
                .post('/api/voters/register')
                .send({
                    fullName: 'Test User',
                    email,
                    password: 'Password@123',
                    password2: 'Password@123'
                });

            // Second registration with same email
            const res = await request(app)
                .post('/api/voters/register')
                .send({
                    fullName: 'Test User 2',
                    email,
                    password: 'Password@123',
                    password2: 'Password@123'
                });

            expect(res.statusCode).toBe(409);
            expect(res.body.message).toContain('already exists');
        });
    });

    describe('POST /api/voters/login', () => {
        let testVoter;

        beforeEach(async () => {
            const hashedPassword = await bcrypt.hash('Password@123', 10);
            testVoter = new Voter({
                fullName: 'Login Test User',
                email: `login${Date.now()}@example.com`,
                password: hashedPassword
            });
            await testVoter.save();
        });

        it('should login successfully with valid credentials', async () => {
            const res = await request(app)
                .post('/api/voters/login')
                .send({
                    email: testVoter.email,
                    password: 'Password@123'
                });

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('token');
            expect(res.body.voter).toHaveProperty('email', testVoter.email);
        });

        it('should fail with invalid email', async () => {
            const res = await request(app)
                .post('/api/voters/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'Password@123'
                });

            expect(res.statusCode).toBe(401);
            expect(res.body.message).toContain('Invalid credentials');
        });

        it('should fail with invalid password', async () => {
            const res = await request(app)
                .post('/api/voters/login')
                .send({
                    email: testVoter.email,
                    password: 'WrongPassword@123'
                });

            expect(res.statusCode).toBe(401);
            expect(res.body.message).toContain('Invalid credentials');
        });
    });
});
