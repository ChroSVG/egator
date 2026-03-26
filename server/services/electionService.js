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
        let election = null;
        try {
            election = await withTransaction(async (session) => {

            const electionExists = await this.electionRepository.findByTitle(title, { session });
            if (electionExists) {
                throw new HttpError('Election with this title already exists', 400);
            }

            // Upload image to Cloudinary (with circuit breaker)
            uploadedImageUrl = await cloudinaryBreaker.execute(
                async () => await this.uploadImage(file, 'elections'),
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

            // Invalidate elections cache
            await cacheService.invalidateElection();
            // Emit event
            eventEmitter.emitElectionCreated({
                electionId: election._id,
                title: election.title,
                adminId: null
            });

            return election;

        } catch (error) {
            // RECOVERY LOGIC: Jika DB gagal, hapus gambar di Cloudinary
            if (uploadedImageUrl) {
                deleteFromCloudinary(uploadedImageUrl).catch(cleanupErr => {
                    console.error(`[CRITICAL] Orphan file detected! Manual cleanup needed for: ${uploadedImageUrl}`);
                    // Jika Anda sudah membuat fitur FailedDeletions, panggil di sini:
                    FailedDeletion.create({ publicId: extractPublicId(uploadedImageUrl), imageUrl: uploadedImageUrl });
                });
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
        let election;
        await withTransaction(async (session) => {
            election = await this.electionRepository.findById(id, { session });

            if (!election) {
                throw new HttpError('Election not found', 404);
            }

            // Delete all candidates
            await this.candidateRepository.deleteByElection(id, { session });
    
            // Delete election
            await this.electionRepository.deleteById(id, { session });
        });
        if (election && election.thumbnail) {
                // Gunakan circuit breaker & jangan di-await jika tidak ingin menghambat response
                // atau gunakan background job/FailedDeletions jika gagal.
                cloudinaryBreaker.execute(
                    async () => await deleteFromCloudinary(election.thumbnail)
                ).catch(err => {
                    console.error(`[WORKER NEEDED] Gagal hapus gambar Cloudinary: ${election.thumbnail}`);
                    // Di sini idealnya Anda masukkan ke tabel FailedDeletions
                    FailedDeletion.create({ publicId: extractPublicId(election.thumbnail), imageUrl: election.thumbnail, reason: err.message });
                
                });
            }

        // Emit event
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
        
        // Flag untuk mengecek apakah file berhasil dibuat di lokal
        let fileExists = false;
    
        try {
            // 1. Simpan file ke lokal
            await file.mv(filePath);
            fileExists = true; // Tandai file sudah ada
    
            // 2. Upload ke Cloudinary
            const imageUrl = await uploadToCloudinary(filePath, folder);
    
            return imageUrl;
        } catch (error) {
            console.error('❌ Error in uploadImage service:', error.message);
            throw error; // Lempar error ke controller
        } finally {
            // 3. Bersihkan file lokal hanya jika file tersebut sempat berhasil dibuat
            if (fileExists) {
                try {
                    await fs.unlink(filePath);
                    // console.log('✅ Temporary file cleaned up');
                } catch (cleanupError) {
                    // Gunakan check sederhana agar tidak memenuhi log jika file memang sudah hilang
                    if (cleanupError.code !== 'ENOENT') {
                        console.warn('⚠️ Failed to cleanup file:', cleanupError.message);
                    }
                }
            }
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
