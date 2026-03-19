/**
 * Circuit Breaker
 * 
 * Implements the Circuit Breaker Pattern to prevent cascading failures.
 * 
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Circuit tripped, requests fail immediately without calling service
 * - HALF-OPEN: Testing if service recovered, limited requests allowed
 * 
 * Use cases:
 * - External API calls (Cloudinary, payment gateways)
 * - Database operations when experiencing issues
 * - Any operation that might fail repeatedly
 */

class CircuitBreaker {
    constructor(name, options = {}) {
        this.name = name;
        this.failureThreshold = options.failureThreshold || 5;
        this.successThreshold = options.successThreshold || 2;
        this.timeout = options.timeout || 60000; // 1 minute
        this.monitoringPeriod = options.monitoringPeriod || 10000; // 10 seconds
        
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
        this.lastFailureTime = null;
        this.nextAttempt = null;
        
        // Statistics
        this.stats = {
            totalCalls: 0,
            successfulCalls: 0,
            failedCalls: 0,
            rejectedCalls: 0,
            timeouts: 0
        };
    }

    /**
     * Execute operation with circuit breaker protection
     * @param {Function} operation - Async operation to execute
     * @param {object} options - Execution options
     * @returns {Promise<any>}
     */
    async execute(operation, options = {}) {
        const { timeout = this.timeout, fallback = null } = options;
        
        this.stats.totalCalls++;

        // Check if circuit is open
        if (this.state === 'OPEN') {
            if (this.shouldAttemptReset()) {
                this.state = 'HALF-OPEN';
                console.log(`⚡ Circuit ${this.name}: OPEN → HALF-OPEN (testing recovery)`);
            } else {
                this.stats.rejectedCalls++;
                console.log(`🚫 Circuit ${this.name}: OPEN - rejecting request`);
                throw new Error(`Circuit breaker is OPEN for ${this.name}. Try again later.`);
            }
        }

        const startTime = Date.now();

        try {
            // Execute with timeout
            const result = await Promise.race([
                operation(),
                this.createTimeout(timeout)
            ]);

            // Success
            this.onSuccess();
            this.stats.successfulCalls++;
            
            const duration = Date.now() - startTime;
            console.log(`✅ Circuit ${this.name}: Success in ${duration}ms (state: ${this.state})`);
            
            return result;

        } catch (error) {
            this.stats.failedCalls++;
            
            if (error.message === 'TIMEOUT') {
                this.stats.timeouts++;
                console.log(`⏱️ Circuit ${this.name}: Timeout after ${timeout}ms`);
            } else {
                console.log(`❌ Circuit ${this.name}: Failed - ${error.message}`);
            }
            
            this.onFailure();
            
            // Try fallback if provided
            if (fallback) {
                console.log(`🔄 Circuit ${this.name}: Using fallback`);
                return typeof fallback === 'function' ? await fallback(error) : fallback;
            }
            
            throw error;
        }
    }

    /**
     * Handle successful operation
     */
    onSuccess() {
        this.failureCount = 0;

        if (this.state === 'HALF-OPEN') {
            this.successCount++;
            if (this.successCount >= this.successThreshold) {
                this.state = 'CLOSED';
                this.successCount = 0;
                console.log(`✅ Circuit ${this.name}: HALF-OPEN → CLOSED (recovered)`);
            }
        }
    }

    /**
     * Handle failed operation
     */
    onFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();

        if (this.state === 'HALF-OPEN') {
            this.state = 'OPEN';
            this.nextAttempt = Date.now() + this.timeout;
            console.log(`🚫 Circuit ${this.name}: HALF-OPEN → OPEN (recovery failed)`);
        } else if (this.failureCount >= this.failureThreshold) {
            this.state = 'OPEN';
            this.nextAttempt = Date.now() + this.timeout;
            console.log(`🚫 Circuit ${this.name}: CLOSED → OPEN (threshold reached: ${this.failureCount})`);
        }
    }

    /**
     * Check if we should attempt to reset circuit
     * @returns {boolean}
     */
    shouldAttemptReset() {
        if (!this.nextAttempt) return true;
        return Date.now() >= this.nextAttempt;
    }

    /**
     * Create timeout promise
     * @param {number} ms - Timeout in milliseconds
     * @returns {Promise}
     */
    createTimeout(ms) {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error('TIMEOUT')), ms);
        });
    }

    /**
     * Get circuit breaker status
     * @returns {object}
     */
    getStatus() {
        return {
            name: this.name,
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
            nextAttempt: this.nextAttempt ? new Date(this.nextAttempt).toISOString() : null,
            stats: this.stats
        };
    }

    /**
     * Reset circuit breaker to initial state
     */
    reset() {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
        this.lastFailureTime = null;
        this.nextAttempt = null;
        console.log(`🔄 Circuit ${this.name}: Manually reset`);
    }

    /**
     * Force circuit to open state
     */
    forceOpen() {
        this.state = 'OPEN';
        this.nextAttempt = Date.now() + this.timeout;
        console.log(`🚫 Circuit ${this.name}: Forcefully opened`);
    }

    /**
     * Force circuit to closed state
     */
    forceClose() {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
        this.nextAttempt = null;
        console.log(`✅ Circuit ${this.name}: Forcefully closed`);
    }
}

/**
 * Circuit Breaker Registry
 * 
 * Manages multiple circuit breakers for different services.
 */
class CircuitBreakerRegistry {
    constructor() {
        this.breakers = new Map();
    }

    /**
     * Get or create circuit breaker
     * @param {string} name - Circuit breaker name
     * @param {object} options - Options
     * @returns {CircuitBreaker}
     */
    get(name, options = {}) {
        if (!this.breakers.has(name)) {
            this.breakers.set(name, new CircuitBreaker(name, options));
        }
        return this.breakers.get(name);
    }

    /**
     * Get all circuit breaker statuses
     * @returns {Array}
     */
    getAllStatuses() {
        const statuses = {};
        for (const [name, breaker] of this.breakers) {
            statuses[name] = breaker.getStatus();
        }
        return statuses;
    }

    /**
     * Reset all circuit breakers
     */
    resetAll() {
        for (const breaker of this.breakers.values()) {
            breaker.reset();
        }
    }
}

// Singleton registry
const registry = new CircuitBreakerRegistry();

// Pre-configured circuit breakers
const cloudinaryBreaker = registry.get('cloudinary', {
    failureThreshold: 3,
    timeout: 10000,
    monitoringPeriod: 30000
});

const databaseBreaker = registry.get('database', {
    failureThreshold: 5,
    timeout: 15000,
    monitoringPeriod: 30000
});

module.exports = {
    CircuitBreaker,
    CircuitBreakerRegistry,
    registry,
    cloudinaryBreaker,
    databaseBreaker
};
