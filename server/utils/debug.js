/**
 * Debug Utility for Egator API
 * 
 * Provides debugging helpers for all layers
 * 
 * Usage:
 * const debug = require('./utils/debug');
 * 
 * // Enable debug
 * debug.enable('service');
 * 
 * // Log debug message
 * debug.log('service', 'Adding candidate', { candidateId, electionId });
 */

const fs = require('fs');
const path = require('path');

class Debugger {
    constructor() {
        this.enabled = new Set();
        this.colors = {
            service: '\x1b[36m',    // Cyan
            repository: '\x1b[33m', // Yellow
            controller: '\x1b[32m', // Green
            database: '\x1b[35m',   // Magenta
            error: '\x1b[31m',      // Red
            request: '\x1b[34m',    // Blue
            reset: '\x1b[0m'
        };
        
        // Load from environment
        if (process.env.DEBUG === 'true') {
            this.enableAll();
        }
    }

    enable(layer) {
        this.enabled.add(layer.toLowerCase());
    }

    disable(layer) {
        this.enabled.delete(layer.toLowerCase());
    }

    enableAll() {
        ['service', 'repository', 'controller', 'database', 'error', 'request'].forEach(l => this.enable(l));
    }

    disableAll() {
        this.enabled.clear();
    }

    isEnabled(layer) {
        return this.enabled.has(layer.toLowerCase()) || process.env.NODE_ENV === 'development';
    }

    log(layer, message, data = null) {
        if (!this.isEnabled(layer)) return;

        const timestamp = new Date().toISOString();
        const color = this.colors[layer] || this.colors.reset;
        const prefix = `[${timestamp}] [${layer.toUpperCase()}]`;

        let output = `${color}${prefix}${this.colors.reset} ${message}`;
        
        if (data) {
            output += '\n' + JSON.stringify(data, null, 2);
        }

        console.log(output);
        
        // Also log to file in production
        if (process.env.NODE_ENV === 'production') {
            this.logToFile(layer, message, data);
        }
    }

    logToFile(layer, message, data) {
        const logDir = path.join(__dirname, '..', 'logs');
        const logFile = path.join(logDir, `debug-${new Date().toISOString().split('T')[0]}.log`);

        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        const logEntry = {
            timestamp: new Date().toISOString(),
            layer,
            message,
            data
        };

        fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    }

    error(layer, message, error) {
        this.log(layer, `❌ ERROR: ${message}`, {
            error: error.message,
            stack: error.stack,
            ...(error.data || {})
        });
    }

    time(label) {
        if (!this.isEnabled('performance')) return () => {};
        
        const start = Date.now();
        return () => {
            const duration = Date.now() - start;
            this.log('performance', `${label}: ${duration}ms`);
        };
    }

    // Request/Response debugging
    request(req) {
        if (!this.isEnabled('request')) return;
        
        this.log('request', `${req.method} ${req.path}`, {
            query: req.query,
            params: req.params,
            body: req.body,
            user: req.user?.email || 'anonymous'
        });
    }

    response(res, duration) {
        if (!this.isEnabled('request')) return;
        
        this.log('request', `Response ${res.statusCode}`, {
            duration: `${duration}ms`
        });
    }

    // Database query debugging
    query(collection, operation, filter) {
        if (!this.isEnabled('database')) return;
        
        this.log('database', `${collection}.${operation}`, {
            filter,
            timestamp: new Date().toISOString()
        });
    }

    // Service method debugging
    service(serviceName, methodName, params) {
        if (!this.isEnabled('service')) return;
        
        this.log('service', `${serviceName}.${methodName}`, {
            params
        });
    }

    // Relationship debugging
    relationship(type, from, to, action) {
        if (!this.isEnabled('service')) return;
        
        this.log('service', `Relationship ${action}`, {
            type,
            from,
            to
        });
    }
}

// Singleton instance
const debug = new Debugger();

// Export middleware
debug.middleware = (req, res, next) => {
    const start = Date.now();
    
    debug.request(req);
    
    res.on('finish', () => {
        debug.response(res, Date.now() - start);
    });
    
    next();
};

// Export MongoDB debug plugin
debug.mongoPlugin = () => {
    if (!debug.isEnabled('database')) return;
    
    return (collectionName, method, query, doc) => {
        debug.log('database', `${collectionName}.${method}`, {
            query: JSON.parse(JSON.stringify(query)),
            doc: doc ? JSON.parse(JSON.stringify(doc)) : null
        });
    };
};

module.exports = debug;
