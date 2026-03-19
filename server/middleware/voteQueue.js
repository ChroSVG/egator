/**
 * Vote Queue Middleware
 * 
 * Processes votes sequentially per election to prevent race conditions.
 * Uses an in-memory queue for simple single-server deployments.
 * 
 * For multi-server deployments, consider using Redis-based queues (bull)
 * or distributed locking (redlock).
 */

const voteQueues = new Map(); // Map<electionId, Array<{operation, resolve, reject}>>
const processingFlags = new Map(); // Map<electionId, boolean>

/**
 * Process a single queue for an election
 */
const processQueue = async (electionId) => {
    const queue = voteQueues.get(electionId);
    const isProcessing = processingFlags.get(electionId);

    if (!queue || queue.length === 0 || isProcessing) {
        return;
    }

    processingFlags.set(electionId, true);

    while (queue.length > 0) {
        const { operation, resolve, reject } = queue[0];
        
        try {
            const result = await operation();
            resolve(result);
        } catch (error) {
            reject(error);
        } finally {
            queue.shift(); // Remove processed item
        }
    }

    processingFlags.set(electionId, false);
    
    // Clean up empty queues
    if (queue.length === 0) {
        voteQueues.delete(electionId);
        processingFlags.delete(electionId);
    }
};

/**
 * Vote Queue Middleware
 * 
 * Wraps vote operations in a queue to ensure sequential processing per election.
 */
const voteQueueMiddleware = (req, res, next) => {
    // Extract election ID from request body or params
    const electionId = req.body.selectedElectionId || req.params.id;

    if (!electionId) {
        return next(new Error("Election ID is required for voting"));
    }

    // Initialize queue if it doesn't exist
    if (!voteQueues.has(electionId)) {
        voteQueues.set(electionId, []);
    }

    const queue = voteQueues.get(electionId);

    // Wrap the response methods to capture when response is sent
    const originalJson = res.json.bind(res);
    let isQueued = false;

    res.json = (body) => {
        return originalJson(body);
    };

    // Create a promise that will be resolved when the vote is processed
    const queuePromise = new Promise((resolve, reject) => {
        queue.push({
            operation: () => {
                // Store resolve/reject to be called after vote processing
                return new Promise((opResolve, opReject) => {
                    // Override res.json temporarily to capture the result
                    res.json = (body) => {
                        opResolve(body);
                        return originalJson(body);
                    };
                    
                    // Override next to capture errors
                    const originalNext = next;
                    req._next = (error) => {
                        opReject(error);
                        return originalNext(error);
                    };

                    // Call the actual vote handler
                    next();
                });
            },
            resolve,
            reject
        });

        isQueued = true;
    });

    // Start processing if not already processing
    if (!processingFlags.get(electionId)) {
        processQueue(electionId);
    }

    // If queue position > 1, inform client
    if (queue.length > 1) {
        res.set('X-Queue-Position', queue.length.toString());
        res.set('X-Queue-Status', 'queued');
    }
};

/**
 * Get queue statistics (for monitoring)
 */
const getQueueStats = () => {
    const stats = {
        totalQueues: voteQueues.size,
        totalPending: 0,
        queues: []
    };

    voteQueues.forEach((queue, electionId) => {
        stats.totalPending += queue.length;
        stats.queues.push({
            electionId,
            pending: queue.length,
            processing: processingFlags.get(electionId) || false
        });
    });

    return stats;
};

/**
 * Clear all queues (use with caution)
 */
const clearAllQueues = () => {
    voteQueues.clear();
    processingFlags.clear();
};

module.exports = {
    voteQueueMiddleware,
    getQueueStats,
    clearAllQueues
};
