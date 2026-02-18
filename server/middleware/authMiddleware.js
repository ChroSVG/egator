



const jwt = require('jsonwebtoken');
const HttpError = require('../models/errorModel');


// Authentication Middleware
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization 
        || req.headers.Authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(new HttpError("No token provided", 401));
        }

        const token = authHeader.split(' ')[1];
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                return next(new HttpError("Invalid token", 401));
            }
            req.user = decoded.user;
            next();
        });
    } catch (error) {
        return next(new HttpError(error, 500));
    }
};