const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const VoterRepository = require('./auth.repository');
const eventEmitter = require('../../shared/utils/eventEmitter');
const HttpError = require('../../shared/models/errorModel');
const config = require('../../shared/config');

/**
 * Auth Service
 * 
 * Handles authentication and authorization logic.
 */
class AuthService {
    constructor(voterRepository = null) {
        this.voterRepository = voterRepository || new VoterRepository();
        this.jwtSecret = config.jwt.secret;
        this.jwtExpiresIn = config.jwt.expiresIn;
    }

    /**
     * Register a new voter
     */
    async register(data) {
        const { fullName, email, password, password2 } = data;

        if (password !== password2) {
            throw new HttpError('Passwords do not match', 400);
        }

        const existingVoter = await this.voterRepository.findByEmail(email);
        if (existingVoter) {
            throw new HttpError('Voter with this email already exists', 409);
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const voter = await this.voterRepository.create({
            fullName,
            email: email.toLowerCase(),
            password: hashedPassword,
            isAdmin: false
        });

        const token = this.generateToken(voter);

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
     */
    async login(credentials) {
        const { email, password } = credentials;

        const voter = await this.voterRepository.findByEmail(email);
        if (!voter) {
            throw new HttpError('Invalid credentials', 401);
        }

        const isPasswordMatch = await bcrypt.compare(password, voter.password);
        if (!isPasswordMatch) {
            throw new HttpError('Invalid credentials', 401);
        }

        const token = this.generateToken(voter);

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
     */
    async createAdmin(data) {
        const { email, password, fullName } = data;

        const existingAdmin = await this.voterRepository.findByEmail(email);
        if (existingAdmin) {
            if (existingAdmin.isAdmin) {
                return { message: 'Admin already exists', admin: existingAdmin };
            }
            existingAdmin.isAdmin = true;
            await existingAdmin.save();
            return { message: 'User updated to admin', admin: existingAdmin };
        }

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
     */
    async changePassword(voterId, currentPassword, newPassword) {
        const voter = await this.voterRepository.findById(voterId);
        
        if (!voter) {
            throw new HttpError('Voter not found', 404);
        }

        const isMatch = await bcrypt.compare(currentPassword, voter.password);
        if (!isMatch) {
            throw new HttpError('Current password is incorrect', 400);
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await this.voterRepository.updatePassword(voterId, hashedPassword);

        return { message: 'Password changed successfully' };
    }
}

module.exports = AuthService;
