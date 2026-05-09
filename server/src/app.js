const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const fileUpload = require('express-fileupload');
const path = require('path');

const config = require('./shared/config');
const logger = require('./shared/utils/logger');
const { errorMiddleware, notFoundHandler } = require('./shared/middleware/errorMiddleware');
const { generalLimiter } = require('./shared/middleware/rateLimitMiddleware');

// Route Imports
const authRoutes = require('./features/auth/auth.routes');
const electionRoutes = require('./features/election/election.routes');
const candidateRoutes = require('./features/candidate/candidate.routes');

const app = express();

// ============ Security & Optimization ============
app.use(helmet({
    crossOriginResourcePolicy: false, // Required for Cloudinary images
}));
app.use(cors({
    origin: config.cors.allowedOrigins,
    credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: '/tmp/',
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
}));

// ============ Request Logging ============
if (config.env !== 'test') {
    app.use(morgan('combined', { stream: logger.stream }));
}

// ============ Rate Limiting ============
app.use(generalLimiter);

// ============ API Routes ============
app.use('/api/v1/voters', authRoutes);
app.use('/api/v1/elections', electionRoutes);
app.use('/api/v1/candidates', candidateRoutes);

// Redirect /api to /api/v1
app.get('/api', (req, res) => res.redirect('/api/v1'));
app.get('/api/v1', (req, res) => res.json({ message: 'Welcome to Egator API v1' }));

// ============ Health Check ============
app.get('/api/v1/health', async (req, res) => {
    const { registry } = require('./shared/utils/circuitBreaker');
    res.json({
        status: 'UP',
        timestamp: new Date(),
        environment: config.env,
        circuitBreakers: registry ? Array.from(registry.keys()) : []
    });
});

// ============ Error Handling ============
app.use(notFoundHandler);
app.use(errorMiddleware);

module.exports = app;
