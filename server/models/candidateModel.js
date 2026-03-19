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
    election: {
        type: Types.ObjectId,
        ref: 'Election',
        required: true
    }
}, { timestamps: true });

// Indexes for better query performance
candidateSchema.index({ election: 1, voteCount: -1 });
candidateSchema.index({ election: 1, createdAt: -1 });

module.exports = model('Candidate', candidateSchema);
