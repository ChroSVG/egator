const path = require('path');
const fs = require('fs').promises;
const { v4: uuid } = require('uuid');
const CandidateRepository = require('../repositories/candidateRepository');
const ElectionRepository = require('../repositories/electionRepository');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');
const { cloudinaryBreaker } = require('../utils/circuitBreaker');
const eventEmitter = require('../utils/eventEmitter');
const HttpError = require('../models/errorModel');
const mongoose = require('mongoose');
const { withTransaction } = require('../utils/transactionHelper');

/**
 * Candidate Service
 * 
 * Handles candidate management business logic.
 */
class CandidateService {
    constructor() {
        this.candidateRepository = new CandidateRepository();
        this.electionRepository = new ElectionRepository();
    }

    /**
     * Create a new candidate
     * @param {object} data - Candidate data
     * @param {object} file - Image file
     * @returns {Promise<object>}
     */
    async createCandidate(data, file) {
        const { fullName, motto, election } = data;
        let uploadedImageUrl = null;

        return await withTransaction(async (session) => {
            try {
                // 1. Verify election exists
                const electionExists = await this.electionRepository.findById(election, { session });
                if (!electionExists) {
                    throw new HttpError('Election not found', 404);
                }

                // 2. Upload image to Cloudinary (with circuit breaker)
                uploadedImageUrl = await cloudinaryBreaker.execute(
                    async () => await this.uploadImage(file, 'candidates'),
                    { fallback: null }
                );

                if (!uploadedImageUrl) {
                    throw new HttpError('Failed to upload candidate image', 500);
                }

                // 3. Create candidate
                const candidate = await this.candidateRepository.create({
                    fullName,
                    motto,
                    image: uploadedImageUrl,
                    election
                }, { session });

                // 4. Add candidate to election
                await this.electionRepository.addCandidate(election, candidate._id, session);

                // 5. Emit event
                eventEmitter.emitCandidateCreated({
                    candidateId: candidate._id,
                    name: candidate.fullName,
                    electionId: election
                });

                return candidate;

            } catch (error) {
                // Clean up Cloudinary image if transaction fails
                if (uploadedImageUrl && error instanceof HttpError) {
                    await deleteFromCloudinary(uploadedImageUrl);
                }
                throw error;
            }
        });
    }

    /**
     * Get all candidates with filtering and pagination
     * @param {object} filters - Query filters
     * @returns {Promise<object>}
     */
    async getCandidates(filters = {}) {
        const { election, search, sort, page = 1, limit = 10 } = filters;

        let query = {};
        if (election) query.election = election;
        if (search) {
            const candidates = await this.candidateRepository.searchByName(search);
            return {
                data: candidates,
                count: candidates.length,
                total: candidates.length
            };
        }

        const options = {
            populate: { path: 'election', select: 'title' },
            sort: sort === 'votes' ? { voteCount: -1 } : { createdAt: -1 }
        };

        const result = await this.candidateRepository.paginate(query, page, limit, options);

        return result;
    }

    /**
     * Get candidate by ID
     * @param {string} id - Candidate ID
     * @returns {Promise<object>}
     */
    async getCandidateById(id) {
        const candidate = await this.candidateRepository.findByIdWithElection(id);
        
        if (!candidate) {
            throw new HttpError('Candidate not found', 404);
        }

        return candidate;
    }

    /**
     * Get candidates by election
     * @param {string} electionId - Election ID
     * @returns {Promise<Array>}
     */
    async getCandidatesByElection(electionId) {
        return await this.candidateRepository.findByElection(electionId, {
            populate: { path: 'election', select: 'title' }
        });
    }

    /**
     * Delete candidate
     * @param {string} id - Candidate ID
     * @returns {Promise<object>}
     */
    async deleteCandidate(id) {
        return await withTransaction(async (session) => {
            const candidate = await this.candidateRepository.findById(id, { session });

            if (!candidate) {
                throw new HttpError('Candidate not found', 404);
            }

            // Delete image from Cloudinary (with circuit breaker)
            await cloudinaryBreaker.execute(
                async () => await deleteFromCloudinary(candidate.image)
            );

            // Remove from election
            await this.electionRepository.removeCandidate(candidate.election, id, session);

            // Delete candidate
            await this.candidateRepository.deleteById(id, { session });

            // Emit event
            eventEmitter.emitCandidateDeleted({
                candidateId: id,
                name: candidate.fullName
            });

            return candidate;
        });
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
}

module.exports = CandidateService;
