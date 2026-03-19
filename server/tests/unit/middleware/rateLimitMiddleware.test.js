const {
    generalLimiter,
    loginLimiter,
    registerLimiter,
    voteLimiter,
    adminLimiter
} = require('../../../middleware/rateLimitMiddleware');

describe('Rate Limit Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            path: '/api/test',
            ip: '127.0.0.1',
            body: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            set: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('generalLimiter', () => {
        it('should be defined', () => {
            expect(generalLimiter).toBeDefined();
        });

        it('should have handler function', () => {
            expect(typeof generalLimiter).toBe('function');
        });
    });

    describe('loginLimiter', () => {
        it('should be defined', () => {
            expect(loginLimiter).toBeDefined();
        });

        it('should have handler function', () => {
            expect(typeof loginLimiter).toBe('function');
        });
    });

    describe('registerLimiter', () => {
        it('should be defined', () => {
            expect(registerLimiter).toBeDefined();
        });

        it('should have handler function', () => {
            expect(typeof registerLimiter).toBe('function');
        });
    });

    describe('voteLimiter', () => {
        it('should be defined', () => {
            expect(voteLimiter).toBeDefined();
        });

        it('should have handler function', () => {
            expect(typeof voteLimiter).toBe('function');
        });
    });

    describe('adminLimiter', () => {
        it('should be defined', () => {
            expect(adminLimiter).toBeDefined();
        });

        it('should have handler function', () => {
            expect(typeof adminLimiter).toBe('function');
        });
    });
});
