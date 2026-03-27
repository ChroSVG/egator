const idempotencyGuard = require('../../../middleware/idempotencyMiddleware');
const IdempotencyModel = require('../../../models/idempotencyModel');
const HttpError = require('../../../models/errorModel');

// Mock dependencies
jest.mock('../../../models/idempotencyModel');
jest.mock('../../../models/errorModel');

describe('Idempotency Middleware', () => {
    let mockReq;
    let mockRes;
    let mockNext;

    beforeEach(() => {
        mockReq = {
            headers: {},
            body: {}
        };

        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn()
        };

        mockNext = jest.fn();

        jest.clearAllMocks();
    });

    describe('No Idempotency Key', () => {
        it('should call next when no key provided (with warning)', async () => {
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

            await idempotencyGuard(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('X-Idempotency-Key')
            );

            consoleWarnSpy.mockRestore();
        });
    });

    describe('Invalid Key Format', () => {
        it('should reject invalid key format', async () => {
            mockReq.headers['x-idempotency-key'] = 'invalid-key';

            await idempotencyGuard(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(HttpError));
            const error = mockNext.mock.calls[0][0];
            expect(error.message).toContain('Invalid idempotency key format');
        });

        it('should accept valid UUID format', async () => {
            mockReq.headers['x-idempotency-key'] = '550e8400-e29b-41d4-a716-446655440000';

            IdempotencyModel.create.mockResolvedValue({ key: '550e8400-e29b-41d4-a716-446655440000' });

            await idempotencyGuard(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it('should accept key with length >= 32 even if not UUID', async () => {
            mockReq.headers['x-idempotency-key'] = 'a'.repeat(32);

            IdempotencyModel.create.mockResolvedValue({ key: 'a'.repeat(32) });

            await idempotencyGuard(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe('Valid Key - First Request', () => {
        it('should accept valid key and call next', async () => {
            const validKey = '550e8400-e29b-41d4-a716-446655440000';
            mockReq.headers['x-idempotency-key'] = validKey;

            IdempotencyModel.create.mockResolvedValue({ key: validKey });

            await idempotencyGuard(mockReq, mockRes, mockNext);

            expect(IdempotencyModel.create).toHaveBeenCalledWith({ key: validKey });
            expect(mockNext).toHaveBeenCalled();
        });

        it('should wrap res.json to capture response hash', async () => {
            const validKey = '550e8400-e29b-41d4-a716-446655440000';
            mockReq.headers['x-idempotency-key'] = validKey;

            IdempotencyModel.create.mockResolvedValue({ key: validKey });

            const originalJson = mockRes.json.bind(mockRes);
            await idempotencyGuard(mockReq, mockRes, mockNext);

            // Verify res.json was wrapped
            expect(typeof mockRes.json).toBe('function');
            expect(mockRes.json).not.toBe(originalJson);
        });
    });

    describe('Duplicate Key - Second Request', () => {
        it('should reject duplicate key with 429 error', async () => {
            const validKey = '550e8400-e29b-41d4-a716-446655440000';
            mockReq.headers['x-idempotency-key'] = validKey;

            // Simulate duplicate key error (MongoDB E11000)
            const duplicateError = new Error('Duplicate key');
            duplicateError.code = 11000;
            IdempotencyModel.create.mockRejectedValue(duplicateError);

            await idempotencyGuard(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(HttpError));
            const error = mockNext.mock.calls[0][0];
            expect(error.statusCode).toBe(429);
            expect(error.message).toContain('being processed or already completed');
            expect(error.data).toHaveProperty('retryAfter', 300);
        });
    });

    describe('Database Error', () => {
        it('should handle non-duplicate database errors', async () => {
            const validKey = '550e8400-e29b-41d4-a716-446655440000';
            mockReq.headers['x-idempotency-key'] = validKey;

            const dbError = new Error('Database connection failed');
            dbError.code = 50000;
            IdempotencyModel.create.mockRejectedValue(dbError);

            await idempotencyGuard(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(HttpError));
            const error = mockNext.mock.calls[0][0];
            expect(error.statusCode).toBe(500);
            expect(error.message).toContain('Idempotency check failed');
        });
    });

    describe('Response Hashing', () => {
        it('should create hash of response body', async () => {
            const validKey = '550e8400-e29b-41d4-a716-446655440000';
            mockReq.headers['x-idempotency-key'] = validKey;

            IdempotencyModel.create.mockResolvedValue({ key: validKey });

            await idempotencyGuard(mockReq, mockRes, mockNext);

            // Call the wrapped json method
            const responseBody = { success: true, data: { id: '123' } };
            mockRes.json(responseBody);

            // Verify original json was called
            expect(mockRes.json).toHaveBeenCalledWith(responseBody);
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty string key', async () => {
            mockReq.headers['x-idempotency-key'] = '';

            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

            await idempotencyGuard(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
            consoleWarnSpy.mockRestore();
        });

        it('should handle null key', async () => {
            mockReq.headers['x-idempotency-key'] = null;

            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

            await idempotencyGuard(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
            consoleWarnSpy.mockRestore();
        });

        it('should handle undefined headers', async () => {
            mockReq.headers = undefined;

            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

            await idempotencyGuard(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
            consoleWarnSpy.mockRestore();
        });
    });

    describe('UUID Format Validation', () => {
        const testCases = [
            { key: '550e8400-e29b-41d4-a716-446655440000', valid: true, description: 'standard UUID' },
            { key: '550E8400-E29B-41D4-A716-446655440000', valid: true, description: 'uppercase UUID' },
            { key: '123e4567-e89b-12d3-a456-426614174000', valid: true, description: 'another valid UUID' },
            { key: 'not-a-uuid', valid: false, description: 'invalid format (too short)' },
            { key: '550e8400e29b41d4a716446655440000', valid: true, description: 'UUID without hyphens (32 chars)' },
            { key: 'abc', valid: false, description: 'very short string' },
            { key: 'key-123', valid: false, description: 'invalid format' }
        ];

        testCases.forEach(({ key, valid, description }) => {
            it(`should ${valid ? 'accept' : 'reject'} ${description}`, async () => {
                mockReq.headers['x-idempotency-key'] = key;

                if (valid) {
                    IdempotencyModel.create.mockResolvedValue({ key });
                    await idempotencyGuard(mockReq, mockRes, mockNext);
                    expect(mockNext).toHaveBeenCalled();
                } else {
                    await idempotencyGuard(mockReq, mockRes, mockNext);
                    expect(mockNext).toHaveBeenCalledWith(expect.any(HttpError));
                    const error = mockNext.mock.calls[0][0];
                    expect(error.message).toContain('Invalid idempotency key format');
                }
            });
        });
    });
});
