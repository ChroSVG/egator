# 🐛 Egator Debugging Guide

Panduan debugging untuk aplikasi Egator dengan many-to-many relationship.

---

## 📊 Debugging Layers

```
┌─────────────────────────────────────────┐
│         Layer 1: Request/Response       │
│         (API Gateway/Controller)        │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         Layer 2: Business Logic         │
│         (Service Layer)                 │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         Layer 3: Data Access            │
│         (Repository Layer)              │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         Layer 4: Database               │
│         (MongoDB)                       │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         Layer 5: External Services      │
│         (Cloudinary, Redis, etc.)       │
└─────────────────────────────────────────┘
```

---

## 🔧 Layer 1: Request/Response Debugging

### **Debug HTTP Requests**

**Install tools:**
```bash
npm install --save-dev morgan helmet cors
```

**Enable request logging in `index.js`:**
```javascript
const morgan = require('morgan');

// Log all requests
app.use(morgan('combined'));

// Or custom format
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));
```

**Test endpoints:**
```bash
# With verbose output
curl -v http://localhost:5000/api/elections

# With timing
curl -w "@curl-format.txt" http://localhost:5000/api/elections
```

**curl-format.txt:**
```
time_namelookup:  %{time_namelookup}\n
time_connect:     %{time_connect}\n
time_starttransfer: %{time_starttransfer}\n
time_total:       %{time_total}\n
http_version:     %{http_version}\n
```

---

### **Debug Middleware**

**Add debug middleware:**
```javascript
// middleware/debugMiddleware.js
const debugMiddleware = (req, res, next) => {
    console.log('📥 REQUEST:', {
        method: req.method,
        url: req.url,
        params: req.params,
        query: req.query,
        body: req.body,
        headers: req.headers,
        user: req.user,
        timestamp: new Date().toISOString()
    });
    
    // Track response time
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log('📤 RESPONSE:', {
            statusCode: res.statusCode,
            duration: `${duration}ms`
        });
    });
    
    next();
};

module.exports = debugMiddleware;
```

**Usage:**
```javascript
// In index.js (development only)
if (process.env.NODE_ENV === 'development') {
    app.use(debugMiddleware);
}
```

---

## 🔍 Layer 2: Service Layer Debugging

### **Add Service Logging**

**Example in `candidateService.js`:**
```javascript
const DEBUG = process.env.DEBUG === 'true';

class CandidateService {
    async addCandidateToElection(candidateId, electionId) {
        if (DEBUG) {
            console.log('🔧 SERVICE:', {
                method: 'addCandidateToElection',
                candidateId,
                electionId,
                timestamp: new Date().toISOString()
            });
        }
        
        try {
            const start = Date.now();
            
            const result = await withTransaction(async (session) => {
                // Step 1: Verify candidate
                const candidate = await this.candidateRepository.findById(candidateId, { session });
                if (DEBUG) {
                    console.log('📝 Step 1 - Candidate found:', candidate ? 'YES' : 'NO');
                }
                
                if (!candidate) {
                    throw new HttpError('Candidate not found', 404);
                }
                
                // Step 2: Verify election
                const election = await this.electionRepository.findById(electionId, { session });
                if (DEBUG) {
                    console.log('📝 Step 2 - Election found:', election ? 'YES' : 'NO');
                }
                
                if (!election) {
                    throw new HttpError('Election not found', 404);
                }
                
                // Step 3: Check if already in election
                const alreadyInElection = candidate.elections && candidate.elections.includes(electionId);
                if (DEBUG) {
                    console.log('📝 Step 3 - Already in election:', alreadyInElection);
                    console.log('📝 Candidate elections:', candidate.elections);
                }
                
                if (alreadyInElection) {
                    throw new HttpError('Candidate is already in this election', 400);
                }
                
                // Step 4: Add to elections array
                candidate.elections.push(electionId);
                await candidate.save({ session });
                if (DEBUG) {
                    console.log('📝 Step 4 - Candidate updated:', candidate.elections);
                }
                
                // Step 5: Add candidate to election
                await this.electionRepository.addCandidate(electionId, candidateId, session);
                if (DEBUG) {
                    console.log('📝 Step 5 - Election updated');
                }
                
                return candidate;
            });
            
            const duration = Date.now() - start;
            if (DEBUG) {
                console.log('✅ SERVICE COMPLETED:', {
                    method: 'addCandidateToElection',
                    duration: `${duration}ms`,
                    success: true
                });
            }
            
            return result;
            
        } catch (error) {
            if (DEBUG) {
                console.error('❌ SERVICE ERROR:', {
                    method: 'addCandidateToElection',
                    error: error.message,
                    stack: error.stack
                });
            }
            throw error;
        }
    }
}
```

---

## 🗄️ Layer 3: Repository Layer Debugging

### **Enable MongoDB Query Logging**

**In `index.js` or database connection file:**
```javascript
mongoose.set('debug', {
    shell: true,      // Print in MongoDB shell format
    color: true       // Colorize output
});

// Or custom logger
mongoose.set('debug', async (collectionName, method, query, doc) => {
    console.log('🗄️  MONGODB QUERY:', {
        collection: collectionName,
        method,
        query: JSON.stringify(query),
        doc: doc ? JSON.stringify(doc) : null,
        timestamp: new Date().toISOString()
    });
});
```

**Example output:**
```
🗄️  MONGODB QUERY: {
  "collection": "candidates",
  "method": "findOne",
  "query": {"_id": "65a1234567890abcdef123456"},
  "timestamp": "2026-03-27T14:30:00.000Z"
}
```

---

### **Add Repository Debugging**

**Example in `baseRepository.js`:**
```javascript
const DEBUG_REPO = process.env.DEBUG_REPO === 'true';

class BaseRepository {
    async findById(id, options = {}) {
        if (DEBUG_REPO) {
            console.log('📦 REPOSITORY:', {
                model: this.model.modelName,
                method: 'findById',
                id,
                options
            });
        }
        
        const start = Date.now();
        const result = await this.model.findById(id).session(options?.session);
        const duration = Date.now() - start;
        
        if (DEBUG_REPO) {
            console.log('📦 REPOSITORY RESULT:', {
                model: this.model.modelName,
                method: 'findById',
                found: result ? 'YES' : 'NO',
                duration: `${duration}ms`
            });
        }
        
        return result;
    }
}
```

---

## 🔬 Layer 4: Database Debugging

### **MongoDB Profiler**

**Enable profiling:**
```javascript
// Enable for slow queries (>100ms)
db.setProfilingLevel(1, 100);

// Or enable for all queries
db.setProfilingLevel(2);
```

**Check slow queries:**
```javascript
// Get last 10 slow queries
db.system.profile.find().sort({$natural: -1}).limit(10)

// Get queries slower than 500ms
db.system.profile.find({
    millis: { $gt: 500 }
}).sort({ts: -1})
```

**Analyze query performance:**
```javascript
// Explain query execution
db.candidates.find({ elections: "65a1234567890abcdef123456" })
    .explain("executionStats")

// Check index usage
db.candidates.find({ elections: "65a1234567890abcdef123456" })
    .explain("executionStats")
    .executionStats
```

---

### **Debug Many-to-Many Relationships**

**Check candidate elections:**
```javascript
// Find candidate and show elections
db.candidates.findOne(
    { _id: "candidate_id" },
    { fullName: 1, elections: 1 }
)

// Populate elections manually
const candidate = db.candidates.findOne({ _id: "candidate_id" });
const elections = db.elections.find({ _id: { $in: candidate.elections } });
printjson({ candidate, elections });
```

**Check election candidates:**
```javascript
// Find election and show candidates
db.elections.findOne(
    { _id: "election_id" },
    { title: 1, candidates: 1 }
)

// Populate candidates manually
const election = db.elections.findOne({ _id: "election_id" });
const candidates = db.candidates.find({ _id: { $in: election.candidates } });
printjson({ election, candidates });
```

**Verify relationship integrity:**
```javascript
// Find orphaned candidates (no elections)
db.candidates.find({ elections: { $size: 0 } })

// Find orphaned candidates (elections don't exist)
db.candidates.aggregate([
    { $unwind: "$elections" },
    { $lookup: {
        from: "elections",
        localField: "elections",
        foreignField: "_id",
        as: "election"
    }},
    { $match: { election: { $size: 0 } } }
])

// Find elections with no candidates
db.elections.find({ candidates: { $size: 0 } })
```

---

## 🌐 Layer 5: External Services Debugging

### **Cloudinary Debugging**

**Enable Cloudinary logging:**
```javascript
// In cloudinary.js
const cloudinary = require('cloudinary').v2;

// Enable debug
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    return_error: true  // Return errors in response
});

// Log uploads
const originalUpload = cloudinary.uploader.upload;
cloudinary.uploader.upload = async function(file, options) {
    console.log('☁️  CLOUDINARY UPLOAD:', {
        file,
        options,
        timestamp: new Date().toISOString()
    });
    
    try {
        const result = await originalUpload.call(this, file, options);
        console.log('☁️  CLOUDINARY UPLOAD SUCCESS:', result);
        return result;
    } catch (error) {
        console.error('☁️  CLOUDINARY UPLOAD ERROR:', error);
        throw error;
    }
};
```

---

### **Redis Debugging (if using cache)**

**Check Redis connection:**
```javascript
const redis = require('redis');
const client = redis.createClient();

client.on('error', (err) => {
    console.error('🔴 REDIS ERROR:', err);
});

client.on('connect', () => {
    console.log('🟢 REDIS CONNECTED');
});

// Debug cache operations
const originalGet = client.get;
client.get = async function(key) {
    console.log('🔵 REDIS GET:', key);
    const result = await originalGet.call(this, key);
    console.log('🔵 REDIS GET RESULT:', key, result);
    return result;
};
```

---

## 🛠️ Debugging Tools

### **1. Chrome DevTools for Node.js**

**Start with inspector:**
```bash
node --inspect index.js

# Or with break on start
node --inspect-brk index.js
```

**Open Chrome and navigate to:**
```
chrome://inspect
```

---

### **2. VS Code Debugger**

**Create `.vscode/launch.json`:**
```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "node",
            "request": "launch",
            "name": "Debug Egator Server",
            "skipFiles": ["<node_internals>/**"],
            "program": "${workspaceFolder}/index.js",
            "env": {
                "DEBUG": "true",
                "NODE_ENV": "development"
            },
            "console": "integratedTerminal"
        },
        {
            "type": "node",
            "request": "launch",
            "name": "Debug Test",
            "program": "${workspaceFolder}/node_modules/jest/bin/jest",
            "args": ["--runInBand"],
            "skipFiles": ["<node_internals>/**"],
            "console": "integratedTerminal"
        }
    ]
}
```

**Usage:**
1. Set breakpoints in code
2. Press F5 to start debugging
3. Use Debug Console for variables

---

### **3. Winston Logger (Production Logging)**

**Install:**
```bash
npm install winston
```

**Create `utils/logger.js`:**
```javascript
const winston = require('winston');

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
    ),
    defaultMeta: { service: 'egator-api' },
    transports: [
        new winston.transports.File({ 
            filename: 'logs/error.log', 
            level: 'error' 
        }),
        new winston.transports.File({ 
            filename: 'logs/combined.log' 
        })
    ]
});

// Console output in development
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

module.exports = logger;
```

**Usage:**
```javascript
const logger = require('../utils/logger');

// In service
logger.info('Adding candidate to election', {
    candidateId,
    electionId
});

// On error
logger.error('Failed to add candidate', {
    candidateId,
    electionId,
    error: error.message,
    stack: error.stack
});
```

---

## 🐛 Common Issues & Debugging Steps

### **Issue 1: Candidate Not Showing in Election Results**

**Debug Steps:**
```javascript
// 1. Check candidate exists
const candidate = await db.candidates.findOne({ _id: candidateId });
console.log('Candidate:', candidate);

// 2. Check candidate has elections array
console.log('Candidate elections:', candidate.elections);

// 3. Check election exists
const election = await db.elections.findOne({ _id: electionId });
console.log('Election:', election);

// 4. Check election has candidates array
console.log('Election candidates:', election.candidates);

// 5. Check if candidate ID is in election
console.log('Candidate in election?', 
    election.candidates.includes(candidateId)
);

// 6. Check if election ID is in candidate
console.log('Election in candidate?', 
    candidate.elections.includes(electionId)
);
```

---

### **Issue 2: Vote Not Counting**

**Debug Steps:**
```javascript
// 1. Check candidate before vote
const candidateBefore = await db.candidates.findOne({ _id: candidateId });
console.log('Vote count before:', candidateBefore.voteCount);

// 2. Check voter hasn't voted
const voteRecord = await db.voteRecords.findOne({ 
    voter: voterId, 
    election: electionId 
});
console.log('Already voted?', voteRecord !== null);

// 3. Check vote command validation
const validation = await voteCommand.validate();
console.log('Validation errors:', validation.errors);

// 4. Check transaction
// Enable MongoDB profiler to see if update happened

// 5. Check candidate after vote
const candidateAfter = await db.candidates.findOne({ _id: candidateId });
console.log('Vote count after:', candidateAfter.voteCount);
```

---

### **Issue 3: Cannot Add Candidate to Multiple Elections**

**Debug Steps:**
```javascript
// 1. Check current elections
const candidate = await db.candidates.findOne({ _id: candidateId });
console.log('Current elections:', candidate.elections);

// 2. Check if already in target election
const alreadyInElection = candidate.elections.includes(targetElectionId);
console.log('Already in target?', alreadyInElection);

// 3. Check target election exists
const election = await db.elections.findOne({ _id: targetElectionId });
console.log('Election exists?', election !== null);

// 4. Try manual update
const result = await db.candidates.updateOne(
    { _id: candidateId },
    { $addToSet: { elections: targetElectionId } }
);
console.log('Update result:', result);

// 5. Verify
const updated = await db.candidates.findOne({ _id: candidateId });
console.log('Updated elections:', updated.elections);
```

---

## 📊 Debugging Checklist

```
Issue: _________________________________
Date: _________________________________

□ Layer 1: Request/Response
  - Request received: Y / N
  - Correct endpoint: Y / N
  - Valid parameters: Y / N
  - Authentication OK: Y / N
  - Response sent: Y / N

□ Layer 2: Service
  - Service method called: Y / N
  - Business logic executed: Y / N
  - Validation passed: Y / N
  - Transaction started: Y / N

□ Layer 3: Repository
  - Query constructed: Y / N
  - Database called: Y / N
  - Results returned: Y / N
  - Data transformed: Y / N

□ Layer 4: Database
  - Connection OK: Y / N
  - Query executed: Y / N
  - Indexes used: Y / N
  - Documents affected: _____

□ Layer 5: External
  - Cloudinary upload: Y / N / NA
  - Cache hit/miss: Y / N / NA
  - External API called: Y / N / NA

Root Cause: _____________________________
Fix Applied: ____________________________
Verified: Y / N
```

---

## 🔍 Environment Variables for Debugging

**Add to `.env`:**
```bash
# Enable debug mode
DEBUG=true

# Debug specific layers
DEBUG_REPO=true
DEBUG_SERVICE=true
DEBUG_CONTROLLER=true

# Logging
LOG_LEVEL=debug  # debug, info, warn, error
NODE_ENV=development

# MongoDB
MONGODB_DEBUG=true

# Request logging
REQUEST_LOGGING=true
```

---

**Last Updated:** 2026-03-27
**Version:** 1.0.0
