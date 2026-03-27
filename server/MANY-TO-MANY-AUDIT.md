# Many-to-Many Relationship Audit

## ✅ Status: COMPLETE

Semua repository, service, controller, dan komponen lainnya **SUDAH MENYESUAIKAN** dengan model many-to-many antara Election dan Candidate.

---

## 📋 Changes Summary

### 1. **Models** ✅

#### `models/candidateModel.js`
```javascript
// FIXED: Indexes now use 'elections' (plural)
candidateSchema.index({ elections: 1, voteCount: -1 });
candidateSchema.index({ elections: 1, createdAt: -1 });
```

#### `models/electionModel.js`
```javascript
// NO CHANGE NEEDED - already correct
candidates: [{
    type: Types.ObjectId,
    ref: 'Candidate'
}]
```

---

### 2. **Repositories** ✅

#### `repositories/candidateRepository.js`
```javascript
// FIXED: All queries now use 'elections'
async findByElection(electionId, options = {}) {
    return await this.findAll({ elections: electionId }, ...);
}

async findByIdWithElection(id) {
    return await this.findById(id, { 
        populate: { path: 'elections', select: 'title' } 
    });
}

async getTopCandidates(electionId, limit = 10) {
    return await this.findAll({ elections: electionId }, ...);
}

async getVoteStatistics(electionId) {
    const candidates = await this.findAll({ elections: electionId });
    ...
}

async deleteByElection(electionId, options = {}) {
    return await this.deleteMany({ elections: electionId }, options);
}
```

#### `repositories/electionRepository.js`
```javascript
// NO CHANGE NEEDED - already correct
async getResults(electionId) {
    const election = await this.findByIdWithCandidates(electionId);
    // Returns candidates populated from election.candidates array
}
```

#### `repositories/voteRecordRepository.js`
```javascript
// NO CHANGE NEEDED - VoteRecord uses 'election' (singular)
// This is correct because each vote record is for ONE election
filter.election = electionId;  // ✅ Correct
```

---

### 3. **Services** ✅

#### `services/candidateService.js`
```javascript
// FIXED: Query and populate use 'elections'
async getCandidates(filters = {}) {
    let query = {};
    if (election) query.elections = election;  // ✅ Fixed
    
    const options = {
        populate: { path: 'elections', select: 'title' },  // ✅ Fixed
        ...
    };
}

// FIXED: Delete handles multiple elections
async deleteCandidate(id) {
    await withTransaction(async (session) => {
        candidate = await this.candidateRepository.findById(id, { session });
        
        // Remove from ALL elections
        if (candidate.elections && candidate.elections.length > 0) {
            for (const electionId of candidate.elections) {
                await this.electionRepository.removeCandidate(electionId, id, session);
            }
        }
        ...
    });
}
```

#### `services/votingService.js`
```javascript
// FIXED: Validation now checks array
async castVote(voterId, candidateId, electionId, options = {}) {
    ...
    // Check candidate belongs to this election (elections is now an array)
    if (!candidate.elections || !candidate.elections.includes(electionId)) {
        throw new HttpError('Candidate does not belong to the specified election', 400);
    }
    ...
}
```

#### `services/electionService.js`
```javascript
// NO CHANGE NEEDED - uses ElectionRepository which is correct
async getElectionResults(electionId) {
    return await this.electionRepository.getResults(electionId);
}
```

---

### 4. **Commands** ✅

#### `commands/voteCommand.js`
```javascript
// FIXED: Validation checks array
async validate() {
    ...
    // Check candidate belongs to election (elections is now an array)
    if (candidate && !candidate.elections.includes(this.electionId)) {
        errors.push('Candidate does not belong to specified election');
    }
    ...
}
```

---

### 5. **Controllers** ✅

#### `controllers/candidateController.js`
```javascript
// NO CHANGE NEEDED - uses service layer which is already fixed
const getCandidates = async (req, res, next) => {
    const { election, ... } = req.query;
    
    const result = await candidateService.getCandidates({
        election,  // Service handles this correctly
        ...
    });
};
```

#### `controllers/electionController.js`
```javascript
// NO CHANGE NEEDED - uses service layer which is already fixed
const getElectionResults = async (req, res, next) => {
    const { electionId } = req.params;
    
    const results = await electionService.getElectionResults(electionId);
    // Returns candidates from election.candidates array
};
```

---

### 6. **Tests** ✅

#### `tests/unit/services/candidateService.test.js`
```javascript
// FIXED: Mock candidate has elections array
mockCandidate = {
    _id: 'candidate-id',
    fullName: 'John Doe',
    elections: ['election-id'],  // ✅ Array
    ...
};

// FIXED: Test expects array access
expect(candidateService.electionRepository.removeCandidate).toHaveBeenCalledWith(
    mockCandidate.elections[0],  // ✅ First election
    'candidate-id',
    expect.any(Object)
);
```

---

## 🔍 Verification Checklist

| Component | File | Status | Notes |
|-----------|------|--------|-------|
| **Models** | `candidateModel.js` | ✅ | Indexes fixed |
| **Repositories** | `candidateRepository.js` | ✅ | All queries fixed |
| **Repositories** | `electionRepository.js` | ✅ | No change needed |
| **Repositories** | `voteRecordRepository.js` | ✅ | No change needed |
| **Services** | `candidateService.js` | ✅ | Queries & delete fixed |
| **Services** | `votingService.js` | ✅ | Validation fixed |
| **Services** | `electionService.js` | ✅ | No change needed |
| **Commands** | `voteCommand.js` | ✅ | Validation fixed |
| **Controllers** | `candidateController.js` | ✅ | No change needed |
| **Controllers** | `electionController.js` | ✅ | No change needed |
| **Tests** | `candidateService.test.js` | ✅ | Mock data fixed |

---

## 🎯 Relationship Type

### **Many-to-Many** ✅

```
┌──────────────┐         ┌──────────────┐
│  Election 1  │◄───────►│  Candidate A │
└──────────────┘         └──────────────┘
       ▲                         ▲
       │                         │
       └─────────────────────────┘
       
// Election can have many Candidates
election.candidates = [candidateA, candidateB, ...]

// Candidate can participate in many Elections
candidate.elections = [election1, election2, ...]
```

---

## 📝 Migration

Migration script sudah dijalankan:
```bash
node migrations/fix-candidate-election-field.js
```

**Result:**
- ✅ All candidates checked
- ✅ Elections array populated where needed
- ✅ References verified

---

## 🧪 Testing

### Test Query by Election:
```javascript
// Should return candidates for specific election
const candidates = await candidateService.getCandidates({ 
    election: 'election-id' 
});
// ✅ Uses query: { elections: 'election-id' }
```

### Test Vote Validation:
```javascript
// Should validate candidate belongs to election
await voteCommand.validate();
// ✅ Checks: candidate.elections.includes(electionId)
```

### Test Delete Candidate:
```javascript
// Should unlink from all elections
await candidateService.deleteCandidate('candidate-id');
// ✅ Loops through candidate.elections array
```

---

## ✅ Conclusion

**ALL COMPONENTS ARE ALIGNED** with the many-to-many relationship!

- ✅ Models: Correct schema
- ✅ Repositories: Correct queries
- ✅ Services: Correct business logic
- ✅ Commands: Correct validation
- ✅ Controllers: Correct delegation
- ✅ Tests: Correct mock data

**No further changes needed.** 🎉

---

**Last Updated:** 2026-03-27
**Status:** ✅ COMPLETE
**Reviewed By:** AI Assistant
