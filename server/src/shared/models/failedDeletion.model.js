const mongoose = require('mongoose');

const failedDeletionSchema = new mongoose.Schema({
    publicId: { type: String, required: true },
    imageUrl: { type: String },
    reason: { type: String },
    attemptCount: { type: Number, default: 0 },
    lastAttempt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('FailedDeletion', failedDeletionSchema);