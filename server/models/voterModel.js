const { Schema, model, Types } = require("mongoose");

const voterSchema = new Schema({
    fullName: {
        type: String,
        required: [true, "Nama lengkap wajib diisi"],
        trim: true
    },
    email: {
        type: String,
        required: [true, "Email wajib diisi"],
        unique: true,
        lowercase: true,
        trim: true,
        maxlength: [255, "Email must be less than 255 characters"]
    },
    password: {
        type: String,
        required: true,
        minlength: [8, "Password must be at least 8 characters"]
    },
    votedElections: [{
        type: Types.ObjectId,
        ref: 'Election',
        default: []
    }],
    isAdmin: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Index for faster lookups when checking if user has voted
voterSchema.index({ _id: 1, votedElections: 1 });

// Index for admin lookups
voterSchema.index({ isAdmin: 1 });

// Index for email lookups (case-insensitive)
voterSchema.index({ email: 1 });

module.exports = model('Voter', voterSchema);
