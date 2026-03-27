# Candidate-Election Management API

## 📋 Overview

Dengan many-to-many relationship, sekarang Anda bisa **mengelola candidate di multiple elections** tanpa harus menghapus candidate.

## 🔗 New Endpoints

### 1. **Add Candidate to Election**
Link existing candidate ke election baru.

```http
POST /api/candidates/:id/elections/:electionId
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "message": "Candidate added to election successfully!",
  "data": {
    "_id": "candidate_id",
    "fullName": "John Doe",
    "elections": ["election1", "election2"]
  }
}
```

**Use Case:** Candidate yang sama ikut di multiple elections (e.g., Presidential & Gubernatorial).

---

### 2. **Remove Candidate from Election**
Unlink candidate dari election **tanpa menghapus** candidate dari database.

```http
DELETE /api/candidates/:id/elections/:electionId
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "message": "Candidate removed from election successfully!",
  "data": {
    "_id": "candidate_id",
    "fullName": "John Doe",
    "elections": ["election1"]  // election2 removed
  }
}
```

**Use Case:** Candidate mengundurkan diri dari election tertentu.

---

### 3. **Move Candidate to Different Election**
Pindahkan candidate dari satu election ke election lain dalam satu operasi.

```http
POST /api/candidates/:id/move
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "fromElectionId": "election1_id",
  "toElectionId": "election2_id"
}
```

**Response:**
```json
{
  "message": "Candidate moved successfully!",
  "data": {
    "_id": "candidate_id",
    "fullName": "John Doe",
    "elections": ["election2"]  // moved from election1 to election2
  }
}
```

**Use Case:** Candidate dipindahkan karena kesalahan election atau perubahan strategi.

---

## 📝 Examples

### Example 1: Add Candidate to Another Election

```bash
# Candidate "John Doe" sudah ada di Election A
# Sekarang tambahkan ke Election B

curl -X POST http://localhost:5000/api/candidates/65a1234567890abcdef123456/elections/65b7890123456789abcdef789 \
  -H "Authorization: Bearer <admin_token>"
```

**Result:**
- Candidate sekarang ada di Election A **dan** Election B
- Vote counting tetap terpisah per election

---

### Example 2: Remove Candidate from Election

```bash
# Remove candidate from specific election only

curl -X DELETE http://localhost:5000/api/candidates/65a1234567890abcdef123456/elections/65b7890123456789abcdef789 \
  -H "Authorization: Bearer <admin_token>"
```

**Result:**
- Candidate tetap ada di database
- Candidate hanya dihapus dari election ini
- Jika candidate ada di election lain, tetap utuh

---

### Example 3: Move Candidate Between Elections

```bash
# Move candidate from Election A to Election B

curl -X POST http://localhost:5000/api/candidates/65a1234567890abcdef123456/move \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "fromElectionId": "65a111111111111111111111",
    "toElectionId": "65b222222222222222222222"
  }'
```

**Result:**
- Candidate dihapus dari Election A
- Candidate ditambahkan ke Election B
- Vote count reset (karena election berbeda)

---

## 🔒 Permissions

Semua endpoint ini **hanya untuk admin**:
- ✅ `adminLimiter` middleware applied
- ✅ `adminOnly` middleware applied
- ❌ Regular voters cannot access

---

## ⚠️ Important Notes

### 1. **Vote Count is Per-Election**
Setiap election punya vote count sendiri:
```javascript
// Candidate di 2 elections
{
  fullName: "John Doe",
  elections: ["election1", "election2"]
}

// Vote count terpisah
// Election 1: 100 votes
// Election 2: 50 votes
```

### 2. **Cannot Vote After Moving**
Jika voter sudah vote di Election A, dan candidate dipindahkan ke Election B:
- Voter **tidak bisa** vote lagi untuk candidate yang sama di Election B
- Ini karena voter sudah vote di election tersebut

### 3. **Cache Invalidation**
Setiap operasi akan invalidate cache:
- Candidate cache
- Source election cache (jika remove/move)
- Destination election cache (jika add/move)

---

## 🧪 Testing

### Test Add to Election:
```bash
# 1. Create candidate in Election 1
curl -X POST http://localhost:5000/api/candidates \
  -H "Authorization: Bearer <admin_token>" \
  -F "fullName=John Doe" \
  -F "motto=Vote for change" \
  -F "election=65a111111111111111111111" \
  -F "image=@candidate.jpg"

# 2. Add same candidate to Election 2
curl -X POST http://localhost:5000/api/candidates/:id/elections/65b222222222222222222222 \
  -H "Authorization: Bearer <admin_token>"

# 3. Verify candidate in both elections
curl http://localhost:5000/api/candidates/:id \
  -H "Authorization: Bearer <token>"
```

### Test Remove from Election:
```bash
# Remove candidate from Election 1 only
curl -X DELETE http://localhost:5000/api/candidates/:id/elections/65a111111111111111111111 \
  -H "Authorization: Bearer <admin_token>"

# Candidate still exists in Election 2
```

### Test Move:
```bash
# Move from Election 1 to Election 2
curl -X POST http://localhost:5000/api/candidates/:id/move \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "fromElectionId": "65a111111111111111111111",
    "toElectionId": "65b222222222222222222222"
  }'
```

---

## 📊 Database Operations

### Add to Election:
```javascript
// Candidate.elections: ADD
{ $addToSet: { elections: electionId } }

// Election.candidates: ADD
{ $addToSet: { candidates: candidateId } }
```

### Remove from Election:
```javascript
// Candidate.elections: REMOVE
{ $pull: { elections: electionId } }

// Election.candidates: REMOVE
{ $pull: { candidates: candidateId } }
```

### Move:
```javascript
// Combination of remove + add
// Both operations in single transaction
```

---

## ✅ Benefits

| Operation | Before (1-to-Many) | After (Many-to-Many) |
|-----------|-------------------|---------------------|
| **Add to multiple elections** | ❌ Must create duplicate candidate | ✅ Link existing candidate |
| **Remove from election** | ❌ Delete candidate entirely | ✅ Unlink only |
| **Move between elections** | ❌ Delete + recreate | ✅ Atomic move |
| **Data integrity** | ⚠️ Risk of duplicates | ✅ Single source of truth |

---

## 🚨 Error Handling

### Common Errors:

**404 - Not Found:**
```json
{
  "message": "Candidate not found"
}
```

**400 - Bad Request:**
```json
{
  "message": "Candidate is already in this election"
}
```

```json
{
  "message": "Candidate is not in this election"
}
```

```json
{
  "message": "Please provide fromElectionId and toElectionId"
}
```

**403 - Unauthorized:**
```json
{
  "message": "You are not authorized to perform this action"
}
```

---

**Last Updated:** 2026-03-27
**Status:** ✅ READY FOR USE
