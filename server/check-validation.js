const fs = require('fs');
const v = require('./middleware/validationMiddleware');

const result = {
    validateEmail: Array.isArray(v.validateEmail) ? 'array' : typeof v.validateEmail,
    validatePassword: Array.isArray(v.validatePassword) ? 'array' : typeof v.validatePassword,
    validateCreateElection: Array.isArray(v.validateCreateElection) ? 'array' : typeof v.validateCreateElection,
    validateVote: Array.isArray(v.validateVote) ? 'array' : typeof v.validateVote
};

fs.writeFileSync('test-output.txt', JSON.stringify(result, null, 2));
console.log('Result written to test-output.txt');
