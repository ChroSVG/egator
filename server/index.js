const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { connect } = require('mongoose');
require('dotenv').config();

const upload = require('express-fileupload');
const Routes = require('./routes/Routes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// ============ Security Middleware ============
// Helmet adds various security headers to HTTP responses
app.use(helmet({
    contentSecurityPolicy: false, // Disable for API
    crossOriginEmbedderPolicy: false,
}));

// ============ CORS Configuration ============
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:3000'];

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
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined')); // Use 'dev' for colorful dev output
}

// ============ Request ID & Timing ============
app.use((req, res, next) => {
    // Add request ID
    req.id = require('uuid').v4();
    res.set('X-Request-Id', req.id);
    
    // Track response time
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        res.set('X-Response-Time', `${duration}ms`);
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
app.use('/api', Routes);

// ============ Health Check ============
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
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
        await connect(process.env.MONGO_URL, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log('✅ Connected to MongoDB');

        const PORT = process.env.PORT || 5000;
        server = app.listen(PORT, () => {
            console.log(`🚀 Server is running on port ${PORT}`);
            console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
        });

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error('❌ Uncaught Exception:', error);
            gracefulShutdown();
        });

        process.on('unhandledRejection', (reason, promise) => {
            console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
        });

        // Graceful shutdown
        const gracefulShutdown = async () => {
            console.log('\n🛑 Received shutdown signal, closing server...');
            
            if (server) {
                server.close(async () => {
                    console.log('✅ HTTP server closed');
                    
                    try {
                        await connect.connection.close();
                        console.log('✅ MongoDB connection closed');
                        process.exit(0);
                    } catch (error) {
                        console.error('❌ Error closing MongoDB connection:', error);
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
