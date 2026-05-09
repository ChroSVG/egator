require('dotenv').config();

const config = {
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 5000,
    db: {
        url: process.env.MONGO_URL,
    },
    jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    },
    cloudinary: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        apiSecret: process.env.CLOUDINARY_API_SECRET,
    },
    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
    },
    admin: {
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
    },
    worker: {
        cleanupSchedule: process.env.CLEANUP_SCHEDULE || '0 * * * *', // Every hour
        maxRetryAttempts: parseInt(process.env.MAX_CLEANUP_RETRIES) || 5,
    },
    cors: {
        allowedOrigins: process.env.ALLOWED_ORIGINS 
            ? process.env.ALLOWED_ORIGINS.split(',') 
            : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'],
    }
};

// Simple validation
const requiredConfigs = [
    'db.url',
    'jwt.secret',
    'cloudinary.cloudName',
    'cloudinary.apiKey',
    'cloudinary.apiSecret'
];

requiredConfigs.forEach(path => {
    const parts = path.split('.');
    let val = config;
    for (const part of parts) {
        val = val[part];
    }
    if (!val && config.env !== 'test') {
        console.warn(`⚠️ Warning: Configuration "${path}" is missing!`);
    }
});

module.exports = config;
