const path = require('path');
const { v4: uuid } = require('uuid');
const ElectionRepository = require('../repositories/electionRepository');
const CandidateRepository = require('../repositories/candidateRepository');
const cloudinary = require('../utils/cloudinary');
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

        // Upload image to Cloudinary
        const thumbnailUrl = await this.uploadImage(file, 'elections');

        // Create election
        const election = await this.electionRepository.create({
            title,
            description,
            thumbnail: thumbnailUrl
        });

        // Emit event
        eventEmitter.emitElectionCreated({
            electionId: election._id,
            title: election.title,
            adminId: null // Would be passed from authenticated user
        });

        return election;
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
            // Delete old image from Cloudinary
            await this.deleteImage(election.thumbnail);
            
            // Upload new image
            updateData.thumbnail = await this.uploadImage(file, 'elections');
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

            // Delete thumbnail from Cloudinary
            await this.deleteImage(election.thumbnail);

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

        await file.mv(filePath);

        const result = await cloudinary.uploader.upload(filePath, {
            folder,
            public_id: fileName.split('.')[0],
            resource_type: 'image'
        });

        if (!result.secure_url) {
            throw new HttpError('Failed to upload image', 500);
        }

        return result.secure_url;
    }

    /**
     * Delete image from Cloudinary
     * @param {string} imageUrl - Image URL
     * @returns {Promise<void>}
     */
    async deleteImage(imageUrl) {
        const publicId = imageUrl.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`${publicId.split('_')[0]}/${publicId}`);
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
