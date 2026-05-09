const path = require('path');
const fs = require('fs').promises;
const { v4: uuid } = require('uuid');
const { uploadToCloudinary } = require('./cloudinary');

/**
 * Shared helper to upload an image to Cloudinary via a local temporary file.
 * @param {object} file - Uploaded file (from express-fileupload)
 * @param {string} folder - Cloudinary folder name
 * @returns {Promise<string>} - The URL of the uploaded image
 */
const uploadImageHelper = async (file, folder) => {
    const fileName = `${file.name.split('.')[0]}-${uuid()}${path.extname(file.name)}`;
    const filePath = path.join(__dirname, '..', 'uploads', fileName);
    
    // Flag to check if the file was created locally
    let fileExists = false;

    try {
        // 1. Save file to local temporary storage
        await file.mv(filePath);
        fileExists = true;

        // 2. Upload to Cloudinary
        const imageUrl = await uploadToCloudinary(filePath, folder);

        return imageUrl;
    } catch (error) {
        console.error('❌ Error in uploadImageHelper:', error.message);
        throw error;
    } finally {
        // 3. Cleanup local temporary file
        if (fileExists) {
            try {
                await fs.unlink(filePath);
            } catch (cleanupError) {
                if (cleanupError.code !== 'ENOENT') {
                    console.warn('⚠️ Failed to cleanup file:', cleanupError.message);
                }
            }
        }
    }
};

module.exports = { uploadImageHelper };
