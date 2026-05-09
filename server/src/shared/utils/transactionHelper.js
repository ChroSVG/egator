const mongoose = require('mongoose');

/**
 * Transaction Helper
 * 
 * Provides retry logic for MongoDB transactions with exponential backoff.
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
                maxCommitTimeMS: 10000
            });

            const result = await operation(session);
            
            await session.commitTransaction();
            
            return result;

        } catch (error) {
            await session.abortTransaction();

            const isTransientError = 
                error.codeName === 'TransientTransactionError' ||
                error.codeName === 'NoSuchTransaction' ||
                error.codeName === 'OperationFailed';

            if (isTransientError && retryCount < maxRetries - 1) {
                retryCount++;
                const delay = baseDelay * Math.pow(2, retryCount) + Math.random() * 100;
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

module.exports = {
    withTransaction
};
