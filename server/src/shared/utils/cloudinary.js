const { v2: cloudinary } = require('cloudinary');
const HttpError = require('../models/errorModel');
const config = require('../config');
const FailedDeletion = require('../models/failedDeletion.model');

// Validate configuration exists
if (!config.cloudinary.cloudName || 
    !config.cloudinary.apiKey || 
    !config.cloudinary.apiSecret) {
    console.warn('⚠️  Cloudinary credentials not configured. Image uploads will fail.');
}

cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
});

/**
 * Extract public ID from Cloudinary URL
 */
function extractPublicId(imageUrl) {
    try {
        const urlParts = imageUrl.split('/');
        const uploadIndex = urlParts.indexOf('upload');
        if (uploadIndex === -1) {
            throw new Error('Invalid Cloudinary URL - no upload segment');
        }
        
        const pathParts = urlParts.slice(uploadIndex + 2);
        const lastPart = pathParts[pathParts.length - 1];
        const fileName = lastPart.split('.')[0];
        pathParts[pathParts.length - 1] = fileName;
        
        return pathParts.join('/');
    } catch (error) {
        return null;
    }
}

/**
 * Upload file to Cloudinary with retry logic
 */
async function uploadToCloudinary(filePath, folder, publicId = null, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const uploadOptions = {
                folder,
                resource_type: 'image',
                ...(publicId && { public_id: publicId }),
                invalidate: true,
                overwrite: publicId ? true : undefined
            };

            const result = await cloudinary.uploader.upload(filePath, uploadOptions);

            if (!result || !result.secure_url) {
                throw new Error('Cloudinary upload succeeded but no URL returned');
            }

            return result.secure_url;

        } catch (error) {
            lastError = error;
            if (error.http_code === 400 || error.http_code === 401) break;
            
            if (attempt < maxRetries) {
                const delay = Math.pow(2, attempt) * 500;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    throw new HttpError(`Cloudinary upload failed after ${maxRetries} attempts: ${lastError.message}`, 500);
}

/**
 * Delete image from Cloudinary
 */
async function deleteFromCloudinary(imageUrl) {
    let publicId;
    try {
        publicId = extractPublicId(imageUrl);
        
        if (!publicId) {
            throw new Error('Could not extract public ID from URL');
        }

        const result = await cloudinary.uploader.destroy(publicId);
        return result;
        
    } catch (error) {
        if (publicId) {
            await FailedDeletion.findOneAndUpdate(
                { publicId }, 
                { 
                    imageUrl, 
                    reason: error.message, 
                    $inc: { attemptCount: 1 },
                    lastAttempt: new Date() 
                },
                { upsert: true }
            ).catch(dbErr => console.error('CRITICAL: Failed to log failed deletion!', dbErr));
        }

        return { result: 'failed', error: error.message };
    }
}

/**
 * Verify Cloudinary connection
 */
async function verifyCloudinaryConnection() {
    try {
        await cloudinary.api.ping();
        return true;
    } catch (error) {
        return false;
    }
}

module.exports = {
    cloudinary,
    extractPublicId,
    uploadToCloudinary,
    deleteFromCloudinary,
    verifyCloudinaryConnection
};
