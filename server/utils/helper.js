const FailedDeletion = require('../models/failedDeletionModel');
const { 
    deleteFromCloudinary, 
    extractPublicId // Pastikan ini di-import
} = require('../utils/cloudinary');
const {cloudinaryBreaker} = require('../utils/circuitBreaker');

/**
 * Delete a file from Cloudinary safely (non-blocking)
 * @param {string} imageUrl 
 */
const safeCloudinaryDelete = (imageUrl) => {
    if (!imageUrl) return;

    // Do not use 'await' so that the API response remains fast
    cloudinaryBreaker.execute(async () => {
        try {
            return await deleteFromCloudinary(imageUrl);
        } catch (err) {
            console.warn(`⚠️ Background cleanup failed for: ${imageUrl}. Error: ${err.message}`);
            
            try {
                // Ensure FailedDeletion model is required in this file
                await FailedDeletion.create({
                    publicId: extractPublicId(imageUrl),
                    imageUrl: imageUrl,
                    reason: err.message
                });
            } catch (dbErr) {
                console.error('[CRITICAL] Failed to save FailedDeletion log:', dbErr.message);
            }
        }
    }).catch((err) => {
        console.error('[CRITICAL] Failed to execute cleanup:', err.message);
    });
};

// Use CommonJS export to match your service files
module.exports = {
    safeCloudinaryDelete
};