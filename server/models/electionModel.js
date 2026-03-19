const { Schema, model, Types } = require("mongoose");

const electionSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: [200, "Title must be less than 200 characters"]
    },
    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: [2000, "Description must be less than 2000 characters"]
    },
    thumbnail: {
        type: String,
        required: true
    },
    candidates: [{
        type: Types.ObjectId,
        ref: 'Candidate',
        default: []
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    startsAt: {
        type: Date
    },
    endsAt: {
        type: Date
    }
}, { timestamps: true });

// Index for sorting by creation date
electionSchema.index({ createdAt: -1 });

// Index for active elections
electionSchema.index({ isActive: 1, createdAt: -1 });

module.exports = model('Election', electionSchema);
