const { Schema, model, Types } = require("mongoose");

const voterSchema = new Schema({
    fullName: {
        type: String,
        required: [true, "Nama lengkap wajib diisi"],
        trim: true // Menghapus spasi di awal/akhir secara otomatis
    },
    email: {
        type: String,
        required: [true, "Email wajib diisi"],
        unique: true,
        lowercase: true, // Memastikan 'User@Mail.com' jadi 'user@mail.com'
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    // Menggunakan ref ke Election untuk integritas relasi
    votedElections: [{
        type: Types.ObjectId,
        ref: 'Election',
        default: [] // Memberikan default array kosong agar tidak undefined
    }],
    isAdmin: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Optional: Tambahkan index untuk mempercepat pencarian jika user sudah vote
voterSchema.index({ _id: 1, votedElections: 1 });

module.exports = model('Voter', voterSchema);