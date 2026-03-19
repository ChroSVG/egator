const path = require('path');
const fs = require('fs').promises;
const { v4: uuid } = require('uuid');
const ElectionRepository = require('../repositories/electionRepository');
const CandidateRepository = require('../repositories/candidateRepository');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');
const { cloudinaryBreaker } = require('../utils/circuitBreaker');
const eventEmitter = require('../utils/eventEmitter');
const HttpError = require('../models/errorModel');
const { withTransaction } = require('../utils/transactionHelper');

/**
 * Election Service
 * 
 * Handles election management business logic.
 */
class ElectionService {
    constructor() {
        this.electionRepository = new ElectionRepository();
        this.candidateRepository = new CandidateRepository();
    }

    /**
     * Create a new election
     * @param {object} data - Election data
     * @param {object} file - Thumbnail file
     * @returns {Promise<object>}
     */
    async createElection(data, file) {
        const { title, description } = data;
        let uploadedImageUrl = null;

        try {
            // Upload image to Cloudinary (with circuit breaker)
            uploadedImageUrl = await cloudinaryBreaker.execute(
                async () => await this.uploadImage(file, 'elections'),
                { fallback: null }
            );

            if (!uploadedImageUrl) {
                throw new HttpError('Failed to upload election thumbnail', 500);
            }

            // Create election
            const election = await this.electionRepository.create({
                title,
                description,
                thumbnail: uploadedImageUrl
            });

            // Emit event
            eventEmitter.emitElectionCreated({
                electionId: election._id,
                title: election.title,
                adminId: null
            });

            return election;

        } catch (error) {
            // Clean up Cloudinary image if creation fails
            if (uploadedImageUrl) {
                await deleteFromCloudinary(uploadedImageUrl);
            }
            throw error;
        }
    }

    /**
     * Get all elections with filtering and pagination
     * @param {object} filters - Query filters
     * @returns {Promise<object>}
     */
    async getElections(filters = {}) {
        const { isActive, page = 1, limit = 10 } = filters;

        let query = {};
        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        }

        const options = {
            sort: { createdAt: -1 }
        };

        return await this.electionRepository.paginate(query, page, limit, options);
    }

    /**
     * Get election by ID
     * @param {string} id - Election ID
     * @param {boolean} includeCandidates - Include candidates
     * @returns {Promise<object>}
     */
    async getElectionById(id, includeCandidates = false) {
        let election;
        
        if (includeCandidates) {
            election = await this.electionRepository.findByIdWithCandidates(id);
        } else {
            election = await this.electionRepository.findById(id);
        }

        if (!election) {
            throw new HttpError('Election not found', 404);
        }

        return election;
    }

    /**
     * Update election
     * @param {string} id - Election ID
     * @param {object} data - Update data
     * @param {object} file - New thumbnail file (optional)
     * @returns {Promise<object>}
     */
    async updateElection(id, data, file = null) {
        const { title, description } = data;

        const election = await this.electionRepository.findById(id);

        if (!election) {
            throw new HttpError('Election not found', 404);
        }

        const updateData = { title, description };

        // Handle new thumbnail
        if (file) {
            // Delete old image from Cloudinary (with circuit breaker)
            await cloudinaryBreaker.execute(
                async () => await deleteFromCloudinary(election.thumbnail)
            );

            // Upload new image
            updateData.thumbnail = await cloudinaryBreaker.execute(
                async () => await this.uploadImage(file, 'elections'),
                { fallback: election.thumbnail } // Keep old image if upload fails
            );
        }

        const updatedElection = await this.electionRepository.updateById(id, updateData);

        // Emit event
        eventEmitter.emitElectionUpdated({
            electionId: id,
            title: updatedElection.title
        });

        return updatedElection;
    }

    /**
     * Delete election
     * @param {string} id - Election ID
     * @returns {Promise<object>}
     */
    async deleteElection(id) {
        return await withTransaction(async (session) => {
            const election = await this.electionRepository.findById(id, { session });

            if (!election) {
                throw new HttpError('Election not found', 404);
            }

            // Delete thumbnail from Cloudinary (with circuit breaker)
            await cloudinaryBreaker.execute(
                async () => await deleteFromCloudinary(election.thumbnail)
            );

            // Delete all candidates
            await this.candidateRepository.deleteByElection(id, { session });

            // Delete election
            await this.electionRepository.deleteById(id, { session });

            // Emit event
            eventEmitter.emitElectionDeleted({
                electionId: id,
                title: election.title
            });

            return election;
        });
    }

    /**
     * Get election candidates
     * @param {string} electionId - Election ID
     * @returns {Promise<Array>}
     */
    async getElectionCandidates(electionId) {
        const election = await this.electionRepository.findById(electionId);
        
        if (!election) {
            throw new HttpError('Election not found', 404);
        }

        return await this.candidateRepository.findByElection(electionId, {
            populate: { path: 'election', select: 'title' }
        });
    }

    /**
     * Get election voters (people who voted)
     * @param {string} electionId - Election ID
     * @returns {Promise<Array>}
     */
    async getElectionVoters(electionId) {
        const VoterRepository = require('../repositories/voterRepository');
        const voterRepository = new VoterRepository();

        return await voterRepository.findVotersByElection(electionId, {
            select: 'fullName email createdAt'
        });
    }

    /**
     * Get election results
     * @param {string} electionId - Election ID
     * @returns {Promise<object>}
     */
    async getElectionResults(electionId) {
        return await this.electionRepository.getResults(electionId);
    }

    /**
     * Upload image to Cloudinary
     * @param {object} file - Uploaded file
     * @param {string} folder - Cloudinary folder
     * @returns {Promise<string>}
     */
    async uploadImage(file, folder) {
        const fileName = `${file.name.split('.')[0]}-${uuid()}${path.extname(file.name)}`;
        const filePath = path.join(__dirname, '..', 'uploads', fileName);

        try {
            // Save file locally first
            await file.mv(filePath);

            // Upload to Cloudinary
            const imageUrl = await uploadToCloudinary(filePath, folder);

            // Clean up local file
            await fs.unlink(filePath).catch(err => {
                console.warn('⚠️  Failed to delete temporary file:', err.message);
            });

            return imageUrl;

        } catch (error) {
            // Clean up local file if upload fails
            try {
                await fs.unlink(filePath);
            } catch (cleanupError) {
                console.warn('⚠️  Failed to cleanup file after error:', cleanupError.message);
            }
            throw error;
        }
    }

    /**
     * Get active elections
     * @returns {Promise<Array>}
     */
    async getActiveElections() {
        return await this.electionRepository.getActiveElections();
    }
}

module.exports = ElectionService;
