const {
    handleValidationErrors,
    validateEmail,
    validatePassword,
    validatePasswordConfirmation,
    validateFullName,
    validateElectionId,
    validateCandidateId,
    validateVoterId,
    validateCreateElection,
    validateCreateCandidate,
    validateVote,
    validatePagination,
    validateSearch
} = require('../../../middleware/validationMiddleware');

describe('Validation Middleware', () => {
    describe('handleValidationErrors', () => {
        it('should call next if no validation errors', () => {
            const mockReq = { body: {} };
            const mockRes = {};
            const mockNext = jest.fn();

            // Mock validationResult to return empty errors
            const mockValidationResult = {
                isEmpty: jest.fn().mockReturnValue(true),
                array: jest.fn()
            };
            jest.mock('express-validator', () => ({
                validationResult: jest.fn().mockReturnValue(mockValidationResult)
            }));

            handleValidationErrors(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it('should return 400 if validation errors exist', () => {
            const mockReq = { body: {} };
            const mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            const mockNext = jest.fn();

            const mockValidationResult = {
                isEmpty: jest.fn().mockReturnValue(false),
                array: jest.fn().mockReturnValue([
                    { path: 'email', msg: 'Invalid email' }
                ])
            };

            // Need to mock express-validator's validationResult
            jest.mock('express-validator', () => ({
                validationResult: jest.fn().mockReturnValue(mockValidationResult)
            }));

            handleValidationErrors(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Validation failed'
            }));
        });
    });

    describe('validateEmail', () => {
        it('should validate correct email', async () => {
            const mockReq = { body: { email: 'test@example.com' } };
            const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const mockNext = jest.fn();

            // express-validator validations are arrays of middleware
            for (const validation of validateEmail) {
                if (typeof validation === 'function') {
                    await validation(mockReq, mockRes, mockNext);
                }
            }

            expect(mockNext).toHaveBeenCalled();
        });

        it('should reject empty email', async () => {
            const mockReq = { body: { email: '' } };
            const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const mockNext = jest.fn();

            for (const validation of validateEmail) {
                if (typeof validation === 'function') {
                    await validation(mockReq, mockRes, mockNext);
                }
            }

            // Should have called status due to validation error
            expect(mockRes.status).toHaveBeenCalled();
        });

        it('should reject invalid email format', async () => {
            const mockReq = { body: { email: 'invalid-email' } };
            const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const mockNext = jest.fn();

            for (const validation of validateEmail) {
                if (typeof validation === 'function') {
                    await validation(mockReq, mockRes, mockNext);
                }
            }

            expect(mockRes.status).toHaveBeenCalled();
        });
    });

    describe('validatePassword', () => {
        it('should validate strong password', async () => {
            const mockReq = { body: { password: 'Password@123' } };
            const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const mockNext = jest.fn();

            for (const validation of validatePassword) {
                if (typeof validation === 'function') {
                    await validation(mockReq, mockRes, mockNext);
                }
            }

            expect(mockNext).toHaveBeenCalled();
        });

        it('should reject password less than 8 characters', async () => {
            const mockReq = { body: { password: 'Pass@1' } };
            const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const mockNext = jest.fn();

            for (const validation of validatePassword) {
                if (typeof validation === 'function') {
                    await validation(mockReq, mockRes, mockNext);
                }
            }

            expect(mockRes.status).toHaveBeenCalled();
        });

        it('should reject password without uppercase', async () => {
            const mockReq = { body: { password: 'password@123' } };
            const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const mockNext = jest.fn();

            for (const validation of validatePassword) {
                if (typeof validation === 'function') {
                    await validation(mockReq, mockRes, mockNext);
                }
            }

            expect(mockRes.status).toHaveBeenCalled();
        });

        it('should reject password without special character', async () => {
            const mockReq = { body: { password: 'Password123' } };
            const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const mockNext = jest.fn();

            for (const validation of validatePassword) {
                if (typeof validation === 'function') {
                    await validation(mockReq, mockRes, mockNext);
                }
            }

            expect(mockRes.status).toHaveBeenCalled();
        });
    });

    describe('validatePasswordConfirmation', () => {
        it('should validate matching passwords', async () => {
            const mockReq = { body: { password: 'Password@123', password2: 'Password@123' } };
            const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const mockNext = jest.fn();

            for (const validation of validatePasswordConfirmation) {
                if (typeof validation === 'function') {
                    await validation(mockReq, mockRes, mockNext);
                }
            }

            expect(mockNext).toHaveBeenCalled();
        });

        it('should reject non-matching passwords', async () => {
            const mockReq = { body: { password: 'Password@123', password2: 'Password@456' } };
            const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const mockNext = jest.fn();

            for (const validation of validatePasswordConfirmation) {
                if (typeof validation === 'function') {
                    await validation(mockReq, mockRes, mockNext);
                }
            }

            expect(mockRes.status).toHaveBeenCalled();
        });
    });

    describe('validateFullName', () => {
        it('should validate correct full name', async () => {
            const mockReq = { body: { fullName: 'John Doe' } };
            const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const mockNext = jest.fn();

            for (const validation of validateFullName) {
                if (typeof validation === 'function') {
                    await validation(mockReq, mockRes, mockNext);
                }
            }

            expect(mockNext).toHaveBeenCalled();
        });

        it('should reject empty name', async () => {
            const mockReq = { body: { fullName: '' } };
            const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const mockNext = jest.fn();

            for (const validation of validateFullName) {
                if (typeof validation === 'function') {
                    await validation(mockReq, mockRes, mockNext);
                }
            }

            expect(mockRes.status).toHaveBeenCalled();
        });

        it('should reject name with numbers', async () => {
            const mockReq = { body: { fullName: 'John123' } };
            const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const mockNext = jest.fn();

            for (const validation of validateFullName) {
                if (typeof validation === 'function') {
                    await validation(mockReq, mockRes, mockNext);
                }
            }

            expect(mockRes.status).toHaveBeenCalled();
        });

        it('should reject name that is too long', async () => {
            const mockReq = { body: { fullName: 'A'.repeat(101) } };
            const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const mockNext = jest.fn();

            for (const validation of validateFullName) {
                if (typeof validation === 'function') {
                    await validation(mockReq, mockRes, mockNext);
                }
            }

            expect(mockRes.status).toHaveBeenCalled();
        });
    });

    describe('validateElectionId', () => {
        it('should validate correct MongoDB ID', async () => {
            const mockReq = { params: { id: '507f1f77bcf86cd799439011' } };
            const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const mockNext = jest.fn();

            for (const validation of validateElectionId) {
                if (typeof validation === 'function') {
                    await validation(mockReq, mockRes, mockNext);
                }
            }

            expect(mockNext).toHaveBeenCalled();
        });

        it('should reject invalid MongoDB ID', async () => {
            const mockReq = { params: { id: 'invalid-id' } };
            const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const mockNext = jest.fn();

            for (const validation of validateElectionId) {
                if (typeof validation === 'function') {
                    await validation(mockReq, mockRes, mockNext);
                }
            }

            expect(mockRes.status).toHaveBeenCalled();
        });
    });

    describe('validateCandidateId', () => {
        it('should validate correct MongoDB ID', async () => {
            const mockReq = { params: { id: '507f1f77bcf86cd799439011' } };
            const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const mockNext = jest.fn();

            for (const validation of validateCandidateId) {
                if (typeof validation === 'function') {
                    await validation(mockReq, mockRes, mockNext);
                }
            }

            expect(mockNext).toHaveBeenCalled();
        });

        it('should reject invalid MongoDB ID', async () => {
            const mockReq = { params: { id: 'not-a-valid-id' } };
            const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const mockNext = jest.fn();

            for (const validation of validateCandidateId) {
                if (typeof validation === 'function') {
                    await validation(mockReq, mockRes, mockNext);
                }
            }

            expect(mockRes.status).toHaveBeenCalled();
        });
    });

    describe('validateVoterId', () => {
        it('should validate correct MongoDB ID', async () => {
            const mockReq = { params: { id: '507f1f77bcf86cd799439011' } };
            const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const mockNext = jest.fn();

            for (const validation of validateVoterId) {
                if (typeof validation === 'function') {
                    await validation(mockReq, mockRes, mockNext);
                }
            }

            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe('validateCreateElection', () => {
        it('should validate correct election data', async () => {
            const mockReq = {
                body: {
                    title: 'Presidential Election',
                    description: 'Election for president 2024'
                }
            };
            const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const mockNext = jest.fn();

            for (const validation of validateCreateElection) {
                if (typeof validation === 'function') {
                    await validation(mockReq, mockRes, mockNext);
                }
            }

            expect(mockNext).toHaveBeenCalled();
        });

        it('should reject empty title', async () => {
            const mockReq = {
                body: {
                    title: '',
                    description: 'Valid description here'
                }
            };
            const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const mockNext = jest.fn();

            for (const validation of validateCreateElection) {
                if (typeof validation === 'function') {
                    await validation(mockReq, mockRes, mockNext);
                }
            }

            expect(mockRes.status).toHaveBeenCalled();
        });

        it('should reject short description', async () => {
            const mockReq = {
                body: {
                    title: 'Election',
                    description: 'Short'
                }
            };
            const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const mockNext = jest.fn();

            for (const validation of validateCreateElection) {
                if (typeof validation === 'function') {
                    await validation(mockReq, mockRes, mockNext);
                }
            }

            expect(mockRes.status).toHaveBeenCalled();
        });
    });

    describe('validateCreateCandidate', () => {
        it('should validate correct candidate data', async () => {
            const mockReq = {
                body: {
                    fullName: 'John Doe',
                    motto: 'Vote for change',
                    election: '507f1f77bcf86cd799439011'
                }
            };
            const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const mockNext = jest.fn();

            for (const validation of validateCreateCandidate) {
                if (typeof validation === 'function') {
                    await validation(mockReq, mockRes, mockNext);
                }
            }

            expect(mockNext).toHaveBeenCalled();
        });

        it('should reject invalid election ID', async () => {
            const mockReq = {
                body: {
                    fullName: 'John Doe',
                    motto: 'Vote for change',
                    election: 'invalid-id'
                }
            };
            const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const mockNext = jest.fn();

            for (const validation of validateCreateCandidate) {
                if (typeof validation === 'function') {
                    await validation(mockReq, mockRes, mockNext);
                }
            }

            expect(mockRes.status).toHaveBeenCalled();
        });
    });

    describe('validateVote', () => {
        it('should validate correct vote data', async () => {
            const mockReq = {
                body: {
                    selectedElectionId: '507f1f77bcf86cd799439011'
                }
            };
            const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const mockNext = jest.fn();

            for (const validation of validateVote) {
                if (typeof validation === 'function') {
                    await validation(mockReq, mockRes, mockNext);
                }
            }

            expect(mockNext).toHaveBeenCalled();
        });

        it('should reject empty election ID', async () => {
            const mockReq = { body: { selectedElectionId: '' } };
            const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const mockNext = jest.fn();

            for (const validation of validateVote) {
                if (typeof validation === 'function') {
                    await validation(mockReq, mockRes, mockNext);
                }
            }

            expect(mockRes.status).toHaveBeenCalled();
        });
    });

    describe('validatePagination', () => {
        it('should validate correct pagination params', async () => {
            const mockReq = { query: { page: '2', limit: '20' } };
            const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const mockNext = jest.fn();

            for (const validation of validatePagination) {
                if (typeof validation === 'function') {
                    await validation(mockReq, mockRes, mockNext);
                }
            }

            expect(mockNext).toHaveBeenCalled();
            expect(mockReq.query.page).toBe(2);
            expect(mockReq.query.limit).toBe(20);
        });

        it('should reject negative page number', async () => {
            const mockReq = { query: { page: '-1' } };
            const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const mockNext = jest.fn();

            for (const validation of validatePagination) {
                if (typeof validation === 'function') {
                    await validation(mockReq, mockRes, mockNext);
                }
            }

            expect(mockRes.status).toHaveBeenCalled();
        });

        it('should reject limit over 100', async () => {
            const mockReq = { query: { limit: '150' } };
            const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const mockNext = jest.fn();

            for (const validation of validatePagination) {
                if (typeof validation === 'function') {
                    await validation(mockReq, mockRes, mockNext);
                }
            }

            expect(mockRes.status).toHaveBeenCalled();
        });

        it('should allow missing pagination params (optional)', async () => {
            const mockReq = { query: {} };
            const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const mockNext = jest.fn();

            for (const validation of validatePagination) {
                if (typeof validation === 'function') {
                    await validation(mockReq, mockRes, mockNext);
                }
            }

            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe('validateSearch', () => {
        it('should validate correct search query', async () => {
            const mockReq = { query: { search: 'John Doe' } };
            const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const mockNext = jest.fn();

            for (const validation of validateSearch) {
                if (typeof validation === 'function') {
                    await validation(mockReq, mockRes, mockNext);
                }
            }

            expect(mockNext).toHaveBeenCalled();
        });

        it('should allow missing search query (optional)', async () => {
            const mockReq = { query: {} };
            const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const mockNext = jest.fn();

            for (const validation of validateSearch) {
                if (typeof validation === 'function') {
                    await validation(mockReq, mockRes, mockNext);
                }
            }

            expect(mockNext).toHaveBeenCalled();
        });
    });
});
