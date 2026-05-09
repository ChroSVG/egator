const { Schema, model, Types } = require("mongoose");

/**
 * VoteRecord Model
 * 
 * Tracks individual votes to ensure one vote per voter per election.
 * The unique compound index on voter + election prevents duplicate votes
 * at the database level, providing the final safeguard against race conditions.
 */

const voteRecordSchema = new Schema({
    voter: {
        type: Types.ObjectId,
        ref: 'Voter',
        required: true
    },
    election: {
        type: Types.ObjectId,
        ref: 'Election',
        required: true
    },
    candidate: {
        type: Types.ObjectId,
        ref: 'Candidate',
        required: true
    },
    votedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Compound unique index - prevents same voter from voting twice in same election
// This is the database-level safeguard against race conditions
voteRecordSchema.index({ voter: 1, election: 1 }, { unique: true });

// Additional indexes for query performance
voteRecordSchema.index({ election: 1, candidate: 1 });
voteRecordSchema.index({ voter: 1, votedAt: -1 });

module.exports = model('VoteRecord', voteRecordSchema);
