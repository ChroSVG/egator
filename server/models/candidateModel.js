const { Schema, model, Types } = require("mongoose");

const candidateSchema = new Schema({
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    image: {
        type: String,
        required: true
    },
    motto: {
        type: String,
        required: true,
        trim: true
    },
    voteCount: {
        type: Number,
        default: 0,
        min: 0
    },
    version: {
        type: Number,
        default: 0
    },
    // Support multiple elections
    elections: [{
        type: Types.ObjectId,
        ref: 'Election'
    }],

}, { timestamps: true });

// Indexes for better query performance - FIXED to use 'elections'
candidateSchema.index({ elections: 1, voteCount: -1 });
candidateSchema.index({ elections: 1, createdAt: -1 });

module.exports = model('Candidate', candidateSchema);
