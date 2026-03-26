const { v2: cloudinary } = require('cloudinary');
const HttpError = require('../models/errorModel');

// Validate configuration exists
if (!process.env.CLOUDINARY_CLOUD_NAME || 
    !process.env.CLOUDINARY_API_KEY || 
    !process.env.CLOUDINARY_API_SECRET) {
    console.warn('⚠️  Cloudinary credentials not configured. Image uploads will fail.');
}

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Extract public ID from Cloudinary URL
 * 
 * Examples:
 * https://res.cloudinary.com/demo/image/upload/v1234567890/candidates/image-abc123.jpg
 * → candidates/image-abc123
 * 
 * https://res.cloudinary.com/demo/image/upload/v1234567890/folder/subfolder/image.jpg
 * → folder/subfolder/image
 */
function extractPublicId(imageUrl) {
    try {
        const urlParts = imageUrl.split('/');
        
        // Find 'upload' segment
        const uploadIndex = urlParts.indexOf('upload');
        if (uploadIndex === -1) {
            throw new Error('Invalid Cloudinary URL - no upload segment');
        }
        
        // Get folder and filename (after 'upload' segment)
        const pathParts = urlParts.slice(uploadIndex + 2); // Skip version number
        
        // Remove file extension from last part
        const lastPart = pathParts[pathParts.length - 1];
        const fileName = lastPart.split('.')[0];
        pathParts[pathParts.length - 1] = fileName;
        
        // Join to get full public ID
        const publicId = pathParts.join('/');
        
        console.log(`📷 Extracted public ID: ${publicId} from URL`);
        return publicId;
    } catch (error) {
        console.error('❌ Failed to extract public ID:', error.message);
        console.error('   URL:', imageUrl);
        return null;
    }
}

/**
 * Upload file to Cloudinary with retry logic
 * 
 * @param {string} filePath - Local file path
 * @param {string} folder - Cloudinary folder
 * @param {string} publicId - Optional custom public ID
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<string>} Secure URL
 */
async function uploadToCloudinary(filePath, folder, publicId = null, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const uploadOptions = {
                folder,
                resource_type: 'image',
                // Use custom public ID if provided, otherwise Cloudinary generates one
                ...(publicId && { public_id: publicId }),
                // Invalidate CDN cache
                invalidate: true,
                // Overwrite if same public ID exists
                overwrite: publicId ? true : undefined
            };

            const result = await cloudinary.uploader.upload(filePath, uploadOptions);

            // Validate result
            if (!result || !result.secure_url) {
                throw new Error('Cloudinary upload succeeded but no URL returned');
            }

            if (result.error) {
                throw new Error(`Cloudinary error: ${result.error.message}`);
            }

            console.log(`✅ Cloudinary upload successful: ${result.secure_url}`);
            return result.secure_url;

        } catch (error) {
            lastError = error;
            console.warn(`⚠️  Cloudinary upload attempt ${attempt}/${maxRetries} failed:`, error.message);
            
            // Don't retry on certain errors
            if (error.http_code === 400 || error.http_code === 401) {
                console.error('❌ Non-retryable Cloudinary error:', error.message);
                break;
            }
            
            // Wait before retry (exponential backoff)
            if (attempt < maxRetries) {
                const delay = Math.pow(2, attempt) * 500; // 1s, 2s, 4s
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    throw new HttpError(`Cloudinary upload failed after ${maxRetries} attempts: ${lastError.message}`, 500);
}

/**
 * Delete image from Cloudinary
 * 
 * @param {string} imageUrl - Cloudinary image URL
 * @returns {Promise<object>} Deletion result
 */
async function deleteFromCloudinary(imageUrl) {
    try {
        const publicId = extractPublicId(imageUrl);
        
        if (!publicId) {
            throw new Error('Could not extract public ID from URL');
        }

        const result = await cloudinary.uploader.destroy(publicId);
        
        if (result.result !== 'ok' && result.result !== 'not found') {
            console.warn('⚠️  Cloudinary deletion result:', result.result);
        }
        
        console.log(`🗑️  Cloudinary delete successful: ${publicId}`);
        return result;
        
    } catch (error) {
        console.error('❌ Cloudinary deletion failed:', error.message);

        // Simpan ke database agar bisa di-retry oleh background job
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

        // Don't throw - deletion failure shouldn't break the flow
        return { result: 'failed', error: error.message };
    }
}

/**
 * Verify Cloudinary connection
 * @returns {Promise<boolean>}
 */
async function verifyCloudinaryConnection() {
    try {
        // Try to get API usage (lightweight operation)
        const result = await cloudinary.api.ping();
        console.log('✅ Cloudinary connection verified');
        return true;
    } catch (error) {
        console.error('❌ Cloudinary connection failed:', error.message);
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
