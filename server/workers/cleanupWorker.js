const cron = require('node-cron');
const FailedDeletion = require('../models/failedDeletionModel');
const { cloudinary } = require('../utils/cloudinary');
const config = require('../config');

// Schedule cleanup based on config
cron.schedule(config.worker.cleanupSchedule, async () => {
    console.log(`🔄 Running scheduled cleanup for failed deletions (${new Date().toLocaleString()})...`);
    
    try {
        const failedFiles = await FailedDeletion.find({ 
            attemptCount: { $lt: config.worker.maxRetryAttempts } 
        });

        if (failedFiles.length === 0) {
            console.log('✅ No failed deletions to clean up.');
            return;
        }

        console.log(`📂 Found ${failedFiles.length} files to retry...`);

        for (const file of failedFiles) {
            try {
                const result = await cloudinary.uploader.destroy(file.publicId);
                
                if (result.result === 'ok' || result.result === 'not found') {
                    await FailedDeletion.findByIdAndDelete(file._id);
                    console.log(`   ✅ Successfully cleaned up: ${file.publicId}`);
                } else {
                    file.attemptCount += 1;
                    file.lastAttempt = new Date();
                    await file.save();
                    console.warn(`   ⚠️  Cloudinary returned: ${result.result} for ${file.publicId}`);
                }
            } catch (error) {
                console.error(`   ❌ Update attempt failed for ${file.publicId}:`, error.message);
                file.attemptCount += 1;
                file.lastAttempt = new Date();
                await file.save();
            }
        }
    } catch (error) {
        console.error('❌ Critical error in cleanup worker:', error.message);
    }
});

console.log(`👷 Cleanup worker initialized (Schedule: ${config.worker.cleanupSchedule})`);