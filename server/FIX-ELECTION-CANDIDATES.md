# Fix: Election Candidates Not Showing

## 🐛 Problem

Client menampilkan "No candidates found" padahal di database, array `election.candidates` sudah berisi ID candidate.

## 🔍 Root Cause

Ada **ketidakcocokan field name** antara:
- **Candidate Model**: menggunakan `elections` (plural, array)
- **Code lama**: masih menggunakan `election` (singular)

### File yang Bermasalah:

1. **candidateModel.js** - Index masih menggunakan `election`
2. **candidateService.js** - Query dan populate menggunakan `election`
3. **candidateRepository.js** - Semua query menggunakan `election`
4. **voteCommand.js** - Validasi menggunakan `candidate.election`

## ✅ Solution

### 1. Fixed Candidate Model (`models/candidateModel.js`)
```javascript
// BEFORE
candidateSchema.index({ election: 1, voteCount: -1 });
candidateSchema.index({ election: 1, createdAt: -1 });

// AFTER
candidateSchema.index({ elections: 1, voteCount: -1 });
candidateSchema.index({ elections: 1, createdAt: -1 });
```

### 2. Fixed Candidate Service (`services/candidateService.js`)
```javascript
// BEFORE
if (election) query.election = election;
populate: { path: 'election', select: 'title' }
await this.electionRepository.removeCandidate(candidate.election, id, session);

// AFTER
if (election) query.elections = election;
populate: { path: 'elections', select: 'title' }
for (const electionId of candidate.elections) {
    await this.electionRepository.removeCandidate(electionId, id, session);
}
```

### 3. Fixed Candidate Repository (`repositories/candidateRepository.js`)
```javascript
// BEFORE
findAll({ election: electionId })
populate: { path: 'election', select: 'title' }

// AFTER
findAll({ elections: electionId })
populate: { path: 'elections', select: 'title' }
```

### 4. Fixed Vote Command (`commands/voteCommand.js`)
```javascript
// BEFORE
if (candidate.election.toString() !== this.electionId)

// AFTER
if (!candidate.elections.includes(this.electionId))
```

## 🔧 Migration

Jalankan migration script untuk update data lama:

```bash
node migrations/fix-candidate-election-field.js
```

Migration akan:
1. Cek semua candidates
2. Pastikan setiap candidate punya `elections` array
3. Link candidate ke election yang sesuai
4. Fix referensi di Election.candidates

## 📋 Testing

### Test 1: Get Election Results
```bash
curl http://localhost:5000/api/elections/:electionId/results
```

Expected response:
```json
{
  "message": "Election results retrieved successfully!",
  "data": {
    "election": { ... },
    "totalVotes": 10,
    "results": [
      {
        "candidateId": "...",
        "name": "Candidate 1",
        "votes": 6,
        "percentage": "60.00%"
      }
    ]
  }
}
```

### Test 2: Get Candidates by Election
```bash
curl http://localhost:5000/api/candidates?election=:electionId
```

Expected: Array of candidates dengan election ter-populate

### Test 3: Vote for Candidate
```bash
curl -X PATCH http://localhost:5000/api/candidates/:candidateId/vote \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"selectedElectionId": "<electionId>"}'
```

Expected: Vote berhasil tanpa error "Candidate does not belong to specified election"

## ✅ Verification Checklist

- [x] Candidate model indexes fixed
- [x] Candidate service queries fixed
- [x] Candidate repository queries fixed
- [x] Vote command validation fixed
- [x] Migration script created
- [x] Migration tested successfully
- [ ] Run full test suite
- [ ] Test in production

## 📊 Impact

### Before:
- ❌ Election results: "No candidates found"
- ❌ Candidates not linked to elections
- ❌ Vote validation fails

### After:
- ✅ Election results show all candidates
- ✅ Candidates properly linked to elections
- ✅ Vote validation works correctly
- ✅ Support multiple elections per candidate

## 🔄 Related Files

| File | Changes |
|------|---------|
| `models/candidateModel.js` | Fixed indexes |
| `services/candidateService.js` | Fixed queries & delete logic |
| `repositories/candidateRepository.js` | Fixed all queries |
| `commands/voteCommand.js` | Fixed validation |
| `migrations/fix-candidate-election-field.js` | NEW - Migration script |

## 📝 Notes

1. **Backward Compatibility**: Migration script memastikan data lama tetap berfungsi
2. **Multiple Elections**: Sekarang candidate bisa ikut multiple elections
3. **Database Schema**: Tidak perlu change schema, hanya fix field references

---

**Date Fixed:** 2026-03-27
**Status:** ✅ RESOLVED
**Tested:** ✅ Migration successful
