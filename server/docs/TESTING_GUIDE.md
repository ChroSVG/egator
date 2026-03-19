# Testing Guide - Egator Voting API

Complete testing guide for the voting application.

---

## 📋 Table of Contents

1. [Setup](#1-setup)
2. [Run Tests](#2-run-tests)
3. [Manual Testing](#3-manual-testing)
4. [API Testing with cURL](#4-api-testing-with-curl)
5. [Cloudinary Testing](#5-cloudinary-testing)
6. [Concurrency Testing](#6-concurrency-testing)
7. [Test Checklist](#7-test-checklist)

---

## 1. Setup

### 1.1 Install Dependencies

```bash
npm install
```

### 1.2 Configure Test Environment

Create `.env.test` or update `.env`:

```env
# Test Environment
NODE_ENV = test
PORT = 5001

# MongoDB (use separate test database)
MONGO_URL = mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/voting-app-test?retryWrites=true&w=majority

# JWT
JWT_SECRET = test-secret-key-for-testing-only-min-32-chars
JWT_EXPIRES_IN = 1d

# Cloudinary (use test account or skip)
CLOUDINARY_CLOUD_NAME = your_test_cloud_name
CLOUDINARY_API_KEY = your_test_api_key
CLOUDINARY_API_SECRET = your_test_api_secret

# Redis (optional for testing)
REDIS_URL = redis://localhost:6379
```

### 1.3 Start Test Database

**Option A: MongoDB Atlas (Recommended)**
- Use a separate test database on Atlas

**Option B: Local MongoDB**
```bash
mongod --dbpath /data/db --port 27017
```

**Option C: In-Memory (for unit tests)**
- Already configured in `jest.config.js` via `mongodb-memory-server`

---

## 2. Run Tests

### 2.1 Run All Tests

```bash
npm test
```

### 2.2 Run Tests in Watch Mode

```bash
npm run test:watch
```

### 2.3 Run Tests with Coverage

```bash
npm test -- --coverage
```

View coverage report:
```bash
open coverage/index.html  # Mac
start coverage/index.html  # Windows
```

### 2.4 Run Specific Test File

```bash
npm test -- tests/unit/auth.test.js
```

### 2.5 Run Tests by Pattern

```bash
npm test -- --testNamePattern="should register"
```

### 2.6 Run Tests Sequentially (for debugging)

```bash
npm test -- --runInBand
```

---

## 3. Manual Testing

### 3.1 Start Server

```bash
npm run dev
```

Server runs on: `http://localhost:5000`

### 3.2 Test Health Endpoint

```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-03-19T...",
  "uptime": 123.456,
  "environment": "development",
  "services": {
    "mongodb": "connected",
    "cache": "memory",
    "circuitBreakers": {...}
  }
}
```

---

## 4. API Testing with cURL

### 4.1 Register Voter

```bash
curl -X POST http://localhost:5000/api/voters/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "email": "john@example.com",
    "password": "Password@123",
    "password2": "Password@123"
  }'
```

Expected: `201 Created`
```json
{
  "message": "Voter John Doe registered successfully!",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "voter": {
    "id": "...",
    "fullName": "John Doe",
    "email": "john@example.com",
    "isAdmin": false
  }
}
```

### 4.2 Login

```bash
curl -X POST http://localhost:5000/api/voters/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "Password@123"
  }'
```

Expected: `200 OK`

### 4.3 Create Admin (via seed script)

```bash
# Update .env with admin credentials
ADMIN_EMAIL = admin@example.com
ADMIN_PASSWORD = Admin@123456

# Run seed
npm run seed:admin
```

### 4.4 Create Election (Admin Only)

```bash
# Save token from login response
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X POST http://localhost:5000/api/elections \
  -H "Content-Type: multipart/form-data" \
  -H "Authorization: Bearer $TOKEN" \
  -F "title=Presidential Election 2024" \
  -F "description=Vote for the next president" \
  -F "thumbnail=@/path/to/image.jpg"
```

Expected: `201 Created`

### 4.5 Get Elections

```bash
curl -X GET "http://localhost:5000/api/elections?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

### 4.6 Create Candidate (Admin Only)

```bash
curl -X POST http://localhost:5000/api/candidates \
  -H "Authorization: Bearer $TOKEN" \
  -F "fullName=Jane Smith" \
  -F "motto=A better future" \
  -F "election=<ELECTION_ID>" \
  -F "image=@/path/to/candidate.jpg"
```

### 4.7 Vote for Candidate

```bash
# Generate unique idempotency key
IDEMPOTENCY_KEY=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")

curl -X PATCH "http://localhost:5000/api/candidates/<CANDIDATE_ID>/vote" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Idempotency-Key: $IDEMPOTENCY_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "selectedElectionId": "<ELECTION_ID>"
  }'
```

Expected: `200 OK`

### 4.8 Get Election Results

```bash
curl -X GET "http://localhost:5000/api/elections/<ELECTION_ID>/results" \
  -H "Authorization: Bearer $TOKEN"
```

### 4.9 Test Rate Limiting

```bash
# Try to login 6 times rapidly (limit is 5)
for i in {1..6}; do
  curl -X POST http://localhost:5000/api/voters/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
  echo ""
done
```

Expected: 6th request returns `429 Too Many Requests`

### 4.10 Test Duplicate Vote Prevention

```bash
# First vote (should succeed)
curl -X PATCH "http://localhost:5000/api/candidates/<CANDIDATE_ID>/vote" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Idempotency-Key: unique-key-123" \
  -H "Content-Type: application/json" \
  -d '{"selectedElectionId": "<ELECTION_ID>"}'

# Second vote with same key (should fail with 429)
curl -X PATCH "http://localhost:5000/api/candidates/<CANDIDATE_ID>/vote" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Idempotency-Key: unique-key-123" \
  -H "Content-Type: application/json" \
  -d '{"selectedElectionId": "<ELECTION_ID>"}'
```

---

## 5. Cloudinary Testing

### 5.1 Verify Cloudinary Connection

```bash
curl http://localhost:5000/api/health
```

Check `services.cloudinary` in response.

### 5.2 Test Image Upload

```bash
# Create test image (1x1 pixel PNG)
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" | base64 -d > test-image.png

# Upload via candidate creation
curl -X POST http://localhost:5000/api/candidates \
  -H "Authorization: Bearer $TOKEN" \
  -F "fullName=Test Candidate" \
  -F "motto=Test motto" \
  -F "election=<ELECTION_ID>" \
  -F "image=@test-image.png"
```

### 5.3 Verify Image Deletion

1. Create candidate with image
2. Note the image URL from response
3. Delete candidate:
```bash
curl -X DELETE "http://localhost:5000/api/candidates/<CANDIDATE_ID>" \
  -H "Authorization: Bearer $TOKEN"
```
4. Check Cloudinary dashboard - image should be gone
5. Check `uploads/` folder - should be empty

### 5.4 Test Circuit Breaker

Simulate Cloudinary failure by temporarily setting invalid credentials:

```env
CLOUDINARY_API_KEY = invalid_key
```

Restart server and try to upload. After 3 failures, circuit should open.

Check status:
```bash
curl http://localhost:5000/api/admin/circuit-breakers
```

---

## 6. Concurrency Testing

### 6.1 Test Double Vote Prevention (Sequential)

```bash
# Login as voter
LOGIN_RESPONSE=$(curl -X POST http://localhost:5000/api/voters/login \
  -H "Content-Type: application/json" \
  -d '{"email":"voter@example.com","password":"Password@123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Vote twice
curl -X PATCH "http://localhost:5000/api/candidates/<CANDIDATE_ID>/vote" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Idempotency-Key: test-key-1" \
  -H "Content-Type: application/json" \
  -d '{"selectedElectionId": "<ELECTION_ID>"}'

curl -X PATCH "http://localhost:5000/api/candidates/<CANDIDATE_ID>/vote" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Idempotency-Key: test-key-2" \
  -H "Content-Type: application/json" \
  -d '{"selectedElectionId": "<ELECTION_ID>"}'
```

Second vote should fail with `409 Conflict` (already voted).

### 6.2 Test Concurrent Votes (Parallel)

Create test script `test-concurrent-vote.sh`:

```bash
#!/bin/bash

TOKEN="your_auth_token"
CANDIDATE_ID="candidate_id"
ELECTION_ID="election_id"

# Send 10 concurrent votes
for i in {1..10}; do
  curl -X PATCH "http://localhost:5000/api/candidates/$CANDIDATE_ID/vote" \
    -H "Authorization: Bearer $TOKEN" \
    -H "X-Idempotency-Key: concurrent-key-$i" \
    -H "Content-Type: application/json" \
    -d "{\"selectedElectionId\": \"$ELECTION_ID\"}" &
done

wait

# Check candidate vote count
curl -X GET "http://localhost:5000/api/candidates/$CANDIDATE_ID" \
  -H "Authorization: Bearer $TOKEN"
```

Expected: Only 1 vote should be counted (per voter).

### 6.3 Test Vote Queue

```bash
# Send multiple votes rapidly for same election
for i in {1..5}; do
  curl -X PATCH "http://localhost:5000/api/candidates/<CANDIDATE_ID>/vote" \
    -H "Authorization: Bearer $TOKEN" \
    -H "X-Idempotency-Key: queue-test-$i" \
    -H "Content-Type: application/json" \
    -d '{"selectedElectionId": "<ELECTION_ID>"}' &
done

wait
```

Check response headers:
- `X-Queue-Position`: Shows position in queue
- `X-Queue-Status`: Shows "queued" if waiting

---

## 7. Test Checklist

### Authentication
- [ ] Register with valid data → 201
- [ ] Register with duplicate email → 409
- [ ] Register with weak password → 400
- [ ] Register with mismatched passwords → 400
- [ ] Login with valid credentials → 200
- [ ] Login with invalid email → 401
- [ ] Login with invalid password → 401
- [ ] Access protected route without token → 401
- [ ] Access protected route with expired token → 401

### Elections (Admin)
- [ ] Create election with valid data → 201
- [ ] Create election without image → 400
- [ ] Create election with non-image file → 400
- [ ] Create election with large file (>1MB) → 400
- [ ] Get all elections → 200
- [ ] Get single election → 200
- [ ] Get non-existent election → 404
- [ ] Update election → 200
- [ ] Delete election → 200
- [ ] Non-admin tries to create → 403

### Candidates (Admin)
- [ ] Create candidate with valid data → 201
- [ ] Create candidate without image → 400
- [ ] Get all candidates → 200
- [ ] Get candidates by election → 200
- [ ] Get single candidate → 200
- [ ] Delete candidate → 200
- [ ] Delete non-existent candidate → 404

### Voting
- [ ] Vote with valid data → 200
- [ ] Vote without idempotency key → 200 (allowed but logged)
- [ ] Vote with duplicate idempotency key → 429
- [ ] Vote twice in same election → 409
- [ ] Vote in different elections → 200 (allowed)
- [ ] Vote for non-existent candidate → 404
- [ ] Vote with invalid election ID → 400

### Rate Limiting
- [ ] 5 login attempts → All succeed
- [ ] 6th login attempt → 429
- [ ] 3 registrations in 1 hour → All succeed
- [ ] 4th registration → 429
- [ ] Wait 15 minutes → Rate limit resets

### Caching
- [ ] Get elections → Check response time
- [ ] Get same elections again → Should be faster (cached)
- [ ] Update election → Cache invalidated
- [ ] Get elections after update → Should fetch from DB

### Circuit Breaker
- [ ] Normal Cloudinary operation → Success
- [ ] Simulate 3 failures → Circuit opens
- [ ] Try upload while open → Immediate failure
- [ ] Wait for timeout → Circuit half-open
- [ ] Successful upload → Circuit closes

### Database
- [ ] MongoDB connection fails → Graceful error
- [ ] Transaction rollback → Data consistent
- [ ] Concurrent updates → No data corruption

### File Handling
- [ ] Upload image → File saved to Cloudinary
- [ ] Upload image → Local file cleaned up
- [ ] Delete candidate → Image removed from Cloudinary
- [ ] Failed upload → Local file cleaned up

### Error Handling
- [ ] Invalid JSON → 400
- [ ] Non-existent route → 404
- [ ] Server error → 500 with consistent format
- [ ] Validation error → 400 with field details

---

## 8. Postman/Insomnia Collection

Import this collection for easier testing:

```json
{
  "info": {
    "name": "Egator Voting API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:5000/api"
    },
    {
      "key": "token",
      "value": ""
    }
  ],
  "item": [
    {
      "name": "Auth",
      "item": [
        {
          "name": "Register Voter",
          "request": {
            "method": "POST",
            "header": [{"key": "Content-Type", "value": "application/json"}],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"fullName\": \"Test User\",\n  \"email\": \"test@example.com\",\n  \"password\": \"Password@123\",\n  \"password2\": \"Password@123\"\n}"
            },
            "url": {"raw": "{{baseUrl}}/voters/register"}
          }
        },
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "header": [{"key": "Content-Type", "value": "application/json"}],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"test@example.com\",\n  \"password\": \"Password@123\"\n}"
            },
            "url": {"raw": "{{baseUrl}}/voters/login"}
          },
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "var jsonData = pm.response.json();",
                  "pm.collectionVariables.set('token', jsonData.token);"
                ]
              }
            }
          ]
        }
      ]
    },
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": {"raw": "{{baseUrl}}/health"}
      }
    }
  ]
}
```

---

## 9. Debugging Tips

### Enable Verbose Logging

```env
NODE_ENV = development
```

### Check Logs

```bash
# Server logs
npm run dev

# Check for specific errors
tail -f logs/app.log | grep "ERROR"
```

### Database Inspection

```bash
# Connect to MongoDB
mongosh "mongodb+srv://..."

# Check voters
db.voters.find()

# Check elections
db.elections.find()

# Check candidates
db.candidates.find()

# Check vote records
db.voterecords.find()
```

### Cache Inspection

```bash
# Check cache stats
curl http://localhost:5000/api/admin/cache-stats
```

---

## 10. Performance Testing

### Using Apache Bench

```bash
# Test election endpoint (100 requests, 10 concurrent)
ab -n 100 -c 10 \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/elections
```

### Using Artillery

Install:
```bash
npm install -g artillery
```

Create `load-test.yml`:
```yaml
config:
  target: "http://localhost:5000/api"
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Get Elections"
    requests:
      - get:
          url: "/elections"
          headers:
            Authorization: "Bearer {{ $env(TOKEN) }}"
```

Run:
```bash
export TOKEN="your_token"
artillery run load-test.yml
```

---

**Last Updated:** March 19, 2026
