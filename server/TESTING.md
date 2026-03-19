# Testing Quick Reference

## 🚀 Quick Start

### 1. Run Tests
```bash
# All tests
npm test

# With coverage
npm test -- --coverage

# Watch mode
npm run test:watch
```

### 2. Quick API Test
```bash
# Windows
test-api.bat

# Linux/Mac
chmod +x test-api.sh
./test-api.sh
```

### 3. Manual Testing
```bash
# Start server
npm run dev

# Check health
curl http://localhost:5000/api/health
```

---

## 📁 Test Files

```
tests/
├── setup.js                    # Test configuration
├── unit/
│   └── auth.test.js           # Authentication tests
└── integration/
    ├── election.test.js       # Election API tests
    └── voting.test.js         # Voting API tests
```

---

## 🧪 Test Coverage

| Feature | Test File | Status |
|---------|-----------|--------|
| Authentication | `unit/auth.test.js` | ✅ |
| Elections | `integration/election.test.js` | ✅ |
| Voting | `integration/voting.test.js` | ✅ |
| Candidates | Manual | ⚠️ |
| Rate Limiting | Manual | ⚠️ |
| Concurrency | `integration/voting.test.js` | ✅ |
| Cloudinary | Manual | ⚠️ |

---

## 📋 Manual Testing Checklist

### Authentication
- [ ] Register voter
- [ ] Login voter
- [ ] Get voter details
- [ ] Test invalid credentials

### Elections (Admin)
- [ ] Create election
- [ ] Get all elections
- [ ] Get single election
- [ ] Update election
- [ ] Delete election

### Candidates (Admin)
- [ ] Create candidate
- [ ] Get all candidates
- [ ] Get single candidate
- [ ] Delete candidate

### Voting
- [ ] Vote for candidate
- [ ] Prevent double vote
- [ ] Check election results
- [ ] Test idempotency

### Security
- [ ] Rate limiting (login)
- [ ] Rate limiting (register)
- [ ] Unauthorized access
- [ ] Admin-only endpoints

---

## 🔧 Common Test Commands

```bash
# Run specific test file
npm test -- tests/unit/auth.test.js

# Run tests by name pattern
npm test -- --testNamePattern="should register"

# Run tests in band (sequential)
npm test -- --runInBand

# Run tests with verbose output
npm test -- --verbose
```

---

## 📊 Test Data

### Default Test Credentials

```javascript
// Admin (after running seed)
Email: admin@example.com
Password: Admin@123456

// Test voter (created in tests)
Email: test{timestamp}@example.com
Password: Password@123
```

---

## 🐛 Debugging

### Enable Debug Logging
```env
NODE_ENV = development
```

### Check Logs
```bash
# Console logs
npm run dev

# Check for errors
tail -f logs/app.log | grep "ERROR"
```

### Database Inspection
```bash
# Connect to MongoDB
mongosh "your-connection-string"

# View collections
show collections

# Query voters
db.voters.find().limit(5)

# Clear test data
db.voters.deleteMany({ email: /test.*@example.com/ })
```

---

## 📈 Performance Testing

### Using Apache Bench
```bash
# 100 requests, 10 concurrent
ab -n 100 -c 10 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/elections
```

### Using Artillery
```bash
# Install
npm install -g artillery

# Run load test
artillery quick --count 10 --num 100 http://localhost:5000/api/health
```

---

## ✅ CI/CD Ready

### GitHub Actions Example
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm install
      - run: npm test
```

---

## 📞 Troubleshooting

| Problem | Solution |
|---------|----------|
| Tests timeout | Increase timeout in jest.config.js |
| MongoDB connection fails | Check MONGO_URL in .env |
| Port already in use | Change PORT in .env |
| Tests fail randomly | Run with --runInBand |
| Coverage not generated | Add --coverage flag |

---

## 📚 Documentation

- Full testing guide: `docs/TESTING_GUIDE.md`
- API documentation: `README.md`
- Design patterns: `docs/DESIGN_PATTERNS.md`
- Cloudinary review: `docs/CLOUDINARY_REVIEW.md`

---

**Last Updated:** March 19, 2026
