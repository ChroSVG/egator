const { CircuitBreaker, CircuitBreakerRegistry, cloudinaryBreaker, databaseBreaker } = require('../../../utils/circuitBreaker');

describe('CircuitBreaker', () => {
    let breaker;

    beforeEach(() => {
        breaker = new CircuitBreaker('test', {
            failureThreshold: 3,
            successThreshold: 2,
            timeout: 1000
        });
        jest.clearAllMocks();
    });

    describe('execute', () => {
        it('should execute successful operation', async () => {
            const operation = jest.fn().mockResolvedValue('success');

            const result = await breaker.execute(operation);

            expect(result).toBe('success');
            expect(operation).toHaveBeenCalled();
            expect(breaker.state).toBe('CLOSED');
            expect(breaker.stats.successfulCalls).toBe(1);
        });

        it('should open circuit after threshold failures', async () => {
            const operation = jest.fn().mockRejectedValue(new Error('Failed'));

            // Fail 3 times to open circuit
            for (let i = 0; i < 3; i++) {
                try {
                    await breaker.execute(operation);
                } catch (error) {
                    // Expected
                }
            }

            expect(breaker.state).toBe('OPEN');
            expect(breaker.failureCount).toBe(3);
        });

        it('should reject requests when circuit is open', async () => {
            const operation = jest.fn().mockRejectedValue(new Error('Failed'));
            
            // Open the circuit
            for (let i = 0; i < 3; i++) {
                try {
                    await breaker.execute(operation);
                } catch (error) {}
            }

            // Try to execute while open
            await expect(breaker.execute(operation))
                .rejects.toThrow('Circuit breaker is OPEN');
            
            expect(breaker.stats.rejectedCalls).toBe(1);
        });

        it('should transition to half-open after timeout', async () => {
            breaker.state = 'OPEN';
            breaker.nextAttempt = Date.now() - 1000; // In the past

            const operation = jest.fn().mockResolvedValue('success');

            await breaker.execute(operation);

            expect(breaker.state).toBe('HALF-OPEN');
        });

        it('should close circuit after successful half-open', async () => {
            breaker.state = 'HALF-OPEN';
            
            const operation = jest.fn().mockResolvedValue('success');

            // Need 2 successful calls to close
            await breaker.execute(operation);
            await breaker.execute(operation);

            expect(breaker.state).toBe('CLOSED');
        });

        it('should use fallback when provided', async () => {
            const operation = jest.fn().mockRejectedValue(new Error('Failed'));
            const fallback = jest.fn().mockReturnValue('fallback-value');

            const result = await breaker.execute(operation, { fallback });

            expect(result).toBe('fallback-value');
            expect(fallback).toHaveBeenCalled();
        });

        it('should handle timeout', async () => {
            const slowOperation = jest.fn().mockImplementation(
                () => new Promise(resolve => setTimeout(resolve, 2000))
            );

            await expect(breaker.execute(slowOperation, { timeout: 100 }))
                .rejects.toThrow('TIMEOUT');
            
            expect(breaker.stats.timeouts).toBe(1);
        });
    });

    describe('getStatus', () => {
        it('should return breaker status', () => {
            const status = breaker.getStatus();

            expect(status).toHaveProperty('name', 'test');
            expect(status).toHaveProperty('state', 'CLOSED');
            expect(status).toHaveProperty('failureCount', 0);
            expect(status).toHaveProperty('stats');
        });
    });

    describe('reset', () => {
        it('should reset breaker to initial state', () => {
            breaker.state = 'OPEN';
            breaker.failureCount = 5;
            breaker.nextAttempt = Date.now() + 10000;

            breaker.reset();

            expect(breaker.state).toBe('CLOSED');
            expect(breaker.failureCount).toBe(0);
            expect(breaker.nextAttempt).toBeNull();
        });
    });

    describe('forceOpen', () => {
        it('should force circuit to open', () => {
            breaker.forceOpen();

            expect(breaker.state).toBe('OPEN');
            expect(breaker.nextAttempt).toBeDefined();
        });
    });

    describe('forceClose', () => {
        it('should force circuit to close', () => {
            breaker.state = 'OPEN';
            breaker.forceClose();

            expect(breaker.state).toBe('CLOSED');
            expect(breaker.failureCount).toBe(0);
        });
    });
});

describe('CircuitBreakerRegistry', () => {
    let registry;

    beforeEach(() => {
        registry = new CircuitBreakerRegistry();
    });

    describe('get', () => {
        it('should create new breaker if not exists', () => {
            const breaker = registry.get('new-breaker');

            expect(breaker).toBeInstanceOf(CircuitBreaker);
            expect(breaker.name).toBe('new-breaker');
        });

        it('should return existing breaker', () => {
            const first = registry.get('existing');
            const second = registry.get('existing');

            expect(first).toBe(second);
        });
    });

    describe('getAllStatuses', () => {
        it('should return all breaker statuses', () => {
            registry.get('breaker1');
            registry.get('breaker2');

            const statuses = registry.getAllStatuses();

            expect(statuses).toHaveProperty('breaker1');
            expect(statuses).toHaveProperty('breaker2');
        });
    });

    describe('resetAll', () => {
        it('should reset all breakers', () => {
            const breaker1 = registry.get('breaker1');
            const breaker2 = registry.get('breaker2');
            
            breaker1.forceOpen();
            breaker2.forceOpen();

            registry.resetAll();

            expect(breaker1.state).toBe('CLOSED');
            expect(breaker2.state).toBe('CLOSED');
        });
    });
});

describe('Pre-configured Breakers', () => {
    it('should have cloudinary breaker', () => {
        expect(cloudinaryBreaker).toBeInstanceOf(CircuitBreaker);
        expect(cloudinaryBreaker.name).toBe('cloudinary');
    });

    it('should have database breaker', () => {
        expect(databaseBreaker).toBeInstanceOf(CircuitBreaker);
        expect(databaseBreaker.name).toBe('database');
    });

    it('cloudinary breaker should have correct config', () => {
        expect(cloudinaryBreaker.failureThreshold).toBe(3);
        expect(cloudinaryBreaker.timeout).toBe(10000);
    });

    it('database breaker should have correct config', () => {
        expect(databaseBreaker.failureThreshold).toBe(5);
        expect(databaseBreaker.timeout).toBe(15000);
    });
});
