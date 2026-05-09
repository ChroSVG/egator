const mongoose = require('mongoose');

const idempotencySchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true }, // UUID dari Frontend
    expiresAt: { type: Date, expires: 300 } // Otomatis hapus setelah 5 menit (300 detik)
});

const IdempotencyModel = mongoose.model('Idempotency', idempotencySchema);

module.exports = IdempotencyModel;