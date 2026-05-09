const path = require('path');
const fs = require('fs').promises;
const { v4: uuid } = require('uuid');
const CandidateRepository = require('./candidate.repository');
const ElectionRepository = require('../election/election.repository');
const { cloudinaryBreaker } = require('../../shared/utils/circuitBreaker');
const eventEmitter = require('../../shared/utils/eventEmitter');
const HttpError = require('../../shared/models/errorModel');
const mongoose = require('mongoose');
const { withTransaction } = require('../../shared/utils/transactionHelper');
const { 
    uploadToCloudinary, 
    deleteFromCloudinary, 
    extractPublicId 
} = require('../../shared/utils/cloudinary');
const { safeCloudinaryDelete } = require('../../shared/utils/helper');
const { uploadImageHelper } = require('../../shared/utils/uploadHelper');

/**
 * Candidate Service
 * 
 * Handles candidate management business logic.
 */
class CandidateService {
    constructor(candidateRepository = null, electionRepository = null) {
        this.candidateRepository = candidateRepository || new CandidateRepository();
        this.electionRepository = electionRepository || new ElectionRepository();
    }

    /**
     * Create or Link a candidate to an election
     */
    async createCandidate(data, file) {
        const { fullName, motto, election } = data;
        let uploadedImageUrl = null;
        let candidate = null;

        try {
            candidate = await withTransaction(async (session) => { 
                const electionExists = await this.electionRepository.findById(election, { session });
                if (!electionExists) {
                    throw new HttpError('Election not found', 404);
                }

                let existingCandidate = await this.candidateRepository.findOne({ fullName }, { session });

                if (existingCandidate) {
                    candidate = await this.candidateRepository.updateById(
                        existingCandidate._id,
                        { $addToSet: { elections: election } },
                        { session }
                    );
                } else {
                    uploadedImageUrl = await cloudinaryBreaker.execute(
                        async () => await uploadImageHelper(file, 'candidates'),
                        { fallback: null }
                    );

                    if (!uploadedImageUrl) {
                        throw new HttpError('Failed to upload candidate image', 500);
                    }

                    candidate = await this.candidateRepository.create({
                        fullName,
                        motto,
                        image: uploadedImageUrl,
                        elections: [election]
                    }, { session });
                }

                await this.electionRepository.addCandidate(election, candidate._id, session);

                return candidate;
            });

            eventEmitter.emitCandidateCreated({
                candidateId: candidate._id,
                name: candidate.fullName,
                electionId: election
            });

            return candidate;

        } catch (error) {
            if (uploadedImageUrl) {
                safeCloudinaryDelete(uploadedImageUrl);
            }
            throw error;
        }
    }

    /**
     * Get all candidates with filtering and pagination
     */
    async getAllCandidates(filters = {}) {
        return await this.candidateRepository.findAll(filters, {
            populate: { path: 'elections', select: 'title' },
            sort: { createdAt: -1 }
        });
    }

    /**
     * Get candidate by ID
     */
    async getCandidateById(id) {
        const candidate = await this.candidateRepository.findByIdWithElection(id);
        
        if (!candidate) {
            throw new HttpError('Candidate not found', 404);
        }

        return candidate;
    }

    /**
     * Update candidate
     */
    async updateCandidate(id, data, file = null) {
        let candidate;
        await withTransaction(async (session) => {
            candidate = await this.candidateRepository.findById(id, { session });

            if (!candidate) {
                throw new HttpError('Candidate not found', 404);
            }

            if (data.fullName !== undefined) candidate.fullName = data.fullName;
            if (data.motto !== undefined) candidate.motto = data.motto;

            if (file) {
                safeCloudinaryDelete(candidate.image);
                const uploadedImageUrl = await uploadImageHelper(file, 'candidates');
                candidate.image = uploadedImageUrl;
            }

            await candidate.save({ session });
        });

        return candidate;
    }

    /**
     * Delete candidate
     */
    async deleteCandidate(id) {
        let candidate;
        await withTransaction(async (session) => {
            candidate = await this.candidateRepository.findById(id, { session });

            if (!candidate) {
                throw new HttpError('Candidate not found', 404);
            }

            if (candidate.elections && candidate.elections.length > 0) {
                for (const electionId of candidate.elections) {
                    await this.electionRepository.removeCandidate(electionId, id, session);
                }
            }
            
            await this.candidateRepository.deleteById(id, { session });
        });

        safeCloudinaryDelete(candidate.image);

        eventEmitter.emitCandidateDeleted({
            candidateId: id,
            name: candidate.fullName
        });

        return candidate;
    }

    /**
     * Add candidate to another election
     */
    async addCandidateToElection(candidateId, electionId) {
        return await withTransaction(async (session) => {
            const candidate = await this.candidateRepository.findById(candidateId, { session });
            if (!candidate) throw new HttpError('Candidate not found', 404);

            const election = await this.electionRepository.findById(electionId, { session });
            if (!election) throw new HttpError('Election not found', 404);

            if (candidate.elections && candidate.elections.includes(electionId)) {
                throw new HttpError('Candidate is already in this election', 400);
            }

            candidate.elections.push(electionId);
            await candidate.save({ session });

            await this.electionRepository.addCandidate(electionId, candidateId, session);

            return candidate;
        });
    }

    /**
     * Remove candidate from an election
     */
    async removeCandidateFromElection(candidateId, electionId) {
        return await withTransaction(async (session) => {
            const candidate = await this.candidateRepository.findById(candidateId, { session });
            if (!candidate) throw new HttpError('Candidate not found', 404);

            if (!candidate.elections || !candidate.elections.includes(electionId)) {
                throw new HttpError('Candidate is not in this election', 400);
            }

            candidate.elections = candidate.elections.filter(
                id => id.toString() !== electionId
            );
            await candidate.save({ session });

            await this.electionRepository.removeCandidate(electionId, candidateId, session);

            return candidate;
        });
    }

    /**
     * Move candidate from one election to another
     */
    async moveCandidateToElection(candidateId, fromElectionId, toElectionId) {
        return await withTransaction(async (session) => {
            const candidate = await this.candidateRepository.findById(candidateId, { session });
            if (!candidate) throw new HttpError('Candidate not found', 404);

            const toElection = await this.electionRepository.findById(toElectionId, { session });
            if (!toElection) throw new HttpError('Destination election not found', 404);

            if (!candidate.elections || !candidate.elections.includes(fromElectionId)) {
                throw new HttpError('Candidate is not in source election', 400);
            }

            if (candidate.elections.includes(toElectionId)) {
                throw new HttpError('Candidate is already in destination election', 400);
            }

            candidate.elections = candidate.elections.filter(
                id => id.toString() !== fromElectionId
            );

            candidate.elections.push(toElectionId);
            await candidate.save({ session });

            await this.electionRepository.removeCandidate(fromElectionId, candidateId, session);
            await this.electionRepository.addCandidate(toElectionId, candidateId, session);

            return candidate;
        });
    }
}

module.exports = CandidateService;
