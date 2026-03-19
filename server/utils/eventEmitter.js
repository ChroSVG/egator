const EventEmitter = require('events');

/**
 * Application Event Emitter
 * 
 * Implements the Observer Pattern - allows objects to subscribe to events
 * and be notified when those events occur.
 * 
 * Use cases:
 * - Send notifications when votes are cast
 * - Update analytics/real-time dashboards
 * - Trigger audit logging
 * - Send confirmation emails
 * - Invalidate caches
 */
class AppEventEmitter extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(100); // Allow up to 100 subscribers per event
    }

    /**
     * Emit a vote cast event
     * @param {object} data - Event data
     */
    emitVoteCast(data) {
        this.emit('vote:cast', {
            type: 'vote:cast',
            timestamp: new Date().toISOString(),
            ...data
        });
    }

    /**
     * Emit an election created event
     * @param {object} data - Event data
     */
    emitElectionCreated(data) {
        this.emit('election:created', {
            type: 'election:created',
            timestamp: new Date().toISOString(),
            ...data
        });
    }

    /**
     * Emit an election updated event
     * @param {object} data - Event data
     */
    emitElectionUpdated(data) {
        this.emit('election:updated', {
            type: 'election:updated',
            timestamp: new Date().toISOString(),
            ...data
        });
    }

    /**
     * Emit an election deleted event
     * @param {object} data - Event data
     */
    emitElectionDeleted(data) {
        this.emit('election:deleted', {
            type: 'election:deleted',
            timestamp: new Date().toISOString(),
            ...data
        });
    }

    /**
     * Emit a candidate created event
     * @param {object} data - Event data
     */
    emitCandidateCreated(data) {
        this.emit('candidate:created', {
            type: 'candidate:created',
            timestamp: new Date().toISOString(),
            ...data
        });
    }

    /**
     * Emit a candidate deleted event
     * @param {object} data - Event data
     */
    emitCandidateDeleted(data) {
        this.emit('candidate:deleted', {
            type: 'candidate:deleted',
            timestamp: new Date().toISOString(),
            ...data
        });
    }

    /**
     * Emit a user registered event
     * @param {object} data - Event data
     */
    emitUserRegistered(data) {
        this.emit('user:registered', {
            type: 'user:registered',
            timestamp: new Date().toISOString(),
            ...data
        });
    }

    /**
     * Emit a user login event
     * @param {object} data - Event data
     */
    emitUserLogin(data) {
        this.emit('user:login', {
            type: 'user:login',
            timestamp: new Date().toISOString(),
            ...data
        });
    }

    /**
     * Emit an error event
     * @param {object} data - Event data
     */
    emitError(data) {
        this.emit('error', {
            type: 'error',
            timestamp: new Date().toISOString(),
            ...data
        });
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} listener - Callback function
     * @returns {Function} Unsubscribe function
     */
    subscribe(event, listener) {
        this.on(event, listener);
        
        // Return unsubscribe function
        return () => {
            this.off(event, listener);
        };
    }

    /**
     * Subscribe to an event once
     * @param {string} event - Event name
     * @param {Function} listener - Callback function
     */
    subscribeOnce(event, listener) {
        this.once(event, listener);
    }

    /**
     * Get subscriber count for an event
     * @param {string} event - Event name
     * @returns {number}
     */
    getSubscriberCount(event) {
        return this.listenerCount(event);
    }

    /**
     * Get all event names with subscribers
     * @returns {Array<string>}
     */
    getEvents() {
        return this.eventNames();
    }

    /**
     * Clear all subscribers for an event
     * @param {string} event - Event name
     */
    clearSubscribers(event) {
        this.removeAllListeners(event);
    }

    /**
     * Clear all subscribers
     */
    clearAllSubscribers() {
        this.removeAllListeners();
    }
}

// Singleton instance
const eventEmitter = new AppEventEmitter();

module.exports = eventEmitter;
