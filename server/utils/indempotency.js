


const express = require('express');
const router = express.Router();
const idempotencyGuard = require('../middleware/idempotency-guard');
const voteController = require('../controllers/vote-controller');

// Request harus lewat guard dulu
router.post('/vote/:id', idempotencyGuard, voteController.voteForCandidate);

module.exports = router;


// Contoh di Frontend (Axios)
const vote = async () => {
    const requestKey = uuidv4(); // Buat ID unik sekali saja
    await axios.post('/api/vote/candidate123', data, {
        headers: { 'x-idempotency-key': requestKey }
    });
}