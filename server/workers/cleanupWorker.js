const cron = require('node-cron');
const FailedDeletion = require('../models/failedDeletionModel');
const { cloudinary } = require('../utils/cloudinary');

// Berjalan setiap jam
cron.schedule('0 * * * *', async () => {
    console.log('🔄 Running scheduled cleanup for failed deletions...');
    
    const failedFiles = await FailedDeletion.find({ attemptCount: { $lt: 5 } });

    for (const file of failedFiles) {
        try {
            const result = await cloudinary.uploader.destroy(file.publicId);
            
            if (result.result === 'ok' || result.result === 'not found') {
                await FailedDeletion.findByIdAndDelete(file._id);
                console.log(`✅ Successfully cleaned up: ${file.publicId}`);
            } else {
                file.attemptCount += 1;
                file.lastAttempt = new Date();
                await file.save();
            }
        } catch (error) {
            console.error(`Update attempt failed for ${file.publicId}:`, error.message);
        }
    }
});