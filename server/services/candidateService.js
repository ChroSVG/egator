const path = require('path');
const { v4: uuid } = require('uuid');
const CandidateRepository = require('../repositories/candidateRepository');
const ElectionRepository = require('../repositories/electionRepository');
const cloudinary = require('../utils/cloudinary');
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

        return await withTransaction(async (session) => {
            // 1. Verify election exists
            const electionExists = await this.electionRepository.findById(election, { session });
            if (!electionExists) {
                throw new HttpError('Election not found', 404);
            }

            // 2. Upload image to Cloudinary
            const imageUrl = await this.uploadImage(file, 'candidates');

            // 3. Create candidate
            const candidate = await this.candidateRepository.create({
                fullName,
                motto,
                image: imageUrl,
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

            // Delete image from Cloudinary
            await this.deleteImage(candidate.image);

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
}

module.exports = CandidateService;
