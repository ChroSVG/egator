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
                    async () => await this.uploadImage(file, 'candidates'),
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
    let candidate;
    
    // 1. Jalankan transaksi Database saja
    await withTransaction(async (session) => {
        candidate = await this.candidateRepository.findById(id, { session });

        if (!candidate) {
            throw new HttpError('Candidate not found', 404);
        }

        // Hapus relasi dan data di DB
        await this.electionRepository.removeCandidate(candidate.election, id, session);
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
}

module.exports = CandidateService;
