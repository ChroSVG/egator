const FailedDeletion = require('../models/failedDeletionModel');
const { 
    deleteFromCloudinary, 
    extractPublicId // Pastikan ini di-import
} = require('../utils/cloudinary');
const {cloudinaryBreaker} = require('../utils/circuitBreaker');

/**
 * Menghapus file dari Cloudinary secara aman (non-blocking)
 * @param {string} imageUrl 
 */
const safeCloudinaryDelete = (imageUrl) => {
    if (!imageUrl) return;

    // Tidak menggunakan 'await' agar API response tetap cepat
    cloudinaryBreaker.execute(async () => {
        try {
            return await deleteFromCloudinary(imageUrl);
        } catch (err) {
            console.warn(`⚠️ Background cleanup failed for: ${imageUrl}. Error: ${err.message}`);
            
            try {
                // Pastikan model FailedDeletion sudah di-require di file ini
                await FailedDeletion.create({
                    publicId: extractPublicId(imageUrl),
                    imageUrl: imageUrl,
                    reason: err.message
                });
            } catch (dbErr) {
                console.error('[CRITICAL] Gagal menyimpan log FailedDeletion:', dbErr.message);
            }
        }
    }).catch((err) => {
        console.error('[CRITICAL] Gagal menjalankan cleanup:', err.message);
    });
};

// Gunakan CommonJS export agar cocok dengan file service Anda
module.exports = {
    safeCloudinaryDelete
};