const { Router } = require('express');
const router = Router();
const { registerVoter, loginVoter, getVoter } = require('./auth.controller');
const { authMiddleware } = require('../../shared/middleware/authMiddleware');
const { registerLimiter, loginLimiter } = require('../../shared/middleware/rateLimitMiddleware');
const { validate } = require('../../shared/middleware/validationMiddleware');
const { registerSchema, loginSchema } = require('../../shared/validations/authValidation');

// Move validations folder to shared too? Yes, I should have done that.
// Wait, I put them in server/validations. I'll move them to server/src/shared/validations.

router.post('/register', registerLimiter, registerSchema, validate, registerVoter);
router.post('/login', loginLimiter, loginSchema, validate, loginVoter);
router.get('/:id', authMiddleware, getVoter);

module.exports = router;
