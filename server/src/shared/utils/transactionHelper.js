const mongoose = require('mongoose');

/**
 * Transaction Helper
 * 
 * Provides retry logic for MongoDB transactions with exponential backoff.
 * Handles transient transaction errors automatically.
 * 
 * @param {Function} operation - Async function that takes a session parameter
 * @param {Object} options - Transaction options
 * @param {number} options.maxRetries - Maximum retry attempts (default: 3)
 * @param {number} options.baseDelay - Base delay in ms for backoff (default: 100)
 * @returns {Promise<any>} - Result of the operation
 */

const withTransaction = async (operation, options = {}) => {
    const {
        maxRetries = 3,
        baseDelay = 100
    } = options;

    let retryCount = 0;

    while (retryCount < maxRetries) {
        const session = await mongoose.startSession();
        
        try {
            session.startTransaction({
                readConcern: { level: 'snapshot' },
                writeConcern: { w: 'majority' },
                maxCommitTimeMS: 10000 // 10 second timeout
            });

            const result = await operation(session);
            
            await session.commitTransaction();
            
            return result;

        } catch (error) {
            await session.abortTransaction();

            // Check if this is a transient transaction error that can be retried
            const isTransientError = 
                error.codeName === 'TransientTransactionError' ||
                error.codeName === 'NoSuchTransaction' ||
                error.codeName === 'OperationFailed';

            if (isTransientError && retryCount < maxRetries - 1) {
                retryCount++;
                
                // Exponential backoff with jitter
                const delay = baseDelay * Math.pow(2, retryCount) + Math.random() * 100;
                console.log(`⚠️ Transient transaction error, retrying in ${Math.round(delay)}ms... (attempt ${retryCount}/${maxRetries})`);
                
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            throw error;

        } finally {
            await session.endSession();
        }
    }

    throw new Error('Transaction failed after maximum retry attempts');
};

/**
 * Execute an operation with a lock (pessimistic locking pattern)
 * 
 * @param {string} resource - Resource identifier to lock
 * @param {Function} operation - Async function to execute while holding lock
 * @param {number} timeout - Lock timeout in ms
 * @returns {Promise<any>}
 */
const withLock = async (resource, operation, timeout = 5000) => {
    const session = await mongoose.startSession();
    
    try {
        session.startTransaction();

        // Find and lock the resource using findOneAndUpdate with upsert
        const lockDoc = await mongoose.model('Lock').findOneAndUpdate(
            { 
                resource,
                $or: [
                    { expiresAt: { $exists: false } },
                    { expiresAt: { $lt: new Date() } }
                ]
            },
            {
                $set: {
                    resource,
                    lockedAt: new Date(),
                    expiresAt: new Date(Date.now() + timeout)
                }
            },
            {
                upsert: true,
                new: true,
                session
            }
        );

        if (!lockDoc) {
            throw new Error(`Could not acquire lock for resource: ${resource}`);
        }

        const result = await operation(session);
        
        // Release lock
        await mongoose.model('Lock').findOneAndUpdate(
            { _id: lockDoc._id },
            { $set: { releasedAt: new Date() } },
            { session }
        );

        await session.commitTransaction();
        
        return result;

    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        await session.endSession();
    }
};

module.exports = {
    withTransaction,
    withLock
};
