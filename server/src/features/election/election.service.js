const path = require('path');
const fs = require('fs').promises;
const { v4: uuid } = require('uuid');
const ElectionRepository = require('./election.repository');
const VoterRepository = require('../auth/auth.repository');
const CandidateRepository = require('../candidate/candidate.repository');
const { cloudinaryBreaker } = require('../../shared/utils/circuitBreaker');
const eventEmitter = require('../../shared/utils/eventEmitter');
const HttpError = require('../../shared/models/errorModel');
const { withTransaction } = require('../../shared/utils/transactionHelper');
const cacheService = require('../../shared/utils/cacheService');
const { 
    uploadToCloudinary, 
    deleteFromCloudinary, 
    extractPublicId 
} = require('../../shared/utils/cloudinary');
const { safeCloudinaryDelete } = require('../../shared/utils/helper');
const { uploadImageHelper } = require('../../shared/utils/uploadHelper');

/**
 * Election Service
 * 
 * Handles election management business logic.
 */
class ElectionService {
    constructor(electionRepository = null, candidateRepository = null, voterRepository = null) {
        this.electionRepository = electionRepository || new ElectionRepository();
        this.candidateRepository = candidateRepository || new CandidateRepository();
        this.voterRepository = voterRepository || new VoterRepository();
    }

    /**
     * Create a new election
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

                uploadedImageUrl = await cloudinaryBreaker.execute(
                    async () => await uploadImageHelper(file, 'elections'),
                    { fallback: null }
                );

                if (!uploadedImageUrl) {
                    throw new HttpError('Failed to upload election thumbnail', 500);
                }

                const newElection = await this.electionRepository.create({
                    title,
                    description,
                    thumbnail: uploadedImageUrl
                }, { session });
                return newElection;
            });

            eventEmitter.emitElectionCreated({
                electionId: election._id,
                title: election.title,
                adminId: null
            });

            return election;

        } catch (error) {
            if (uploadedImageUrl) {
                safeCloudinaryDelete(uploadedImageUrl);
            }
            throw error;
        }
    }

    /**
     * Get all elections with filtering and pagination
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
     */
    async updateElection(id, data, file = null) {
        const election = await this.electionRepository.findById(id);
        if (!election) {
            throw new HttpError('Election not found', 404);
        }

        const updateData = {};
        if (data.title !== undefined) updateData.title = data.title;
        if (data.description !== undefined) updateData.description = data.description;

        if (file) {
            safeCloudinaryDelete(election.thumbnail);

            const newThumbnail = await cloudinaryBreaker.execute(
                async () => await uploadImageHelper(file, 'elections'),
                { fallback: null }
            );

            if (newThumbnail) {
                updateData.thumbnail = newThumbnail;
            }
        }

        if (Object.keys(updateData).length === 0) {
            return election;
        }

        const updatedElection = await this.electionRepository.updateById(id, updateData);

        eventEmitter.emitElectionUpdated({
            electionId: id,
            title: updatedElection.title
        });

        return updatedElection;
    }

    /**
     * Delete election
     */
    async deleteElection(id) {
        let election;
        await withTransaction(async (session) => {
            election = await this.electionRepository.findById(id, { session });
            if (!election) throw new HttpError('Election not found', 404);

            await this.candidateRepository.updateMany(
                { election: id }, 
                { $set: { election: null } }, 
                { session }
            );

            await this.electionRepository.deleteById(id, { session });
            await this.voterRepository.removeElectionReference(id, { session });
        });
        
        safeCloudinaryDelete(election.thumbnail);

        eventEmitter.emitElectionDeleted({
            electionId: id,
            title: election.title
        });

        return election;
    }

    /**
     * Get election candidates
     */
    async getElectionCandidates(electionId) {
        const election = await this.electionRepository.findById(electionId);

        if (!election) {
            throw new HttpError('Election not found', 404);
        }

        return await this.candidateRepository.findByElection(electionId, {
            populate: { path: 'elections', select: 'title' }
        });
    }

    /**
     * Get election voters
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
     */
    async getElectionResults(electionId) {
        return await this.electionRepository.getResults(electionId);
    }

    /**
     * Get active elections
     */
    async getActiveElections() {
        return await this.electionRepository.getActiveElections();
    }
}

module.exports = ElectionService;
