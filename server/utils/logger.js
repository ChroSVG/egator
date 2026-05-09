const winston = require('winston');
const path = require('path');
const config = require('../config');

const { combine, timestamp, json, colorize, printf, errors } = winston.format;

// Custom log format for development
const devFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (metadata && Object.keys(metadata).length > 0 && level !== 'error') {
        msg += ` ${JSON.stringify(metadata)}`;
    }
    if (stack) {
        msg += `\n${stack}`;
    }
    return msg;
});

const logger = winston.createLogger({
    level: config.env === 'development' ? 'debug' : 'info',
    format: combine(
        errors({ stack: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        config.env === 'development' ? combine(colorize(), devFormat) : json()
    ),
    defaultMeta: { service: 'egator-service' },
    transports: [
        // Write all logs with level 'error' and below to 'error.log'
        new winston.transports.File({ 
            filename: path.join(__dirname, '../logs/error.log'), 
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        // Write all logs with level 'info' and below to 'combined.log'
        new winston.transports.File({ 
            filename: path.join(__dirname, '../logs/combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
    ],
});

// If we're in development, also log to the console
if (config.env !== 'production') {
    logger.add(new winston.transports.Console());
}

// Create a stream for morgan
logger.stream = {
    write: (message) => logger.info(message.trim()),
};

module.exports = logger;
