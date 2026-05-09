const path = require('path');
const fs = require('fs').promises;
const { v4: uuid } = require('uuid');
const CandidateRepository = require('../repositories/candidateRepository');
const ElectionRepository = require('../repositories/electionRepository');
const { cloudinaryBreaker } = require('../utils/circuitBreaker');
const eventEmitter = require('../utils/eventEmitter');
const HttpError = require('../models/errorModel');
const mongoose = require('mongoose');
const { withTransaction } = require('../utils/transactionHelper');
// Tambahkan/Update baris ini di bagian atas file service
const FailedDeletion = require('../models/failedDeletionModel'); 
const { 
    uploadToCloudinary, 
    deleteFromCloudinary, 
    extractPublicId // Pastikan ini di-import
} = require('../utils/cloudinary');

const { safeCloudinaryDelete } = require('../utils/helper'); // Import helper untuk safe delete
const { uploadImageHelper } = require('../utils/uploadHelper');


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
    /**
 * Create or Link a candidate to an election
 * @param {object} data - Candidate data
 * @param {object} file - Image file
 * @returns {Promise<object>}
 */
async createCandidate(data, file) {
    const { fullName, motto, election } = data; // 'election' di sini adalah ID election yang dipilih
    let uploadedImageUrl = null;
    let candidate = null;

    try {
        // Jalankan transaksi database
        candidate = await withTransaction(async (session) => { 
            // 1. Verifikasi apakah election yang dituju ada
            const electionExists = await this.electionRepository.findById(election, { session });
            if (!electionExists) {
                throw new HttpError('Election not found', 404);
            }

            // 2. Cek apakah kandidat dengan nama ini sudah ada di database
            // Kita ingin satu kandidat bisa punya banyak election
            let existingCandidate = await this.candidateRepository.findOne({ fullName }, { session });

            if (existingCandidate) {
                // JIKA KANDIDAT SUDAH ADA:
                // Tambahkan ID election baru ke array 'elections' milik kandidat (gunakan $addToSet agar tidak duplikat)
                candidate = await this.candidateRepository.updateById(
                    existingCandidate._id,
                    { $addToSet: { elections: election } },
                    { session }
                );
            } else {
                // JIKA KANDIDAT BELUM ADA:
                // Upload image ke Cloudinary
                uploadedImageUrl = await cloudinaryBreaker.execute(
                    async () => await uploadImageHelper(file, 'candidates'),
                    { fallback: null }
                );

                if (!uploadedImageUrl) {
                    throw new HttpError('Failed to upload candidate image', 500);
                }

                // Simpan sebagai kandidat baru dengan array elections
                candidate = await this.candidateRepository.create({
                    fullName,
                    motto,
                    image: uploadedImageUrl,
                    elections: [election] // Simpan dalam bentuk array
                }, { session });
            }

            // 3. Update dokumen Election agar ID kandidat masuk ke list candidates election tersebut
            await this.electionRepository.addCandidate(election, candidate._id, session);

            return candidate;
        });

        // 4. Emit event sukses
        eventEmitter.emitCandidateCreated({
            candidateId: candidate._id,
            name: candidate.fullName,
            electionId: election
        });

        return candidate;

    } catch (error) {
        // RECOVERY: Jika gagal simpan ke DB padahal gambar sudah terlanjur upload
        if (uploadedImageUrl) {
            const publicId = extractPublicId(uploadedImageUrl);
            safeCloudinaryDelete(publicId, 'candidates');
        }
        
        console.error(`Candidate creation/linking failed: ${error.message}`);
        throw error;
    }
};
    /**
     * Get all candidates with filtering and pagination
     * @param {object} filters - Query filters
     * @returns {Promise<object>}
     */
    async getCandidates(filters = {}) {
        const { election, search, sort, page = 1, limit = 10 } = filters;

        let query = {};
        if (election) query.elections = election;  // Fixed: use 'elections' array
        if (search) {
            const candidates = await this.candidateRepository.searchByName(search);
            return {
                data: candidates,
                count: candidates.length,
                total: candidates.length
            };
        }

        const options = {
            populate: { path: 'elections', select: 'title' },  // Fixed: populate 'elections'
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
     * Update candidate
     * @param {string} id - Candidate ID
     * @param {object} data - Update data (fullName, motto, image)
     * @param {object} file - New image file (optional)
     * @returns {Promise<object>}
     */
    async updateCandidate(id, data, file = null) {
        let candidate;
        let oldImageUrl = null;

        await withTransaction(async (session) => {
            candidate = await this.candidateRepository.findById(id, { session });

            if (!candidate) {
                throw new HttpError('Candidate not found', 404);
            }

            // Store old image URL for deletion after successful transaction
            oldImageUrl = candidate.image;

            // Update fields (partial update supported)
            if (data.fullName !== undefined) {
                candidate.fullName = data.fullName;
            }
            if (data.motto !== undefined) {
                candidate.motto = data.motto;
            }

            // Handle new image upload if provided
            if (file) {
                const uploadedImageUrl = await uploadImageHelper(file, 'candidates');
                candidate.image = uploadedImageUrl;

                // Delete old image from Cloudinary (after transaction succeeds)
                if (oldImageUrl) {
                    const publicId = extractPublicId(oldImageUrl);
                    if (publicId) {
                        await deleteFromCloudinary(publicId);
                    }
                }
            }

            candidate.version = (candidate.version || 0) + 1;

            await candidate.save({ session });
        });

        return candidate;
    }

    /**
     * Delete candidate
     * @param {string} id - Candidate ID
     * @returns {Promise<object>}
     */
    async deleteCandidate(id) {
    let candidate;

    // 1. Jalankan transaksi Database saja
    await withTransaction(async (session) => {
        candidate = await this.candidateRepository.findById(id, { session });

        if (!candidate) {
            throw new HttpError('Candidate not found', 404);
        }

        // Hapus relasi dari semua election yang terkait
        if (candidate.elections && candidate.elections.length > 0) {
            for (const electionId of candidate.elections) {
                await this.electionRepository.removeCandidate(electionId, id, session);
            }
        }
        
        await this.candidateRepository.deleteById(id, { session });
    });

    // 2. Jika kode sampai di sini, artinya Transaksi DB SUKSES (Commit)
    // Sekarang baru aman hapus gambar di Cloudinary
    if (candidate && candidate.image) {
        safeCloudinaryDelete(candidate.image);
    }

    // 3. Emit event
    eventEmitter.emitCandidateDeleted({
        candidateId: id,
        name: candidate.fullName
    });

    return candidate;
};

    /**
     * Add candidate to another election
     * @param {string} candidateId - Candidate ID
     * @param {string} electionId - Election ID to add to
     * @returns {Promise<object>}
     */
    async addCandidateToElection(candidateId, electionId) {
        return await withTransaction(async (session) => {
            // 1. Verify candidate exists
            const candidate = await this.candidateRepository.findById(candidateId, { session });
            if (!candidate) {
                throw new HttpError('Candidate not found', 404);
            }

            // 2. Verify election exists
            const election = await this.electionRepository.findById(electionId, { session });
            if (!election) {
                throw new HttpError('Election not found', 404);
            }

            // 3. Check if candidate already in this election
            if (candidate.elections && candidate.elections.includes(electionId)) {
                throw new HttpError('Candidate is already in this election', 400);
            }

            // 4. Add election to candidate's elections array
            candidate.elections.push(electionId);
            await candidate.save({ session });

            // 5. Add candidate to election's candidates array
            await this.electionRepository.addCandidate(electionId, candidateId, session);

            // 6. Emit event
            eventEmitter.emit('candidate:added-to-election', {
                candidateId,
                electionId
            });

            return candidate;
        });
    }

    /**
     * Remove candidate from an election
     * @param {string} candidateId - Candidate ID
     * @param {string} electionId - Election ID to remove from
     * @returns {Promise<object>}
     */
    async removeCandidateFromElection(candidateId, electionId) {
        return await withTransaction(async (session) => {
            // 1. Verify candidate exists
            const candidate = await this.candidateRepository.findById(candidateId, { session });
            if (!candidate) {
                throw new HttpError('Candidate not found', 404);
            }

            // 2. Check if candidate is in this election
            if (!candidate.elections || !candidate.elections.includes(electionId)) {
                throw new HttpError('Candidate is not in this election', 400);
            }

            // 3. Remove election from candidate's elections array
            candidate.elections = candidate.elections.filter(
                id => id.toString() !== electionId
            );
            await candidate.save({ session });

            // 4. Remove candidate from election's candidates array
            await this.electionRepository.removeCandidate(electionId, candidateId, session);

            // 5. Emit event
            eventEmitter.emit('candidate:removed-from-election', {
                candidateId,
                electionId
            });

            return candidate;
        });
    }

    /**
     * Move candidate from one election to another
     * @param {string} candidateId - Candidate ID
     * @param {string} fromElectionId - Source election ID
     * @param {string} toElectionId - Destination election ID
     * @returns {Promise<object>}
     */
    async moveCandidateToElection(candidateId, fromElectionId, toElectionId) {
        return await withTransaction(async (session) => {
            // 1. Verify candidate exists
            const candidate = await this.candidateRepository.findById(candidateId, { session });
            if (!candidate) {
                throw new HttpError('Candidate not found', 404);
            }

            // 2. Verify both elections exist
            const fromElection = await this.electionRepository.findById(fromElectionId, { session });
            if (!fromElection) {
                throw new HttpError('Source election not found', 404);
            }

            const toElection = await this.electionRepository.findById(toElectionId, { session });
            if (!toElection) {
                throw new HttpError('Destination election not found', 404);
            }

            // 3. Check if candidate is in source election
            if (!candidate.elections || !candidate.elections.includes(fromElectionId)) {
                throw new HttpError('Candidate is not in source election', 400);
            }

            // 4. Check if candidate is already in destination election
            if (candidate.elections.includes(toElectionId)) {
                throw new HttpError('Candidate is already in destination election', 400);
            }

            // 5. Remove from source election
            candidate.elections = candidate.elections.filter(
                id => id.toString() !== fromElectionId
            );

            // 6. Add to destination election
            candidate.elections.push(toElectionId);
            await candidate.save({ session });

            // 7. Update elections
            await this.electionRepository.removeCandidate(fromElectionId, candidateId, session);
            await this.electionRepository.addCandidate(toElectionId, candidateId, session);

            // 8. Emit events
            eventEmitter.emit('candidate:moved-election', {
                candidateId,
                fromElectionId,
                toElectionId
            });

            return candidate;
        });
    }

}

module.exports = CandidateService;
