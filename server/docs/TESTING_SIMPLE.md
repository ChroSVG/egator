# Testing Guide - Egator Voting API

## 🚀 Quick Start

### Run All Tests
```bash
npm test
```

### Run Specific Test Categories
```bash
# Unit tests
npm test -- tests/unit/

# Integration tests
npm test -- tests/integration/

# Specific test file
npm test -- tests/unit/services/authService.test.js
```

---

## 📁 Test Files

### Unit Tests (10 files)
```
tests/unit/
├── auth.test.js                        # Authentication integration tests
├── repositories/
│   ├── candidateRepository.test.js     # 10 tests
│   └── voterRepository.test.js         # 11 tests
├── services/
│   ├── authService.test.js             # 13 tests
│   └── votingService.test.js           # 17 tests
├── middleware/
│   ├── authMiddleware.test.js          # 10 tests
│   └── rateLimitMiddleware.test.js     # 5 tests
├── commands/
│   └── voteCommand.test.js             # 20 tests
└── utils/
    └── circuitBreaker.test.js          # 12 tests (Redis tests skipped)
```

### Integration Tests (2 files)
```
tests/integration/
├── election.test.js                    # 10 tests
└── voting.test.js                      # 12 tests
```

---

## ✅ Test Coverage

| Category | Tests | Status |
|----------|-------|--------|
| Repositories | 21 | ✅ |
| Services | 30 | ✅ |
| Middleware | 15 | ✅ |
| Commands | 20 | ✅ |
| Utils | 12 | ✅ |
| Integration | 22 | ✅ |
| **Total** | **120** | ✅ |

---

## 🧪 What's Tested

### Authentication
- ✅ User registration
- ✅ User login
- ✅ Password validation
- ✅ Duplicate email prevention
- ✅ Token generation/verification

### Repositories
- ✅ CRUD operations
- ✅ Custom queries
- ✅ Search functionality
- ✅ Statistics calculation

### Services
- ✅ Business logic
- ✅ Error handling
- ✅ Validation
- ✅ Transaction management

### Middleware
- ✅ Authentication
- ✅ Authorization
- ✅ Rate limiting
- ✅ Error handling

### Commands
- ✅ Vote execution
- ✅ Vote undo/redo
- ✅ Validation
- ✅ Command queue

### Circuit Breaker
- ✅ State transitions
- ✅ Failure handling
- ✅ Fallback execution
- ✅ Timeout handling

---

## 📊 Test Results

Expected output:
```
 PASS  tests/unit/repositories/candidateRepository.test.js
  CandidateRepository
    ✓ findByElection (5 ms)
    ✓ findByIdWithElection (2 ms)
    ...

 PASS  tests/unit/services/authService.test.js
  AuthService
    ✓ register (10 ms)
    ✓ login (5 ms)
    ...

Test Suites: 10 passed, 10 total
Tests:       120 passed, 120 total
```

---

## 🔧 Troubleshooting

### "Cannot find module" Error
Make sure all import paths use `../../../` for nested test files.

### Test Timeout
Increase timeout in `jest.config.js`:
```javascript
testTimeout: 60000
```

### MongoDB Connection Error
Check `MONGO_URL` in `.env` or use in-memory MongoDB (configured in `tests/setup.js`).

---

## 📝 Writing New Tests

### Test Template
```javascript
const Service = require('../../../services/serviceName');

describe('ServiceName', () => {
    let service;

    beforeEach(() => {
        service = new Service();
        jest.clearAllMocks();
    });

    it('should do something', async () => {
        // Arrange
        // Act
        // Assert
    });
});
```

### Mocking Dependencies
```javascript
// Mock repository
jest.mock('../../../repositories/repoName');

// Mock service
jest.mock('../../../services/serviceName');

// Mock model
jest.mock('../../../models/modelName');
```

---

**Last Updated:** March 19, 2026
**Total Tests:** 120
