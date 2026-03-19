
const HttpError = require('../models/errorModel'); // Sesuaikan path-mu
const IdempotencyModel = require('../models/idempotencyModel');

const idempotencyGuard = async (req, res, next) => {
    // 1. Ambil key dari header (Frontend wajib mengirimkan UUID unik per klik)
    const key = req.headers['x-idempotency-key'];

    if (!key) {
        // Jika tidak ada key, kita anggap ini request biasa (atau tolak jika wajib)
        return next(); 
    }

    try {
        // 2. Coba simpan key ke database
        // Jika key sudah ada, MongoDB akan lempar error 'Duplicate Key' karena unique: true
        await IdempotencyModel.create({ key });
        
        // Jika berhasil simpan, lanjut ke controller
        next();
    } catch (error) {
        // 3. Jika error E11000 (Duplicate Key), berarti request ini sedang/sudah diproses
        if (error.code === 11000) {
            return next(new HttpError("Request is being processed or already completed. Please wait.", 429));
        }
        next(new HttpError("Idempotency check failed", 500));
    }
};

module.exports = idempotencyGuard;
