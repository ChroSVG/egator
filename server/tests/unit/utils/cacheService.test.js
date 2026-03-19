const cacheService = require('../../../utils/cacheService');

describe('CacheService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        cacheService.memoryCache.clear();
        cacheService.useRedis = false; // Test memory cache by default
    });

    describe('getOrSet', () => {
        it('should return cached value if exists', async () => {
            const fetchFn = jest.fn().mockResolvedValue('new-data');
            cacheService.memoryCache.set('test-key', {
                data: 'cached-data',
                expiresAt: Date.now() + 10000
            });

            const result = await cacheService.getOrSet('test-key', fetchFn);

            expect(result).toBe('cached-data');
            expect(fetchFn).not.toHaveBeenCalled();
        });

        it('should fetch and cache if not exists', async () => {
            const fetchFn = jest.fn().mockResolvedValue('fetched-data');

            const result = await cacheService.getOrSet('test-key', fetchFn, 60);

            expect(result).toBe('fetched-data');
            expect(fetchFn).toHaveBeenCalled();
            expect(cacheService.memoryCache.has('test-key')).toBe(true);
        });

        it('should handle expired cache', async () => {
            const fetchFn = jest.fn().mockResolvedValue('new-data');
            cacheService.memoryCache.set('test-key', {
                data: 'old-data',
                expiresAt: Date.now() - 1000 // Expired
            });

            const result = await cacheService.getOrSet('test-key', fetchFn);

            expect(result).toBe('new-data');
            expect(fetchFn).toHaveBeenCalled();
        });
    });

    describe('get', () => {
        it('should return null for non-existent key', async () => {
            const result = await cacheService.get('non-existent');
            expect(result).toBeNull();
        });

        it('should return cached value', async () => {
            cacheService.memoryCache.set('test-key', {
                data: { name: 'test' },
                expiresAt: Date.now() + 10000
            });

            const result = await cacheService.get('test-key');

            expect(result).toEqual({ name: 'test' });
        });
    });

    describe('set', () => {
        it('should set value in cache', async () => {
            await cacheService.set('test-key', { data: 'value' }, 60);

            const cached = cacheService.memoryCache.get('test-key');
            expect(cached.data).toEqual({ data: 'value' });
            expect(cached.expiresAt).toBeGreaterThan(Date.now());
        });
    });

    describe('delete', () => {
        it('should delete key from cache', async () => {
            cacheService.memoryCache.set('test-key', {
                data: 'value',
                expiresAt: Date.now() + 10000
            });

            await cacheService.delete('test-key');

            expect(cacheService.memoryCache.has('test-key')).toBe(false);
        });

        it('should not throw if key does not exist', async () => {
            await expect(cacheService.delete('non-existent'))
                .resolves.not.toThrow();
        });
    });

    describe('invalidateElection', () => {
        it('should delete all election-related cache keys', async () => {
            cacheService.memoryCache.set('election:id1:results', {
                data: {}, expiresAt: Date.now() + 10000
            });
            cacheService.memoryCache.set('elections:true:1:10', {
                data: {}, expiresAt: Date.now() + 10000
            });

            await cacheService.invalidateElection('id1');

            expect(cacheService.memoryCache.has('election:id1:results')).toBe(false);
        });
    });

    describe('invalidateCandidate', () => {
        it('should delete all candidate-related cache keys', async () => {
            cacheService.memoryCache.set('candidate:id1', {
                data: {}, expiresAt: Date.now() + 10000
            });
            cacheService.memoryCache.set('candidates:all:1:10', {
                data: {}, expiresAt: Date.now() + 10000
            });

            await cacheService.invalidateCandidate('id1');

            expect(cacheService.memoryCache.has('candidate:id1')).toBe(false);
        });
    });

    describe('clear', () => {
        it('should clear all cache', async () => {
            cacheService.memoryCache.set('key1', { data: 1, expiresAt: Date.now() + 10000 });
            cacheService.memoryCache.set('key2', { data: 2, expiresAt: Date.now() + 10000 });

            await cacheService.clear();

            expect(cacheService.memoryCache.size).toBe(0);
        });
    });

    describe('getStats', () => {
        it('should return memory cache stats', async () => {
            cacheService.memoryCache.set('key1', { data: 1, expiresAt: Date.now() + 10000 });
            cacheService.memoryCache.set('key2', { data: 2, expiresAt: Date.now() + 10000 });

            const stats = await cacheService.getStats();

            expect(stats.type).toBe('Memory');
            expect(stats.keys).toBe(2);
        });
    });

    describe('matchesPattern', () => {
        it('should match exact string', () => {
            expect(cacheService.matchesPattern('test:key', 'test:key')).toBe(true);
        });

        it('should match wildcard pattern', () => {
            expect(cacheService.matchesPattern('test:key:1', 'test:*')).toBe(true);
            expect(cacheService.matchesPattern('test:key:2', 'test:*')).toBe(true);
        });

        it('should not match different pattern', () => {
            expect(cacheService.matchesPattern('other:key', 'test:*')).toBe(false);
        });
    });
});
