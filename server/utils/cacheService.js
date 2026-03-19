/**
 * Cache Service
 * 
 * Implements the Cache-Aside Pattern (Lazy Loading).
 * 
 * How it works:
 * 1. Check if data is in cache
 * 2. If yes, return cached data (cache hit)
 * 3. If no, fetch from database, store in cache, return data (cache miss)
 * 
 * Benefits:
 * - Reduces database load
 * - Improves response time for frequently accessed data
 * - Automatic expiration prevents stale data
 * 
 * Note: Requires Redis. Falls back to in-memory cache if Redis unavailable.
 */

class CacheService {
    constructor() {
        this.redis = null;
        this.memoryCache = new Map();
        this.useRedis = false;
        this.defaultTTL = 3600; // 1 hour in seconds
    }

    /**
     * Initialize Redis connection
     */
    async initialize() {
        try {
            // Only try to connect if Redis URL is provided
            if (!process.env.REDIS_URL) {
                console.log('ℹ️  Redis not configured, using in-memory cache');
                this.useRedis = false;
                return;
            }
            
            // Try to connect to Redis if available
            const Redis = require('ioredis');
            this.redis = new Redis(process.env.REDIS_URL);
            
            this.redis.on('error', (err) => {
                // Silently fall back to memory cache
                this.useRedis = false;
            });

            this.redis.on('connect', () => {
                console.log('✅ Connected to Redis');
                this.useRedis = true;
            });

            await this.redis.ping();
            this.useRedis = true;
        } catch (error) {
            this.useRedis = false;
        }
    }

    /**
     * Get value from cache or fetch and cache if not exists
     * @param {string} key - Cache key
     * @param {Function} fetchFn - Function to fetch data if not cached
     * @param {number} ttl - Time to live in seconds
     * @returns {Promise<any>}
     */
    async getOrSet(key, fetchFn, ttl = this.defaultTTL) {
        // Try to get from cache
        const cached = await this.get(key);
        if (cached !== null) {
            return cached;
        }

        // Cache miss - fetch data
        const data = await fetchFn();

        // Store in cache
        await this.set(key, data, ttl);

        return data;
    }

    /**
     * Get value from cache
     * @param {string} key - Cache key
     * @returns {Promise<any|null>}
     */
    async get(key) {
        try {
            if (this.useRedis && this.redis) {
                const cached = await this.redis.get(key);
                if (cached) {
                    console.log(`📦 Cache HIT (Redis): ${key}`);
                    return JSON.parse(cached);
                }
            } else {
                const cached = this.memoryCache.get(key);
                if (cached && cached.expiresAt > Date.now()) {
                    console.log(`📦 Cache HIT (Memory): ${key}`);
                    return cached.data;
                } else if (cached) {
                    // Expired
                    this.memoryCache.delete(key);
                }
            }
            console.log(`❌ Cache MISS: ${key}`);
            return null;
        } catch (error) {
            console.error('Cache get error:', error.message);
            return null;
        }
    }

    /**
     * Set value in cache
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {number} ttl - Time to live in seconds
     */
    async set(key, value, ttl = this.defaultTTL) {
        try {
            if (this.useRedis && this.redis) {
                await this.redis.setex(key, ttl, JSON.stringify(value));
            } else {
                this.memoryCache.set(key, {
                    data: value,
                    expiresAt: Date.now() + (ttl * 1000)
                });
            }
            console.log(`💾 Cache SET: ${key} (TTL: ${ttl}s)`);
        } catch (error) {
            console.error('Cache set error:', error.message);
        }
    }

    /**
     * Delete value from cache
     * @param {string} key - Cache key
     */
    async delete(key) {
        try {
            if (this.useRedis && this.redis) {
                await this.redis.del(key);
            } else {
                this.memoryCache.delete(key);
            }
            console.log(`🗑️  Cache DELETE: ${key}`);
        } catch (error) {
            console.error('Cache delete error:', error.message);
        }
    }

    /**
     * Delete multiple keys by pattern
     * @param {string} pattern - Key pattern (e.g., 'election:*')
     */
    async deleteByPattern(pattern) {
        try {
            if (this.useRedis && this.redis) {
                const keys = await this.redis.keys(pattern);
                if (keys.length > 0) {
                    await this.redis.del(...keys);
                    console.log(`🗑️  Cache DELETE by pattern: ${pattern} (${keys.length} keys)`);
                }
            } else {
                // For memory cache, iterate and delete matching keys
                for (const key of this.memoryCache.keys()) {
                    if (this.matchesPattern(key, pattern)) {
                        this.memoryCache.delete(key);
                    }
                }
            }
        } catch (error) {
            console.error('Cache deleteByPattern error:', error.message);
        }
    }

    /**
     * Simple pattern matcher for keys
     * @param {string} str - String to test
     * @param {string} pattern - Pattern with * wildcard
     * @returns {boolean}
     */
    matchesPattern(str, pattern) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return regex.test(str);
    }

    /**
     * Invalidate cache for election
     * @param {string} electionId - Election ID
     */
    async invalidateElection(electionId) {
        await this.deleteByPattern(`election:${electionId}*`);
        await this.deleteByPattern(`elections:*`);
    }

    /**
     * Invalidate cache for candidate
     * @param {string} candidateId - Candidate ID
     */
    async invalidateCandidate(candidateId) {
        await this.deleteByPattern(`candidate:${candidateId}*`);
        await this.deleteByPattern(`candidates:*`);
    }

    /**
     * Clear all cache
     */
    async clear() {
        try {
            if (this.useRedis && this.redis) {
                await this.redis.flushdb();
            } else {
                this.memoryCache.clear();
            }
            console.log('🧹 Cache cleared');
        } catch (error) {
            console.error('Cache clear error:', error.message);
        }
    }

    /**
     * Get cache statistics
     * @returns {Promise<object>}
     */
    async getStats() {
        if (this.useRedis && this.redis) {
            const info = await this.redis.info('stats');
            const dbSize = await this.redis.dbsize();
            return {
                type: 'Redis',
                hits: this.parseRedisInfo(info, 'keyspace_hits'),
                misses: this.parseRedisInfo(info, 'keyspace_misses'),
                keys: dbSize
            };
        } else {
            return {
                type: 'Memory',
                keys: this.memoryCache.size
            };
        }
    }

    /**
     * Parse Redis info output
     */
    parseRedisInfo(info, key) {
        const lines = info.split('\r\n');
        for (const line of lines) {
            if (line.startsWith(key + ':')) {
                return parseInt(line.split(':')[1]);
            }
        }
        return 0;
    }

    /**
     * Close Redis connection
     */
    async close() {
        if (this.redis) {
            await this.redis.quit();
        }
    }
}

// Singleton instance
const cacheService = new CacheService();

module.exports = cacheService;
