const mongoose = require('mongoose');
const { connect } = require('mongoose');
const config = require('./src/shared/config');
const logger = require('./src/shared/utils/logger');
const cacheService = require('./src/shared/utils/cacheService');
const app = require('./src/app');

// Workers & Subscribers
require('./workers/cleanupWorker');
require('./subscribers/loggingSubscriber');

let server;

const startServer = async () => {
    try {
        // Initialize cache service
        await cacheService.initialize();
        
        // Connect to Database
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

        // ============ Error Handling & Graceful Shutdown ============
        
        process.on('uncaughtException', (error) => {
            logger.error('❌ Uncaught Exception:', error);
            gracefulShutdown();
        });

        process.on('unhandledRejection', (reason, promise) => {
            logger.error('❌ Unhandled Rejection at:', { promise, reason });
        });

        const gracefulShutdown = async () => {
            logger.info('🛑 Received shutdown signal, closing server...');
            
            if (server) {
                server.close(async () => {
                    logger.info('✅ HTTP server closed');
                    
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
                    logger.error('❌ Forcefully shutting down');
                    process.exit(1);
                }, 10000);
            }
        };

        process.on('SIGTERM', gracefulShutdown);
        process.on('SIGINT', gracefulShutdown);

    } catch (error) {
        logger.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

module.exports = app;
