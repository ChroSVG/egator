const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const VoterRepository = require('../repositories/voterRepository');
const eventEmitter = require('../utils/eventEmitter');
const HttpError = require('../models/errorModel');
const config = require('../config');

/**
 * Auth Service
 * 
 * Handles authentication and authorization logic.
 * Implements Service Layer pattern - business logic separated from controllers.
 */
class AuthService {
    constructor(voterRepository = null) {
        this.voterRepository = voterRepository || new VoterRepository();
        this.jwtSecret = config.jwt.secret;
        this.jwtExpiresIn = config.jwt.expiresIn;
    }

    /**
     * Register a new voter
     * @param {object} data - Registration data
     * @returns {Promise<object>}
     */
    async register(data) {
        const { fullName, email, password, password2 } = data;

        // Validate passwords match
        if (password !== password2) {
            throw new HttpError('Passwords do not match', 400);
        }

        // Check if email already exists
        const existingVoter = await this.voterRepository.findByEmail(email);
        if (existingVoter) {
            throw new HttpError('Voter with this email already exists', 409);
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create voter
        const voter = await this.voterRepository.create({
            fullName,
            email: email.toLowerCase(),
            password: hashedPassword,
            isAdmin: false
        });

        // Generate token
        const token = this.generateToken(voter);

        // Emit event
        eventEmitter.emitUserRegistered({
            userId: voter._id,
            email: voter.email,
            fullName: voter.fullName
        });

        return {
            voter: {
                id: voter._id,
                fullName: voter.fullName,
                email: voter.email,
                isAdmin: voter.isAdmin
            },
            token
        };
    }

    /**
     * Login voter
     * @param {object} credentials - Login credentials
     * @returns {Promise<object>}
     */
    async login(credentials) {
        const { email, password } = credentials;

        // Find voter by email
        const voter = await this.voterRepository.findByEmail(email);
        if (!voter) {
            throw new HttpError('Invalid credentials', 401);
        }

        // Verify password
        const isPasswordMatch = await bcrypt.compare(password, voter.password);
        if (!isPasswordMatch) {
            throw new HttpError('Invalid credentials', 401);
        }

        // Generate token
        const token = this.generateToken(voter);

        // Emit event
        eventEmitter.emitUserLogin({
            userId: voter._id,
            email: voter.email
        });

        return {
            token,
            voter: {
                id: voter._id,
                fullName: voter.fullName,
                email: voter.email,
                isAdmin: voter.isAdmin,
                votedElections: voter.votedElections
            }
        };
    }

    /**
     * Get voter by ID
     * @param {string} id - Voter ID
     * @returns {Promise<object>}
     */
    async getVoterById(id) {
        const voter = await this.voterRepository.findByIdSelective(id);
        
        if (!voter) {
            throw new HttpError('Voter not found', 404);
        }

        return voter;
    }

    /**
     * Generate JWT token
     * @param {object} voter - Voter object
     * @returns {string}
     */
    generateToken(voter) {
        return jwt.sign(
            { user: { id: voter._id, isAdmin: voter.isAdmin } },
            this.jwtSecret,
            { expiresIn: this.jwtExpiresIn }
        );
    }

    /**
     * Verify JWT token
     * @param {string} token - JWT token
     * @returns {object} Decoded token
     */
    verifyToken(token) {
        try {
            return jwt.verify(token, this.jwtSecret);
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new HttpError('Token expired, please login again', 401);
            }
            throw new HttpError('Invalid token', 401);
        }
    }

    /**
     * Create admin user (via seed script)
     * @param {object} data - Admin data
     * @returns {Promise<object>}
     */
    async createAdmin(data) {
        const { email, password, fullName } = data;

        // Check if admin already exists
        const existingAdmin = await this.voterRepository.findByEmail(email);
        if (existingAdmin) {
            if (existingAdmin.isAdmin) {
                return { message: 'Admin already exists', admin: existingAdmin };
            }
            // Update existing user to admin
            existingAdmin.isAdmin = true;
            await existingAdmin.save();
            return { message: 'User updated to admin', admin: existingAdmin };
        }

        // Create new admin
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const admin = await this.voterRepository.createAdmin({
            fullName,
            email: email.toLowerCase(),
            password: hashedPassword
        });

        return { message: 'Admin created successfully', admin };
    }

    /**
     * Change password
     * @param {string} voterId - Voter ID
     * @param {string} currentPassword - Current password
     * @param {string} newPassword - New password
     * @returns {Promise<object>}
     */
    async changePassword(voterId, currentPassword, newPassword) {
        const voter = await this.voterRepository.findById(voterId);
        
        if (!voter) {
            throw new HttpError('Voter not found', 404);
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, voter.password);
        if (!isMatch) {
            throw new HttpError('Current password is incorrect', 400);
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password
        await this.voterRepository.updatePassword(voterId, hashedPassword);

        return { message: 'Password changed successfully' };
    }
}

module.exports = AuthService;
