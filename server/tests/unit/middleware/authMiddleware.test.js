const { authMiddleware, optionalAuth, adminOnly } = require('../../../middleware/authMiddleware');
const jwt = require('jsonwebtoken');
const HttpError = require('../../../models/errorModel');

jest.mock('jsonwebtoken');

describe('Auth Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            headers: {
                authorization: 'Bearer valid-token'
            }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('authMiddleware', () => {
        it('should authenticate valid token', async () => {
            const decodedUser = { id: 'user-id', isAdmin: false };
            jwt.verify.mockReturnValue({ user: decodedUser });

            await authMiddleware(req, res, next);

            expect(jwt.verify).toHaveBeenCalledWith('valid-token', process.env.JWT_SECRET);
            expect(req.user).toEqual(decodedUser);
            expect(next).toHaveBeenCalled();
        });

        it('should fail with no authorization header', async () => {
            req.headers.authorization = null;

            await authMiddleware(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(HttpError));
            expect(next.mock.calls[0][0].statusCode).toBe(401);
        });

        it('should fail with invalid token format', async () => {
            req.headers.authorization = 'InvalidFormat';

            await authMiddleware(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(HttpError));
            expect(next.mock.calls[0][0].statusCode).toBe(401);
        });

        it('should fail with expired token', async () => {
            const expiredError = new Error('Token expired');
            expiredError.name = 'TokenExpiredError';
            jwt.verify.mockImplementation(() => { throw expiredError; });

            await authMiddleware(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(HttpError));
            expect(next.mock.calls[0][0].statusCode).toBe(401);
        });

        it('should fail with invalid token', async () => {
            const invalidError = new Error('Invalid token');
            invalidError.name = 'JsonWebTokenError';
            jwt.verify.mockImplementation(() => { throw invalidError; });

            await authMiddleware(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(HttpError));
            expect(next.mock.calls[0][0].statusCode).toBe(401);
        });
    });

    describe('optionalAuth', () => {
        it('should attach user if valid token provided', async () => {
            const decodedUser = { id: 'user-id', isAdmin: false };
            jwt.verify.mockReturnValue({ user: decodedUser });

            await optionalAuth(req, res, next);

            expect(req.user).toEqual(decodedUser);
            expect(next).toHaveBeenCalled();
        });

        it('should continue without user if no token', async () => {
            req.headers.authorization = null;

            await optionalAuth(req, res, next);

            expect(req.user).toBeUndefined();
            expect(next).toHaveBeenCalled();
        });

        it('should continue without user if invalid token', async () => {
            jwt.verify.mockImplementation(() => { throw new Error('Invalid'); });

            await optionalAuth(req, res, next);

            expect(req.user).toBeUndefined();
            expect(next).toHaveBeenCalled();
        });
    });

    describe('adminOnly', () => {
        it('should allow admin user', () => {
            req.user = { id: 'admin-id', isAdmin: true };

            adminOnly(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should reject non-admin user', () => {
            req.user = { id: 'user-id', isAdmin: false };

            adminOnly(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(HttpError));
            expect(next.mock.calls[0][0].statusCode).toBe(403);
        });

        it('should reject unauthenticated user', () => {
            req.user = null;

            adminOnly(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(HttpError));
            expect(next.mock.calls[0][0].statusCode).toBe(403);
        });
    });
});
