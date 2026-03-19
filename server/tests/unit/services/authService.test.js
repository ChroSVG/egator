const AuthService = require('../../../services/authService');
const VoterRepository = require('../../../repositories/voterRepository');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const HttpError = require('../../../models/errorModel');

// Mock dependencies
jest.mock('../../../repositories/voterRepository');
jest.mock('jsonwebtoken');
jest.mock('bcryptjs');

describe('AuthService', () => {
    let authService;
    let mockVoter;

    beforeEach(() => {
        authService = new AuthService();
        mockVoter = {
            _id: 'test-id',
            fullName: 'Test Voter',
            email: 'test@example.com',
            password: 'hashed-password',
            isAdmin: false,
            save: jest.fn()
        };

        process.env.JWT_SECRET = 'test-secret';
        process.env.JWT_EXPIRES_IN = '1d';

        jest.clearAllMocks();
    });

    describe('register', () => {
        it('should register a new voter successfully', async () => {
            const registerData = {
                fullName: 'Test Voter',
                email: 'test@example.com',
                password: 'Password@123',
                password2: 'Password@123'
            };

            VoterRepository.prototype.findByEmail.mockResolvedValue(null);
            bcrypt.genSalt.mockResolvedValue('salt');
            bcrypt.hash.mockResolvedValue('hashed-password');
            VoterRepository.prototype.create.mockResolvedValue(mockVoter);
            jwt.sign.mockReturnValue('fake-token');

            const result = await authService.register(registerData);

            expect(VoterRepository.prototype.findByEmail)
                .toHaveBeenCalledWith('test@example.com');
            expect(bcrypt.hash).toHaveBeenCalledWith('Password@123', 'salt');
            expect(VoterRepository.prototype.create).toHaveBeenCalledWith({
                fullName: 'Test Voter',
                email: 'test@example.com',
                password: 'hashed-password',
                isAdmin: false
            });
            expect(result).toHaveProperty('token', 'fake-token');
            expect(result.voter).toHaveProperty('email', 'test@example.com');
        });

        it('should fail with mismatched passwords', async () => {
            const registerData = {
                fullName: 'Test Voter',
                email: 'test@example.com',
                password: 'Password@123',
                password2: 'Password@456'
            };

            await expect(authService.register(registerData))
                .rejects.toThrow(HttpError);
            await expect(authService.register(registerData))
                .rejects.toHaveProperty('statusCode', 400);
        });

        it('should fail with duplicate email', async () => {
            const registerData = {
                fullName: 'Test Voter',
                email: 'test@example.com',
                password: 'Password@123',
                password2: 'Password@123'
            };

            VoterRepository.prototype.findByEmail.mockResolvedValue(mockVoter);

            await expect(authService.register(registerData))
                .rejects.toThrow(HttpError);
            await expect(authService.register(registerData))
                .rejects.toHaveProperty('statusCode', 409);
        });
    });

    describe('login', () => {
        it('should login successfully with valid credentials', async () => {
            const credentials = {
                email: 'test@example.com',
                password: 'Password@123'
            };

            VoterRepository.prototype.findByEmail.mockResolvedValue(mockVoter);
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue('fake-token');

            const result = await authService.login(credentials);

            expect(VoterRepository.prototype.findByEmail)
                .toHaveBeenCalledWith('test@example.com');
            expect(bcrypt.compare).toHaveBeenCalledWith('Password@123', 'hashed-password');
            expect(result).toHaveProperty('token', 'fake-token');
            expect(result.voter).toHaveProperty('email', 'test@example.com');
        });

        it('should fail with invalid email', async () => {
            const credentials = {
                email: 'nonexistent@example.com',
                password: 'Password@123'
            };

            VoterRepository.prototype.findByEmail.mockResolvedValue(null);

            await expect(authService.login(credentials))
                .rejects.toThrow(HttpError);
            await expect(authService.login(credentials))
                .rejects.toHaveProperty('statusCode', 401);
        });

        it('should fail with invalid password', async () => {
            const credentials = {
                email: 'test@example.com',
                password: 'WrongPassword'
            };

            VoterRepository.prototype.findByEmail.mockResolvedValue(mockVoter);
            bcrypt.compare.mockResolvedValue(false);

            await expect(authService.login(credentials))
                .rejects.toThrow(HttpError);
            await expect(authService.login(credentials))
                .rejects.toHaveProperty('statusCode', 401);
        });
    });

    describe('getVoterById', () => {
        it('should return voter by ID', async () => {
            VoterRepository.prototype.findByIdSelective.mockResolvedValue(mockVoter);

            const result = await authService.getVoterById('test-id');

            expect(VoterRepository.prototype.findByIdSelective)
                .toHaveBeenCalledWith('test-id');
            expect(result).toEqual(mockVoter);
        });

        it('should throw error if voter not found', async () => {
            VoterRepository.prototype.findByIdSelective.mockResolvedValue(null);

            await expect(authService.getVoterById('invalid-id'))
                .rejects.toThrow(HttpError);
            await expect(authService.getVoterById('invalid-id'))
                .rejects.toHaveProperty('statusCode', 404);
        });
    });

    describe('generateToken', () => {
        it('should generate JWT token', () => {
            jwt.sign.mockReturnValue('generated-token');

            const token = authService.generateToken(mockVoter);

            expect(jwt.sign).toHaveBeenCalledWith(
                { user: { id: 'test-id', isAdmin: false } },
                'test-secret',
                { expiresIn: '1d' }
            );
            expect(token).toBe('generated-token');
        });
    });

    describe('verifyToken', () => {
        it('should verify valid token', () => {
            const decodedToken = { user: { id: 'test-id', isAdmin: false } };
            jwt.verify.mockReturnValue(decodedToken);

            const result = authService.verifyToken('valid-token');

            expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
            expect(result).toEqual(decodedToken);
        });

        it('should throw error for expired token', () => {
            const expiredError = new Error('Token expired');
            expiredError.name = 'TokenExpiredError';
            jwt.verify.mockImplementation(() => { throw expiredError; });

            expect(() => authService.verifyToken('expired-token'))
                .toThrow(HttpError);
            expect(() => authService.verifyToken('expired-token'))
                .toThrow('Token expired, please login again');
        });

        it('should throw error for invalid token', () => {
            const invalidError = new Error('Invalid token');
            invalidError.name = 'JsonWebTokenError';
            jwt.verify.mockImplementation(() => { throw invalidError; });

            expect(() => authService.verifyToken('invalid-token'))
                .toThrow(HttpError);
            expect(() => authService.verifyToken('invalid-token'))
                .toThrow('Invalid token');
        });
    });

    describe('createAdmin', () => {
        it('should create new admin user', async () => {
            const adminData = {
                email: 'admin@example.com',
                password: 'Admin@123',
                fullName: 'Admin User'
            };

            VoterRepository.prototype.findByEmail.mockResolvedValue(null);
            bcrypt.genSalt.mockResolvedValue('salt');
            bcrypt.hash.mockResolvedValue('hashed-password');
            VoterRepository.prototype.createAdmin.mockResolvedValue({
                ...mockVoter,
                isAdmin: true
            });

            const result = await authService.createAdmin(adminData);

            expect(result).toHaveProperty('message', 'Admin created successfully');
            expect(result.admin.isAdmin).toBe(true);
        });

        it('should return message if admin already exists', async () => {
            const adminData = {
                email: 'admin@example.com',
                password: 'Admin@123',
                fullName: 'Admin User'
            };

            const existingAdmin = { ...mockVoter, isAdmin: true };
            VoterRepository.prototype.findByEmail.mockResolvedValue(existingAdmin);

            const result = await authService.createAdmin(adminData);

            expect(result).toHaveProperty('message', 'Admin already exists');
        });
    });

    describe('changePassword', () => {
        it('should change password successfully', async () => {
            VoterRepository.prototype.findById.mockResolvedValue(mockVoter);
            bcrypt.compare.mockResolvedValue(true);
            bcrypt.genSalt.mockResolvedValue('salt');
            bcrypt.hash.mockResolvedValue('new-hashed-password');
            VoterRepository.prototype.updatePassword.mockResolvedValue(mockVoter);

            const result = await authService.changePassword(
                'voter-id',
                'Current@123',
                'New@123'
            );

            expect(result).toHaveProperty('message', 'Password changed successfully');
        });

        it('should fail with incorrect current password', async () => {
            VoterRepository.prototype.findById.mockResolvedValue(mockVoter);
            bcrypt.compare.mockResolvedValue(false);

            await expect(authService.changePassword(
                'voter-id',
                'Wrong@123',
                'New@123'
            )).rejects.toThrow(HttpError);
        });

        it('should fail if voter not found', async () => {
            VoterRepository.prototype.findById.mockResolvedValue(null);

            await expect(authService.changePassword(
                'invalid-id',
                'Current@123',
                'New@123'
            )).rejects.toThrow(HttpError);
            await expect(authService.changePassword(
                'invalid-id',
                'Current@123',
                'New@123'
            )).rejects.toHaveProperty('statusCode', 404);
        });
    });
});
