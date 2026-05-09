const path = require('path');
const fs = require('fs').promises;
const { v4: uuid } = require('uuid');
const ElectionRepository = require('../repositories/electionRepository');
const VoterRepository = require('../repositories/voterRepository');
const CandidateRepository = require('../repositories/candidateRepository');
const { cloudinaryBreaker } = require('../utils/circuitBreaker');
const eventEmitter = require('../utils/eventEmitter');
const HttpError = require('../models/errorModel');
const { withTransaction } = require('../utils/transactionHelper');
const cacheService = require('../utils/cacheService');
// Add/Update this line at the top of the service file
const FailedDeletion = require('../models/failedDeletionModel'); 
const { 
    uploadToCloudinary, 
    deleteFromCloudinary, 
    extractPublicId // Ensure this is imported
} = require('../utils/cloudinary');
const { safeCloudinaryDelete } = require('../utils/helper');
const { uploadImageHelper } = require('../utils/uploadHelper');


/**
 * Election Service
 * 
 * Handles election management business logic.
 */
class ElectionService {
    constructor() {
        this.electionRepository = new ElectionRepository();
        this.candidateRepository = new CandidateRepository();
        this.voterRepository = new VoterRepository();
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
        let election = null;
        try {
            election = await withTransaction(async (session) => {

            const electionExists = await this.electionRepository.findByTitle(title, { session });
            if (electionExists) {
                throw new HttpError('Election with this title already exists', 400);
            }

            // Upload image to Cloudinary (with circuit breaker)
            uploadedImageUrl = await cloudinaryBreaker.execute(
                async () => await uploadImageHelper(file, 'elections'),
                { fallback: null }
            );

            if (!uploadedImageUrl) {
                throw new HttpError('Failed to upload election thumbnail', 500);
            }

            // Create election
            const newElection = await this.electionRepository.create({
                title,
                description,
                thumbnail: uploadedImageUrl
            }, { session });
            return newElection;
            });

            // Emit event
            eventEmitter.emitElectionCreated({
                electionId: election._id,
                title: election.title,
                adminId: null
            });

            return election;

        } catch (error) {
            // RECOVERY LOGIC: If DB fails, delete image on Cloudinary
            if (uploadedImageUrl) {
                safeCloudinaryDelete(election.thumbnail);
            }
            
            console.error(`Election creation failed: ${error.message}`);
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
 * Update election (Supports Partial Update)
 * @param {string} id - Election ID
 * @param {object} data - Update data (can be just title or description)
 * @param {object} file - New thumbnail file (optional)
 * @returns {Promise<object>}
 */
async updateElection(id, data, file = null) {
    // 1. Find old data for validation and thumbnail reference
    const election = await this.electionRepository.findById(id);
    if (!election) {
        throw new HttpError('Election not found', 404);
    }

    // 2. Build update object dynamically (Only columns present in 'data' are included)
    const updateData = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;

    // 3. Handle new thumbnail if provided
    if (file) {
        // DELETE OLD (Non-blocking: We do not wait for this process to finish)
        safeCloudinaryDelete(election.thumbnail);

        // UPLOAD NEW (Still awaited because we need the URL to save to DB)
        const newThumbnail = await cloudinaryBreaker.execute(
            async () => await uploadImageHelper(file, 'elections'),
            { fallback: null }
        );

        if (newThumbnail) {
            updateData.thumbnail = newThumbnail;
        }
    }

    // 4. If no data is updated, return old data directly
    if (Object.keys(updateData).length === 0) {
        return election;
    }

    // 5. Execute update to database
    const updatedElection = await this.electionRepository.updateById(id, updateData);


    // 7. Emit event for other systems (e.g., log or real-time dashboard)
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
    let election;
    await withTransaction(async (session) => {
        election = await this.electionRepository.findById(id, { session });
        if (!election) throw new HttpError('Election not found', 404);

        // await this.candidateRepository.deleteByElection(id, { session });

        await this.candidateRepository.updateMany(
            { election: id }, 
            { $set: { election: null } }, 
            { session }
        );


        await this.electionRepository.deleteById(id, { session });
        
        // ADD THIS: Remove electionId reference from all voters
        await this.voterRepository.removeElectionReference(id, {session})
    });
    
    // MUCH CLEANER:
    // Call helper that handles circuit breaker, catch error,
    // extractPublicId, and FailedDeletion logging automatically.
    safeCloudinaryDelete(election.thumbnail);

    eventEmitter.emitElectionDeleted({
        electionId: id,
        title: election.title
    });

    return election;
};

    /**
     * Get election candidates
     * @param {string} electionId - Election ID
     * @returns {Promise<Array>}
     */
    async getElectionCandidates(electionId) {
        console.log('[getElectionCandidates] Election ID:', electionId);
        
        const election = await this.electionRepository.findById(electionId);
        console.log('[getElectionCandidates] Election:', election);

        if (!election) {
            throw new HttpError('Election not found', 404);
        }

        const candidates = await this.candidateRepository.findByElection(electionId, {
            populate: { path: 'elections', select: 'title' }
        });
        console.log('[getElectionCandidates] Candidates from DB:', candidates);
        
        return candidates;
    }

    /**
     * Get election voters (people who voted)
     * @param {string} electionId - Election ID
     * @returns {Promise<Array>}
     */
    async getElectionVoters(electionId) {
        const election = await this.electionRepository.findById(electionId);
        
        if (!election) {
            throw new HttpError('Election not found', 404);
        }

        return await this.voterRepository.findVotersByElection(electionId, {
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
     * Get active elections
     * @returns {Promise<Array>}
     */
    async getActiveElections() {
        return await this.electionRepository.getActiveElections();
    }
}

module.exports = ElectionService;
