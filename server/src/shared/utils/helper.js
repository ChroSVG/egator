const FailedDeletion = require('../models/failedDeletion.model');
const { 
    deleteFromCloudinary, 
    extractPublicId 
} = require('./cloudinary');
const { cloudinaryBreaker } = require('./circuitBreaker');

/**
 * Delete a file from Cloudinary safely (non-blocking)
 */
const safeCloudinaryDelete = (imageUrl) => {
    if (!imageUrl) return;

    cloudinaryBreaker.execute(async () => {
        try {
            return await deleteFromCloudinary(imageUrl);
        } catch (err) {
            try {
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

module.exports = {
    safeCloudinaryDelete
};