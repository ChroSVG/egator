const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const { connect } = require('mongoose');
const config = require('./config');

const upload = require('express-fileupload');
const Routes = require('./routes/Routes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const cacheService = require('./utils/cacheService');
// Di index.js
require('./workers/cleanupWorker');
// Initialize event subscribers (Observer Pattern)
// Initialize event subscribers (Observer Pattern)
require('./subscribers/loggingSubscriber');
const logger = require('./utils/logger');

const app = express();

// ============ Security Middleware ============
// Helmet adds various security headers to HTTP responses
app.use(helmet({
    contentSecurityPolicy: false, // Disable for API
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
}));

// ============ CORS Configuration ============
const allowedOrigins = config.cors.allowedOrigins;

app.use(cors({
    credentials: true,
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    exposedHeaders: ['X-Request-Id', 'X-Response-Time', 'X-Queue-Position', 'X-Queue-Status']
}));

// ============ Request Logging ============
// Morgan - HTTP request logger
if (config.env !== 'test') {
    app.use(morgan('combined', { stream: logger.stream }));
}

// ============ Request ID & Timing ============
app.use((req, res, next) => {
    // Add request ID
    req.id = require('uuid').v4();
    res.set('X-Request-Id', req.id);

    // Track response time
    const start = Date.now();
    
    // Use on-headers to set timing header before headers are sent
    res.on('header', () => {
        const duration = Date.now() - start;
        res.set('X-Response-Time', `${duration}ms`);
    });
    
    // Log after response is finished
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`, {
            requestId: req.id,
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`
        });
    });
    
    next();
});

// ============ Body Parsing ============
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============ File Upload ============
app.use(upload({
    limits: { fileSize: 1 * 1024 * 1024 }, // 1MB limit
    abortOnLimit: true,
    limitHandler: (req, res, next) => {
        next(new Error('File size exceeds 1MB limit'));
    }
}));

// ============ API Routes ============
app.use('/api/v1', Routes);

// Redirect /api to /api/v1
app.get('/api', (req, res) => res.redirect('/api/v1'));

// ============ Health Check ============
app.get('/api/v1/health', async (req, res) => {
    const { registry } = require('./utils/circuitBreaker');
    
    const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.env,
        services: {
            mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
            cache: cacheService.useRedis ? 'redis' : 'memory',
            circuitBreakers: registry.getAllStatuses()
        }
    };
    
    res.status(200).json(healthStatus);
});

// ============ Circuit Breaker Status ============
app.get('/api/admin/circuit-breakers', (req, res) => {
    const { registry } = require('./utils/circuitBreaker');
    res.json(registry.getAllStatuses());
});

// ============ Cache Stats ============
app.get('/api/admin/cache-stats', async (req, res) => {
    const stats = await cacheService.getStats();
    res.json(stats);
});

// ============ API Versioning (Optional) ============
// Future: app.use('/api/v1', Routes);

// ============ Error Handling ============
app.use(notFound);
app.use(errorHandler);

// ============ Graceful Shutdown ============
let server;

const startServer = async () => {
    try {
        // Initialize cache service
        await cacheService.initialize();
        
        await connect(config.db.url, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        logger.info('✅ Connected to MongoDB');

        const PORT = config.port;
        server = app.listen(PORT, () => {
            logger.info(`🚀 Server is running on port ${PORT}`);
            logger.info(`📍 Health check: http://localhost:${PORT}/api/v1/health`);
        });

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger.error('❌ Uncaught Exception:', error);
            gracefulShutdown();
        });

        process.on('unhandledRejection', (reason, promise) => {
            logger.error('❌ Unhandled Rejection at:', { promise, reason });
        });

        // Graceful shutdown
        const gracefulShutdown = async () => {
            logger.info('🛑 Received shutdown signal, closing server...');
            
            if (server) {
                server.close(async () => {
                    console.log('✅ HTTP server closed');
                    
                    try {
                        await mongoose.connection.close();
                        await cacheService.close();
                        logger.info('✅ Connections closed successfully');
                        
                        process.exit(0);
                    } catch (error) {
                        logger.error('❌ Error closing connections:', error);
                        process.exit(1);
                    }
                });

                // Force close after 10 seconds
                setTimeout(() => {
                    console.error('❌ Could not close connections in time, forcefully shutting down');
                    process.exit(1);
                }, 10000);
            }
        };

        process.on('SIGTERM', gracefulShutdown);
        process.on('SIGINT', gracefulShutdown);

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

module.exports = app;
