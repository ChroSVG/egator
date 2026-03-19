const eventEmitter = require('../utils/eventEmitter');

/**
 * Event Subscribers - Logging
 * 
 * Subscribes to application events and logs them for audit/analytics.
 */

// Log vote cast events
eventEmitter.subscribe('vote:cast', (data) => {
    console.log('🗳️  VOTE CAST:', {
        voter: data.voterId,
        candidate: data.candidateId,
        election: data.electionId,
        timestamp: data.timestamp
    });
});

// Log election events
eventEmitter.subscribe('election:created', (data) => {
    console.log('📋 ELECTION CREATED:', {
        electionId: data.electionId,
        title: data.title,
        createdBy: data.adminId,
        timestamp: data.timestamp
    });
});

eventEmitter.subscribe('election:deleted', (data) => {
    console.log('🗑️  ELECTION DELETED:', {
        electionId: data.electionId,
        title: data.title,
        timestamp: data.timestamp
    });
});

// Log candidate events
eventEmitter.subscribe('candidate:created', (data) => {
    console.log('👤 CANDIDATE CREATED:', {
        candidateId: data.candidateId,
        name: data.name,
        election: data.electionId,
        timestamp: data.timestamp
    });
});

// Log user events
eventEmitter.subscribe('user:registered', (data) => {
    console.log('📝 USER REGISTERED:', {
        userId: data.userId,
        email: data.email,
        timestamp: data.timestamp
    });
});

eventEmitter.subscribe('user:login', (data) => {
    console.log('🔐 USER LOGIN:', {
        userId: data.userId,
        email: data.email,
        timestamp: data.timestamp
    });
});

// Log errors
eventEmitter.subscribe('error', (data) => {
    console.error('❌ ERROR:', {
        message: data.message,
        stack: data.stack,
        context: data.context,
        timestamp: data.timestamp
    });
});

module.exports = eventEmitter;
