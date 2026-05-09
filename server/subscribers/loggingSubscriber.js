const eventEmitter = require('../utils/eventEmitter');
const logger = require('../utils/logger');

/**
 * Event Subscribers - Logging
 * 
 * Subscribes to application events and logs them for audit/analytics.
 */

// Log vote cast events
eventEmitter.subscribe('vote:cast', (data) => {
    logger.info('🗳️  VOTE CAST', data);
});

// Log election events
eventEmitter.subscribe('election:created', (data) => {
    logger.info('📋 ELECTION CREATED', data);
});

eventEmitter.subscribe('election:deleted', (data) => {
    logger.info('🗑️  ELECTION DELETED', data);
});

// Log candidate events
eventEmitter.subscribe('candidate:created', (data) => {
    logger.info('👤 CANDIDATE CREATED', data);
});

// Log user events
eventEmitter.subscribe('user:registered', (data) => {
    logger.info('📝 USER REGISTERED', data);
});

eventEmitter.subscribe('user:login', (data) => {
    logger.info('🔐 USER LOGIN', data);
});

// Log errors
eventEmitter.subscribe('error', (data) => {
    logger.error('❌ ERROR EVENT', data);
});

module.exports = eventEmitter;
