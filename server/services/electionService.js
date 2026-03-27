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
// Tambahkan/Update baris ini di bagian atas file service
const FailedDeletion = require('../models/failedDeletionModel'); 
const { 
    uploadToCloudinary, 
    deleteFromCloudinary, 
    extractPublicId // Pastikan ini di-import
} = require('../utils/cloudinary');
const {safeCloudinaryDelete} = require('../utils/helper')


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
 * Update election (Mendukung Partial Update)
 * @param {string} id - Election ID
 * @param {object} data - Update data (bisa hanya title atau description saja)
 * @param {object} file - New thumbnail file (optional)
 * @returns {Promise<object>}
 */
async updateElection(id, data, file = null) {
    // 1. Cari data lama untuk validasi dan referensi thumbnail
    const election = await this.electionRepository.findById(id);
    if (!election) {
        throw new HttpError('Election not found', 404);
    }

    // 2. Bangun objek update secara dinamis (Hanya kolom yang ada di 'data' yang dimasukkan)
    const updateData = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;

    // 3. Handle thumbnail baru jika ada
    if (file) {
        // HAPUS LAMA (Non-blocking: Kita tidak menunggu proses ini selesai)
        safeCloudinaryDelete(election.thumbnail);

        // UPLOAD BARU (Tetap ditunggu karena kita butuh URL-nya untuk disimpan ke DB)
        const newThumbnail = await cloudinaryBreaker.execute(
            async () => await this.uploadImage(file, 'elections'),
            { fallback: null }
        );

        if (newThumbnail) {
            updateData.thumbnail = newThumbnail;
        }
    }

    // 4. Jika tidak ada data yang diupdate, langsung kembalikan data lama
    if (Object.keys(updateData).length === 0) {
        return election;
    }

    // 5. Eksekusi update ke database
    const updatedElection = await this.electionRepository.updateById(id, updateData);


    // 7. Emit event untuk sistem lain (misal: log atau real-time dashboard)
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
        
        // TAMBAHKAN INI: Hapus referensi electionId dari semua voter
        await this.voterRepository.removeElectionReference(id, {session})
    });
    
    // JAUH LEBIH BERSIH:
    // Panggil helper yang sudah menangani circuit breaker, catch error, 
    // extractPublicId, dan pencatatan ke tabel FailedDeletion secara otomatis.
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
